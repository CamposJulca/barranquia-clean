import { createBrowserRouter } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";

import Dashboard from "../pages/Dashboard";
import CatalogManager from "../pages/CatalogManager";
import DuplicateDetection from "../pages/DuplicateDetection";
import Normalization from "../pages/Normalization";
import PurchasesAnalytics from "../pages/PurchasesAnalytics";
import SemanticSearch from "../pages/SemanticSearch";
import Settings from "../pages/Settings";
import QueryConsole from "../pages/QueryConsole";
import AuthGuard from "../guards/AuthGuard";
import Login from "../pages/Login";

export const router = createBrowserRouter(
  [
    { path: "/login", element: <Login /> },
    {
      path: "/",
      element: (
        <AuthGuard>
          <DashboardLayout />
        </AuthGuard>
      ),
      children: [
        { index: true, element: <Dashboard /> },
        { path: "catalog", element: <CatalogManager /> },
        { path: "duplicates", element: <DuplicateDetection /> },
        { path: "normalization", element: <Normalization /> },
        { path: "analytics", element: <PurchasesAnalytics /> },
        { path: "search", element: <SemanticSearch /> },
        { path: "settings", element: <Settings /> },
        { path: "query", element: <QueryConsole /> },
      ],
    },
  ],
  { basename: import.meta.env.VITE_BASENAME ?? "/serviparamo" }
);
