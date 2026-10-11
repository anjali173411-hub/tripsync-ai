// React entry point.

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import App from "./App.jsx";
import { theme } from "./theme.js";

// Mantine's styles first, then ours
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* MantineProvider gives the Mantine parts our colour and font */}
    <MantineProvider theme={theme}>
      {/* Shows the small messages in the corner, e.g. "Trip created" */}
      <Notifications position="top-right" />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);
