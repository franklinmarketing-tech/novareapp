import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Theme is applied by an inline anti-FOUC script in index.html and managed by
// ThemeProvider at runtime — no setup needed here.

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if ("serviceWorker" in navigator && (isPreviewHost || isInIframe)) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
} else if (!isPreviewHost && !isInIframe) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")!).render(<App />);
