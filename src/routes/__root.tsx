import AppLifecycleHandler from "@/components/sections/app-lifecycle-handler";
import { SettingsDialog } from "@/components/sections/settings-dialog.tsx";
import { ThemeProvider } from "@/components/sections/theme-provider.tsx";
import { Toaster } from "@/components/ui/sonner";
import { useQueryStore } from "@/hooks/stores/use-query-store";
import { fixRadixUiUnclosedDialog } from "@/lib/utils";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";

export const Route = createRootRoute({
  component: () => (
    <ThemeProvider>
      <AppLifecycleHandler>
        <SettingsDialog>
          <Outlet />
          <Toaster />
          <Analytics />
        </SettingsDialog>
      </AppLifecycleHandler>
    </ThemeProvider>
  ),
  beforeLoad: () => {
    useQueryStore.getState().signalSaveQueryEditors();
    fixRadixUiUnclosedDialog();
  },
});
