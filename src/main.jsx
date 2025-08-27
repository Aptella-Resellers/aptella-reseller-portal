import React from "react";
import { createRoot } from "react-dom/client";
import AptellaRoot from "./App.jsx";
import "./index.css";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AptellaRoot />
  </React.StrictMode>
);
