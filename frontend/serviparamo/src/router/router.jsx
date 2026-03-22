import { createBrowserRouter } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";

import Dashboard from "../pages/Dashboard";
import CatalogManager from "../pages/CatalogManager";
import DuplicateDetection from "../pages/DuplicateDetection";
import Normalization from "../pages/Normalization";
import PurchasesAnalytics from "../pages/PurchasesAnalytics";
import SemanticSearch from "../pages/SemanticSearch";
import Settings from "../pages/Settings";

// basename="/serviparamo" permite que la SPA viva bajo /serviparamo/
// cuando se sirve detrás del nginx reverse-proxy en Docker.
// En desarrollo (npm run dev) Vite sirve desde / y también funciona.
export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <DashboardLayout />,
      children: [
        { index: true, element: <Dashboard /> },
        { path: "catalog", element: <CatalogManager /> },
        { path: "duplicates", element: <DuplicateDetection /> },
        { path: "normalization", element: <Normalization /> },
        { path: "analytics", element: <PurchasesAnalytics /> },
        { path: "search", element: <SemanticSearch /> },
        { path: "settings", element: <Settings /> },
      ],
    },
  ],
  { basename: import.meta.env.VITE_BASENAME ?? "/serviparamo" }
);