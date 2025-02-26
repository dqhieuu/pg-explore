import AppLifecycleHandler from "@/components/sections/app-lifecycle-handler";
import { Toaster } from "@/components/ui/sonner";
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
});
