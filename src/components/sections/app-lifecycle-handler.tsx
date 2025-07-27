import { useAnimationStore } from "@/hooks/stores/use-animation-store.ts";
import { useQueryStore } from "@/hooks/stores/use-query-store";
import { appDb } from "@/lib/dexie/app-db";
import { MEM_DB_PREFIX, sessionId } from "@/lib/utils";
import { ReactNode, useEffect } from "react";

async function deleteStaleSessionData() {
  await appDb.sessions.where("expirationDate").below(new Date()).delete();

  const activeSessions = await appDb.sessions.toArray();
  const activeMemDatabasesIds = new Set(
    activeSessions.map((session) => `${MEM_DB_PREFIX}${session.id}`),
  );

  const deleteFiles = appDb.files
    .where("databaseId")
    .startsWith(MEM_DB_PREFIX)
    .and((file) => !activeMemDatabasesIds.has(file.databaseId))
    .delete();

  const deleteWorkflows = appDb.workflows
    .where("databaseId")
    .startsWith(MEM_DB_PREFIX)
    .and((workflow) => !activeMemDatabasesIds.has(workflow.databaseId))
    .delete();

  const deleteDatabases = appDb.databases
    .where("id")
    .startsWith(MEM_DB_PREFIX)
    .and((db) => !activeMemDatabasesIds.has(db.id))
    .delete();

  await Promise.all([deleteFiles, deleteWorkflows, deleteDatabases]);
}

async function createAppSession() {
  if ((await appDb.sessions.where("id").equals(sessionId).count()) > 0) return;

  const SPAN_30_DAYS = 1000 * 60 * 60 * 24 * 30;

  await appDb.sessions.add({
    id: sessionId,
    expirationDate: new Date(Date.now() + SPAN_30_DAYS),
  });
}

async function expireAppSession() {
  return appDb.sessions.delete(sessionId);
}

export default function AppLifecycleHandler({
  children,
}: {
  children: ReactNode;
}) {
  const signalSaveQueryEditors = useQueryStore(
    (state) => state.signalSaveQueryEditors,
  );

  const setDropImportFileDialogOpen = useAnimationStore(
    (state) => state.setDropImportFileDialogOpen,
  );
  const dropImportFileDialogOpen = useAnimationStore(
    (state) => state.dropImportFileDialogOpen,
  );

  useEffect(() => {
    console.log("Initializing app");

    (async () => {
      await deleteStaleSessionData();
      await createAppSession();
    })();

    const beforeunloadHandler = async () => {
      signalSaveQueryEditors();
      await expireAppSession();
    };

    const visibilityChangeHandler = () => {
      if (document.visibilityState === "hidden") {
        signalSaveQueryEditors();
      }
    };

    const fileStartDragHandler = (event: DragEvent) => {
      if (dropImportFileDialogOpen) return;
      const isFileDrag = event.dataTransfer?.types.includes("Files") ?? false;
      if (!isFileDrag) return;

      setDropImportFileDialogOpen(true);
    };

    const preventDefaultFileDrop = (event: DragEvent) => {
      event.preventDefault();
    };

    document.addEventListener("dragover", preventDefaultFileDrop);
    document.addEventListener("dragenter", fileStartDragHandler);
    window.addEventListener("beforeunload", beforeunloadHandler);
    document.addEventListener("visibilitychange", visibilityChangeHandler);

    return () => {
      document.removeEventListener("beforeunload", beforeunloadHandler);
      document.removeEventListener("dragenter", fileStartDragHandler);
      document.removeEventListener("dragover", preventDefaultFileDrop);
      window.document.removeEventListener(
        "visibilitychange",
        visibilityChangeHandler,
      );
    };
  }, [
    dropImportFileDialogOpen,
    setDropImportFileDialogOpen,
    signalSaveQueryEditors,
  ]);

  return <>{children}</>;
}
