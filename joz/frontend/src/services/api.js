import axios from 'axios'

/*const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,
})*/
const api = axios.create({
  baseURL: "http://localhost:8003/api/joz",
})

// 🔥 helper para normalizar respuestas del backend
const unwrap = (res) => res.data?.data ?? res.data

export const getStats = async () => {
  const res = await api.get('/stats/')
  return unwrap(res)
}

export const getAnomaliasPorDia = async () => {
  const res = await api.get('/anomalias-por-dia/')
  return unwrap(res)
}

export const getAlertas = async (params) => {
  const res = await api.get('/alertas/', { params })
  return unwrap(res)
}

export const updateAlerta = async (id, estado) => {
  const res = await api.patch(`/alertas/${id}/`, { estado })
  return unwrap(res)
}


export const getRiesgos = async () => {
  const res = await api.get('/riesgos/')
  return unwrap(res)
}

export const getHistorial = async (params) => {
  const res = await api.get('/historial/', { params })
  return unwrap(res)
}

export const getEtlStatus = async () => {
  const res = await api.get('/etl/status/')
  return unwrap(res)
}

export const runEtl = async (params) => {
  const res = await api.post('/etl/run/', params)
  return unwrap(res)
}