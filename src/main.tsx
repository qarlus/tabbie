import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import "./index.css";
// Ensure every module registers before the app reads layout / catalog.
import "@/lib/modules";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="tabbie:theme">
      <App />
    </ThemeProvider>
  </StrictMode>
);
