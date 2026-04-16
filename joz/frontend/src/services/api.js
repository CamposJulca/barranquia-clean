import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8003/api/joz',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,
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

export const getRiesgoDetalle = async (id) => {
  const res = await api.get(`/riesgos/${id}/`)
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

// Retorna { data: [...], corriendo: bool } sin desempaquetar
export const getEtlStatusFull = async () => {
  const res = await api.get('/etl/status/')
  return res.data  // { ok, data: [...], corriendo }
}

export const runEtl = async (params) => {
  const res = await api.post('/etl/run/', params)
  return unwrap(res)
}
