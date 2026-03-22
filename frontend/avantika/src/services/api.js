import axios from "axios";

// Creamos la instancia sin el header de Auth fijo
const api = axios.create({
  baseURL: "http://localhost:9005/avantika", // Usamos el puerto del Nginx Gateway
  headers: {
    "Content-Type": "application/json",
  },
});

// INTERCEPTOR: Inyecta el token dinámicamente en cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // O useSessionStore.getState().token
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Servicios de Avántica ---

// Forecast: Predicción de demanda
export const predecirDemanda = (skuId, fechaInicio, fechaFin) =>
  api.post("/predecir-demanda", { 
    sku_id: skuId, 
    fecha_inicio: fechaInicio, 
    fecha_fin: fechaFin 
  });

// Inventario: Clasificación ABC y estados
export const getClasificacionABC = (categoria, estado) =>
  api.get("/clasificacion-abc", { params: { categoria, estado } });

// Logística: Sugerencias de reposición
export const getSugerenciasReposicion = (skuId, categoria) =>
  api.get("/sugerencias-reposicion", { params: { sku_id: skuId, categoria } });

// Configuración: Parámetros del modelo
export const setParametros = (params) =>
  api.post("/parametros", params);

// Feedback: Mejora continua del modelo
export const logFeedback = (feedback) =>
  api.post("/log-feedback", feedback);

export default api;