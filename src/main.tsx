
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

// Prevent ReferenceError if any legacy code checks a global flag
(window as any).showuserprofilemodal = (window as any).showuserprofilemodal ?? false;
(window as any).showUserProfileModal = (window as any).showUserProfileModal ?? (window as any).showuserprofilemodal;

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
