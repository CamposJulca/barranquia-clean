import axios from 'axios'

const api = axios.create({
  baseURL: "http://127.0.0.1:8001/api/joz", 
  timeout: 10000,
})

export const getStats = () => api.get('/stats/')
export const getAnomaliasPorDia = () => api.get('/anomalias-por-dia/')
export const getAlertas = (params) => api.get('/alertas/', { params })
export const updateAlerta = (id, estado) => api.patch(`/alertas/${id}/`, { estado })
export const getRiesgos = () => api.get('/riesgos/')
export const getHistorial = (params) => api.get('/historial/', { params })