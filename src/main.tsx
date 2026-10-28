import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider } from "@heroui/react";
import Editor from "./App";
import { preloadArt } from "./ui";
import "./style.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

preloadArt();

createRoot(root).render(
  <StrictMode>
    <Editor />
    {/* ToastProvider is the toast region itself in HeroUI v3 — mount it as a
        sibling, not a wrapper; toast.success/danger/warning feed its queue. */}
    <ToastProvider />
  </StrictMode>,
);
