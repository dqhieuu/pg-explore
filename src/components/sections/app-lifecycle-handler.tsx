import { useEffect } from "react";

export default function AppLifecycleHandler({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.onvisibilitychange = () => {
      if (document.visibilityState === "visible") {
        // TODO
        console.log("App is visible");
      } else {
        // TODO
        console.log("App is hidden");
      }
    };
  }, []);

  return <>{children}</>;
}
