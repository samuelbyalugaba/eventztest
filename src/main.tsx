
  import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./utils/registerSW";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { MessagingProvider } from "./contexts/MessagingContext";

try {
  registerServiceWorker();
} catch (e) {
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MessagingProvider>
          <App />
        </MessagingProvider>
      </BrowserRouter>
    </AuthProvider>
  </ErrorBoundary>
);

// App entry
