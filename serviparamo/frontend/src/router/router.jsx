import { createBrowserRouter } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";

import Dashboard from "../pages/Dashboard";
import CatalogManager from "../pages/CatalogManager";
import DuplicateDetection from "../pages/DuplicateDetection";
import Normalization from "../pages/Normalization";
import PurchasesAnalytics from "../pages/PurchasesAnalytics";
import SemanticSearch from "../pages/SemanticSearch";
import Settings from "../pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "catalog", element: <CatalogManager /> },
      { path: "duplicates", element: <DuplicateDetection /> },
      { path: "normalization", element: <Normalization /> },
      //{ path: "purchases", element: <Purchases /> },
      { path: "analytics", element: <PurchasesAnalytics /> },
      { path: "search", element: <SemanticSearch /> },
      { path: "settings", element: <Settings /> }
    ]
  }
]);