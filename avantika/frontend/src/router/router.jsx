import { useState, useEffect } from 'react';
import { createBrowserRouter, Navigate } from "react-router-dom";
import apiHub from "../services/api"; // El axios que creamos arriba
import DashboardLayout from "../layouts/DashboardLayout";
// ... tus otros imports de páginas

const AuthGuard = ({ children }) => {
  const [status, setStatus] = useState('loading'); // loading, authenticated, error

  useEffect(() => {
    const validate = async () => {
      try {
        // Le preguntamos al Backend del Hub
        await apiHub.get('/api/verify-token/');
        setStatus('authenticated');
      } catch (e) {
        localStorage.clear();
        setStatus('error');
      }
    };
    validate();
  }, []);

  if (status === 'loading') return <div>Verificando seguridad...</div>;
  if (status === 'error') {
    window.location.href = 'http://localhost:5174'; // Redirigir al Hub
    return null;
  }
  return children;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthGuard><DashboardLayout /></AuthGuard>,
    children: [
      { path: "avantika", element: <VistaGeneral /> },
      { path: "avantika/skus", element: <Skus /> },
      { path: "avantika/forecast", element: <Forecast /> },
      // ... resto de rutas
    ]
  }
]);