import { transformDbmlToSql } from "@/lib/dbml.ts";
import {
  DbmlStep,
  SqlQueryStep,
  StepExecutionResult,
  WorkflowState,
  WorkflowStep,
  appDb,
} from "@/lib/dexie/app-db.ts";
import { getWorkflow } from "@/lib/dexie/dexie-utils.ts";
import { evaluateSql, wipeDatabase } from "@/lib/pglite/pg-utils.ts";
import { devModeEnabled, isEmptyOrSpaces } from "@/lib/utils.ts";
import { PGliteInterface } from "@electric-sql/pglite";

interface EvaluationResult {
  result: "success" | "error" | "noop";
  error?: string;
}

export async function applyWorkflow(
  db: PGliteInterface,
  databaseId: string,
  until?: { workflowType: "schema" | "data"; stepsToApply: number },
  isReplayingBecauseOfError = false,
  _executionResultDict: Record<string, StepExecutionResult> = {},
) {
  if (until != null && until.stepsToApply < 0) {
    throw new Error(`stepsToApply must be >= 0`);
  }

  const dbInfo = await appDb.databases.get(databaseId);
  if (dbInfo == null) throw new Error(`Database ${databaseId} not found`);

  let workflowState = dbInfo.workflowState;

  const schemaWorkflow = await getWorkflow(databaseId, "schema");
  if (schemaWorkflow == null) {
    throw new Error(`Schema workflow for database ${databaseId} not found`);
  }

  const dataWorkflow = await getWorkflow(databaseId, "data");
  if (dataWorkflow == null) {
    throw new Error(`Data workflow for database ${databaseId} not found`);
  }

  if (
    workflowState?.currentProgress === "schema-error" ||
    workflowState?.currentProgress === "data-error"
  ) {
    if (
      !until ||
      (workflowState.currentProgress === "schema-error" &&
        (until.workflowType === "data" ||
          until.stepsToApply >= workflowState.stepsDone)) ||
      (workflowState.currentProgress === "data-error" &&
        until.workflowType === "data" &&
        until.stepsToApply >= workflowState.stepsDone)
    ) {
      if (devModeEnabled()) {
        console.debug(
          `Database in error state + requesting steps beyond error => do nothing`,
        );
      }

      return;
    }

    if (devModeEnabled()) {
      console.debug(
        `Database in error state + requesting steps before error => resetting workflow state`,
      );
    }

    await wipeDatabase(db);

    workflowState = {
      schemaWorkflowId: schemaWorkflow.id,
      dataWorkflowId: dataWorkflow.id,
      currentProgress: "schema",
      stepsDone: 0,
      stepResults: [],
    };
  }

  if (
    isReplayingBecauseOfError ||
    workflowState == null ||
    workflowState.currentProgress === "dirty" ||
    (until &&
      ((until.workflowType === "schema" &&
        workflowState.currentProgress === "data") ||
        until.stepsToApply < workflowState.stepsDone))
  ) {
    if (devModeEnabled()) {
      console.debug(`Dirty database, wiping and resetting workflow state`);
    }

    await wipeDatabase(db);

    workflowState = {
      schemaWorkflowId: schemaWorkflow.id,
      dataWorkflowId: dataWorkflow.id,
      currentProgress: "schema",
      stepsDone: 0,
      stepResults: [],
    };
  }

  while (true) {
    // If we reached the end of the workflow, we can stop
    if (
      workflowState.currentProgress === "data" &&
      workflowState.stepsDone >= dataWorkflow.workflowSteps.length
    )
      break;

    // If we reached the desired state, we can stop
    if (
      until &&
      ((workflowState.currentProgress === until.workflowType &&
        workflowState.stepsDone >= until.stepsToApply) ||
        // Done 0 steps of data = done all steps of schema
        (until.workflowType === "data" &&
          until.stepsToApply === 0 &&
          workflowState.currentProgress === "schema" &&
          workflowState.stepsDone >= schemaWorkflow.workflowSteps.length))
    )
      break;

    const currentStepType =
      workflowState.currentProgress === "data" ||
      workflowState.stepsDone >= schemaWorkflow.workflowSteps.length
        ? "data"
        : "schema";

    const currentStepIdx =
      workflowState.currentProgress === currentStepType
        ? workflowState.stepsDone
        : 0;

    const currentStep =
      currentStepType === "schema"
        ? schemaWorkflow.workflowSteps?.[currentStepIdx]
        : dataWorkflow.workflowSteps?.[currentStepIdx];

    if (currentStep == null) {
      console.error(`Cannot find the next step to apply. Stopping workflow`);
      break;
    }

    if (devModeEnabled()) {
      console.debug(
        `Applying workflow step ${currentStepIdx + 1} (${currentStepType})`,
      );
    }

    const stepResult = await evaluateWorkflowStep(db, currentStep);

    _executionResultDict[`${currentStepType}__${currentStepIdx}`] = {
      type: currentStepType,
      index: currentStepIdx,
      result: stepResult.result,
      error: stepResult.error,
    };

    if (stepResult.result === "error") {
      if (isReplayingBecauseOfError) {
        console.error(`Failed to replay workflow after error`);
        return;
      }

      if (devModeEnabled()) {
        console.debug(
          `Error applying workflow step: ${stepResult.error}. Replaying to a non-error state`,
        );
      }

      if (
        workflowState.currentProgress !== "schema" &&
        workflowState.currentProgress !== "data"
      ) {
        console.error(
          `Current workflow state is not schema or data, stopping workflow`,
        );

        return;
      }

      return applyWorkflow(
        db,
        databaseId,
        {
          workflowType: workflowState.currentProgress,
          stepsToApply: workflowState.stepsDone,
        },
        true,
        _executionResultDict,
      );
    }

    workflowState.currentProgress = currentStepType;
    workflowState.stepsDone = currentStepIdx + 1;
  }

  await appDb.databases.update(databaseId, {
    workflowState: {
      ...workflowState,
      currentProgress: until?.workflowType ?? "data",
      stepsDone: until?.stepsToApply ?? dataWorkflow.workflowSteps.length,
      stepResults: Object.values(_executionResultDict),
    } satisfies WorkflowState,
  });
}

