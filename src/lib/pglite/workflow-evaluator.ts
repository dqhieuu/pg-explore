import {
  SQLQueryStep,
  WorkflowState,
  WorkflowStep,
  appDb,
} from "@/lib/dexie/app-db.ts";
import { evaluateSql, wipeDatabase } from "@/lib/pglite/pg-utils.ts";
import { isEmptyOrSpaces } from "@/lib/utils.ts";
import { PGliteInterface } from "@electric-sql/pglite";

interface EvaluationResult {
  result: "success" | "error" | "noop";
  error?: string;
}

export async function applyWorkflow(
  db: PGliteInterface,
  databaseId: string,
  until?: { workflowType: "schema" | "data"; stepsToApply: number },
) {
  const dbInfo = await appDb.databases.get(databaseId);
  if (dbInfo == null) throw new Error(`Database ${databaseId} not found`);

  let workflowState = dbInfo.workflowState;

  const schemaWorkflow = await appDb.workflows
    .where("databaseId")
    .equals(databaseId)
    .and((wf) => wf.type === "schema")
    .first();

  if (schemaWorkflow == null) {
    throw new Error(`Schema workflow for database ${databaseId} not found`);
  }

  const dataWorkflow = await appDb.workflows
    .where("databaseId")
    .equals(databaseId)
    .and((wf) => wf.type === "data")
    .first();

  if (dataWorkflow == null) {
    throw new Error(`Data workflow for database ${databaseId} not found`);
  }

  if (workflowState == null || workflowState.currentProgress === "dirty") {
    await wipeDatabase(db);

    workflowState = {
      schemaWorkflowId: schemaWorkflow.id,
      dataWorkflowId: dataWorkflow.id,
      currentProgress: "schema",
      stepsDone: 0,
    };
  }

  const stepsToApply = [];

  if (until == null) {
    if (workflowState.currentProgress === "schema") {
      stepsToApply.push(
        ...schemaWorkflow.workflowSteps.slice(workflowState.stepsDone),
        ...dataWorkflow.workflowSteps,
      );
    } else if (workflowState.currentProgress === "data") {
      stepsToApply.push(
        ...dataWorkflow.workflowSteps.slice(workflowState.stepsDone),
      );
    }
  } else {
    if (
      (until.workflowType === "schema" &&
        workflowState.currentProgress === "data") ||
      until.stepsToApply < workflowState.stepsDone
    ) {
      // Current progress is already further than the requested progress, must reset
      await wipeDatabase(db);

      workflowState = {
        schemaWorkflowId: schemaWorkflow.id,
        dataWorkflowId: dataWorkflow.id,
        currentProgress: "schema",
        stepsDone: 0,
      };
    }

    if (until.workflowType === "schema") {
      stepsToApply.push(
        ...schemaWorkflow.workflowSteps.slice(
          workflowState.stepsDone,
          until.stepsToApply,
        ),
      );
    } else if (until.workflowType === "data") {
      if (workflowState.currentProgress === "schema") {
        stepsToApply.push(
          ...schemaWorkflow.workflowSteps.slice(workflowState.stepsDone),
          ...dataWorkflow.workflowSteps.slice(0, until.stepsToApply),
        );
      } else {
        stepsToApply.push(
          ...dataWorkflow.workflowSteps.slice(
            workflowState.stepsDone,
            until.stepsToApply,
          ),
        );
      }
    }
  }

  for (const step of stepsToApply) {
    const result = await evaluateWorkflowStep(db, step);
    if (result.result === "error") {
      await appDb.databases.update(databaseId, {
        workflowState: {
          ...workflowState,
          currentProgress: "dirty",
          stepsDone: 0,
        } satisfies WorkflowState,
      });

      throw new Error(
        `Error applying workflow step ${JSON.stringify(step)}: ${result.error}`,
      );
    }
  }

  await appDb.databases.update(databaseId, {
    workflowState: {
      ...workflowState,
      currentProgress: until?.workflowType ?? "data",
      stepsDone: until?.stepsToApply ?? dataWorkflow.workflowSteps.length,
    } satisfies WorkflowState,
  });
}

export async function markWorkflowDirty(
  db: PGliteInterface,
  databaseId: string,
) {
  const dbInfo = await appDb.databases.get(databaseId);
  if (dbInfo == null) {
    throw new Error(`Database ${databaseId} not found`);
  }

  const workflowState = dbInfo.workflowState;
  if (workflowState == null) {
    throw new Error(`Workflow state for database ${databaseId} not found`);
  }

  if (
    workflowState.currentProgress === "schema" &&
    workflowState.stepsDone === 0
  ) {
    return;
  }

  await wipeDatabase(db);

  workflowState.currentProgress = "schema";
  workflowState.stepsDone = 0;
  return appDb.databases.update(databaseId, {
    workflowState,
  });
}

async function evaluateWorkflowStep(
  db: PGliteInterface,
  step: WorkflowStep,
): Promise<EvaluationResult> {
  switch (step.type) {
    case "sql-query":
      return evaluateSqlQueryStep(db, step);
    default:
      return {
        result: "error",
        error: `Unknown step type: ${step.type}`,
      };
  }
}

async function evaluateSqlQueryStep(
  db: PGliteInterface,
  step: SQLQueryStep,
): Promise<EvaluationResult> {
  const { fileId } = step;
  if (fileId == null) {
    return { result: "noop" };
  }

  const file = await appDb.files.get(fileId);

  if (file == null || isEmptyOrSpaces(file.content)) {
    return { result: "noop" };
  }

  const sql = file.content!;

  try {
    await evaluateSql(db, sql);
    return { result: "success" };
  } catch (e) {
    return {
      result: "error",
      error: (e as Error).message,
    };
  }
}
