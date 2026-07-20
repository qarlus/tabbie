import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import "./index.css";
// Ensure every module registers before the app reads layout / catalog.
import "@/lib/modules";
import { migrateLegacyStorage } from "@/lib/storage";
import App from "./App.tsx";

migrateLegacyStorage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="captab:theme">
      <App />
    </ThemeProvider>
  </StrictMode>
);
