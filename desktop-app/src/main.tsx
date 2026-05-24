import React from "react";
import ReactDOM from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import App from "./App";
import "./index.css";

function hasTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? ` | ${error.stack}` : ""}`;
  }

  return String(error);
}

async function writeAppLog(level: string, source: string, message: string) {
  if (!hasTauriRuntime()) {
    return;
  }

  try {
    await invoke("write_app_log_entry", { level, source, message });
  } catch (error) {
    console.error("Unable to write desktop log", error);
  }
}

window.addEventListener("error", (event) => {
  void writeAppLog(
    "ERROR",
    "frontend",
    `${event.message} @ ${event.filename}:${event.lineno}:${event.colno}`,
  );
});

window.addEventListener("unhandledrejection", (event) => {
  void writeAppLog("ERROR", "frontend", `Unhandled promise rejection: ${serializeError(event.reason)}`);
});

void writeAppLog("INFO", "frontend", "React bootstrap started");

const rootElement = document.getElementById("root");
if (!rootElement) {
  void writeAppLog("ERROR", "frontend", "Root element '#root' introuvable.");
  throw new Error("Root element '#root' introuvable.");
}

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  void writeAppLog("INFO", "frontend", "React root rendered");
} catch (error) {
  void writeAppLog("ERROR", "frontend", `React render failed: ${serializeError(error)}`);
  throw error;
}
