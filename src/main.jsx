import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import DebugHome from "./_debugHome.jsx";
import "./tailwind.css";

const isDebug = window.location.search.includes("debug=home");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isDebug ? <DebugHome /> : <App />}
  </React.StrictMode>
);
