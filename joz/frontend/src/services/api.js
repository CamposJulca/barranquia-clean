import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,
})

export const getStats = () => api.get('/stats/')
export const getAnomaliasPorDia = () => api.get('/anomalias-por-dia/')
export const getAlertas = (params) => api.get('/alertas/', { params })
export const updateAlerta = (id, estado) => api.patch(`/alertas/${id}/`, { estado })
export const getRiesgos = () => api.get('/riesgos/')
export const getHistorial = (params) => api.get('/historial/', { params })