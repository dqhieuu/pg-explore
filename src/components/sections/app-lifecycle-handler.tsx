import { useQueryStore } from "@/hooks/stores/use-query-store";
import { ReactNode, useEffect, useState } from "react";

export default function AppLifecycleHandler({
  children,
}: {
  children: ReactNode;
}) {
  const signalSaveQueryEditors = useQueryStore(
    (state) => state.signalSaveQueryEditors,
  );

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;
    setMounted(true);

    window.addEventListener("beforeunload", () => {
      signalSaveQueryEditors();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        console.log("App is visible");
      } else {
        console.log("App is hidden");

        signalSaveQueryEditors();
      }
    });
  }, [mounted, signalSaveQueryEditors]);

  return <>{children}</>;
}
