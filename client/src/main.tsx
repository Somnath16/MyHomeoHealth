import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import SimpleApp from "./components/SimpleApp";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

// Ensure root element exists
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

// Test with simple app first to isolate React issues
// Change to <App /> once the dispatcher.useState error is resolved
const USE_SIMPLE_APP = true; // Set to true to test with simple component

createRoot(rootElement).render(
  <ErrorBoundary>
    {USE_SIMPLE_APP ? <SimpleApp /> : <App />}
  </ErrorBoundary>
);
