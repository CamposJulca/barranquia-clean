import { createBrowserRouter } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";

import Dashboard from "../pages/Dashboard";
import Alerts from "../pages/Alerts";
import Risks from "../pages/Risks";
import History from "../pages/History";
import Settings from "../pages/Settings";

// basename="/joz" permite que la SPA viva bajo /joz/ en producción (nginx).
export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <DashboardLayout />,
      children: [
        { index: true, element: <Dashboard /> },
        { path: "alerts", element: <Alerts /> },
        { path: "risks", element: <Risks /> },
        { path: "history", element: <History /> },
        { path: "settings", element: <Settings /> },
      ],
    },
  ],
  { basename: import.meta.env.VITE_BASENAME ?? "/joz" }
);