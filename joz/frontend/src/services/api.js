import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/joz',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,
})

const getToken = () => {
  const token = localStorage.getItem('joz_token')
  if (!token) return null
  const trimmed = token.trim()
  return trimmed.length > 0 ? trimmed : null
}

const logoutAndRedirect = () => {
  localStorage.removeItem('joz_token')
  localStorage.removeItem('joz_username')
  window.location.replace('/login')
}

api.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Token ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      logoutAndRedirect()
    }
    return Promise.reject(error)
  }
)

export const loginUser = async (username, password) => {
  const res = await axios.post(`${import.meta.env.VITE_API_URL || '/api/joz'}/login/`, { username, password })
  return res.data
}

// 🔥 helper para normalizar respuestas del backend
const unwrap = (res) => res.data?.data ?? res.data

export const getStats = async (params) => {
  const res = await api.get('/stats/', { params })
  return unwrap(res)
}

export const getAnomaliasPorDia = async (params) => {
  const res = await api.get('/anomalias-por-dia/', { params })
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

export const bulkUpdateAlertas = async (ids, estado) => {
  const res = await api.patch('/alertas/', { ids, estado })
  return unwrap(res)
}

export const bulkDeleteAlertas = async (ids) => {
  const res = await api.delete('/alertas/', { data: { ids } })
  return unwrap(res)
}

export const deleteAllAlertas = async () => {
  const res = await api.delete('/alertas/', { data: { todos: true } })
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

export const getRiesgosConfig = async () => {
  const res = await api.get('/riesgos/config/')
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

export const getEtlSchedule = async () => {
  const res = await api.get('/etl/schedule/')
  return unwrap(res)
}

export const executeSql = async (query, limit = 500) => {
  const res = await api.post('/sql/execute/', { query, limit }, { timeout: 30000 })
  return unwrap(res)
}

export const getSqlSchema = async () => {
  const res = await api.get('/sql/schema/')
  return unwrap(res)
}

export const runDeteccion = async (params = {}) => {
  const res = await api.post('/detectar/', params)
  return unwrap(res)
}

// ── Reglas de detección (CRUD) ─────────────────────────────────────────────

export const getReglas = async () => {
  const res = await api.get('/reglas/')
  return unwrap(res)
}

export const createRegla = async (data) => {
  const res = await api.post('/reglas/', data)
  return unwrap(res)
}

export const updateRegla = async (id, data) => {
  const res = await api.patch(`/reglas/${id}/`, data)
  return unwrap(res)
}

export const deleteRegla = async (id) => {
  const res = await api.delete(`/reglas/${id}/`)
  return unwrap(res)
}

export default api
