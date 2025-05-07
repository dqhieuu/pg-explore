import { RouterProvider, createRouter } from "@tanstack/react-router";
import whyDidYouRender from "@welldone-software/why-did-you-render";
import { StrictMode } from "react";
import * as React from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";

if (import.meta.env.DEV) {
  whyDidYouRender(React, {
    trackAllPureComponents: true,
  });
}

// Create a new router instance
const router = createRouter({ routeTree });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
