import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./styles/experience.css";
import "./features/demo/demo-experience.css";
import "./styles/console-experience.css";
import "./styles/investigation-phase.css";
import "./styles/teammate-utilities.css";
import "./styles/teammate-console.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>,
);
