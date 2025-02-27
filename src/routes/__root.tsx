import AppLifecycleHandler from "@/components/sections/app-lifecycle-handler";
import { Toaster } from "@/components/ui/sonner";
import { useQueryStore } from "@/hooks/stores/use-query-store";
import { fixRadixUiUnclosedDialog } from "@/lib/utils";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";

export const Route = createRootRoute({
  component: () => (
    <AppLifecycleHandler>
      <Outlet />
      <Toaster />
      <Analytics />
    </AppLifecycleHandler>
  ),
  beforeLoad: () => {
    useQueryStore.getState().signalSaveQueryEditors();
    fixRadixUiUnclosedDialog();
  },
});
