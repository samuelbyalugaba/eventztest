
  import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/globals.css";
import "./index.css";
import { registerServiceWorker } from "./utils/registerSW";
import { ErrorBoundary } from "./components/ErrorBoundary";

try {
  registerServiceWorker();
} catch (e) {
  console.error("SW Registration Failed:", e);
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
  