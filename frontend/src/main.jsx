// React entry point.

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import App from "./App.jsx";
import { theme } from "./theme.js";

// Mantine's styles first, then ours (so ours can adjust them)
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* MantineProvider gives every Mantine component our theme (colours, font, corners) */}
    <MantineProvider theme={theme}>
      {/* Shows the small pop-up messages, e.g. "Trip created" */}
      <Notifications position="top-right" />
      {/* Lets pages open "Are you sure?" pop-ups */}
      <ModalsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ModalsProvider>
    </MantineProvider>
  </React.StrictMode>
);
