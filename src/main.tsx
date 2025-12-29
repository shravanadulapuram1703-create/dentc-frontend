import React from "react";
import ReactDOM from "react-dom/client";

// ✅ Global Tailwind entry (MUST contain @tailwind directives)
import "./styles/globals.css";

import App from "./App";

ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
