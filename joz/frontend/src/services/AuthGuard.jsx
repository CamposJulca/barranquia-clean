import { useState, useEffect } from "react";
import api from "../services/api";

const AuthGuard = ({ children }) => {
  const [status, setStatus] = useState("loading"); // loading, authenticated, error

  useEffect(() => {
    const validate = async () => {
      try {
        await api.get("/verify-token/"); // Verifica token en hub
        setStatus("authenticated");
      } catch (e) {
        localStorage.clear();
        setStatus("error");
      }
    };
    validate();
  }, []);

  if (status === "loading") return <div>Verificando seguridad...</div>;
  if (status === "error" || !localStorage.getItem("token")) {
    window.location.href = "http://localhost:5175"; // Redirige al hub
    return null;
  }

  return children;
};

export default AuthGuard;