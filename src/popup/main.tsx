import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { migrateLegacyStorage } from "@/lib/storage";
import { PopupApp } from "./PopupApp";

migrateLegacyStorage();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>
);
