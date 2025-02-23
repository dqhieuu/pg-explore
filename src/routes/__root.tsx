import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Analytics />
    </>
  ),
});
