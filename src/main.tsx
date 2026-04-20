import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Theme is applied by an inline anti-FOUC script in index.html and managed by
// ThemeProvider at runtime — no setup needed here.

createRoot(document.getElementById("root")!).render(<App />);
