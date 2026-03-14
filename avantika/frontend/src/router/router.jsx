import { createBrowserRouter } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";

import VistaGeneral from "../pages/avantika/VistaGeneral";
import Skus from "../pages/avantika/Skus";
import Forecast from "../pages/avantika/Forecast";

import Catalogo from "../pages/serviparamo/Catalogo";
import Alertas from "../pages/joz/Alertas";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <DashboardLayout />,
    children: [

    
      { path: "avantika", element: <VistaGeneral /> },
      { path: "avantika/skus", element: <Skus /> },
      { path: "avantika/forecast", element: <Forecast /> },

 
      { path: "serviparamo/catalogo", element: <Catalogo /> },

    
      { path: "joz/alertas", element: <Alertas /> }

    ]
  }
]);