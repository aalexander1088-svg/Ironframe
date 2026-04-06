import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import WorkoutTracker from "./App";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WorkoutTracker />
  </StrictMode>
);