export async function markWorkflowDirty(databaseId: string) {
  const dbInfo = await appDb.databases.get(databaseId);
  if (dbInfo == null) {
    throw new Error(`Database ${databaseId} not found`);
  }

  const workflowState = dbInfo.workflowState;
  if (workflowState == null) {
    throw new Error(`Workflow state for database ${databaseId} not found`);
  }

  return appDb.databases.update(databaseId, {
    workflowState: {
      ...workflowState,
      currentProgress: "dirty",
      stepsDone: 0,
    },
  });
}

async function evaluateWorkflowStep(
  db: PGliteInterface,
  step: WorkflowStep,
): Promise<EvaluationResult> {
  switch (step.type) {
    case "sql-query":
      return evaluateSqlQueryStep(db, step);
    case "dbml":
      return evaluateDbmlStep(db, step);
    default:
      return {
        result: "error",
        error: `Unknown step type: ${(step as WorkflowStep).type}`,
      };
  }
}

async function evaluateSqlQueryStep(
  db: PGliteInterface,
  step: SqlQueryStep,
): Promise<EvaluationResult> {
  const { fileId } = step;
  if (fileId == null) {
    return { result: "noop", error: "Nothing to execute" };
  }

  const file = await appDb.files.get(fileId);

  if (file == null || isEmptyOrSpaces(file.content)) {
    return { result: "noop", error: "Nothing to execute" };
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

async function evaluateDbmlStep(
  db: PGliteInterface,
  step: DbmlStep,
): Promise<EvaluationResult> {
  const { fileId } = step;
  if (fileId == null) return { result: "noop", error: "Nothing to execute" };

  const file = await appDb.files.get(fileId);

  if (file == null || isEmptyOrSpaces(file.content))
    return { result: "noop", error: "Nothing to execute" };

  const dbmlContent = file.content!;
  const transformResult = transformDbmlToSql(dbmlContent);
  if (!transformResult.success) {
    return {
      result: "noop",
      error: `Failed to convert DBML to SQL. Open file to see error details`,
    };
  }

  const sql = transformResult.value!;

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
