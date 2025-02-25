import { useQueryStore } from "@/hooks/stores/use-query-store";
import { ReactNode, useEffect } from "react";

export default function AppLifecycleHandler({
  children,
}: {
  children: ReactNode;
}) {
  const signalSaveQueryEditors = useQueryStore(
    (state) => state.signalSaveQueryEditors,
  );

  useEffect(() => {
    const beforeunloadHandler = () => {
      signalSaveQueryEditors();
    };

    window.addEventListener("beforeunload", beforeunloadHandler);

    const visibilityChangeHandler = () => {
      if (document.visibilityState === "visible") {
        console.log("App is visible");
      } else {
        console.log("App is hidden");

        signalSaveQueryEditors();
      }
    };

    document.addEventListener("visibilitychange", visibilityChangeHandler);

    return () => {
      window.removeEventListener("beforeunload", beforeunloadHandler);
      document.removeEventListener("visibilitychange", visibilityChangeHandler);
    };
  }, [signalSaveQueryEditors]);

  return <>{children}</>;
}
