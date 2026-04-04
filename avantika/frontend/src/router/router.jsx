import { createBrowserRouter } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";

import VistaGeneral from "../pages/avantika/VistaGeneral";
import Skus from "../pages/avantika/Skus";
import Forecast from "../pages/avantika/Forecast";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      { path: "avantika", element: <VistaGeneral /> },
      { path: "avantika/skus", element: <Skus /> },
      { path: "avantika/forecast", element: <Forecast /> },
    ],
  },
]);