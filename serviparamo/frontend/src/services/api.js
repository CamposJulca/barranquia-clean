import axios from 'axios'
import useSessionStore from '../store/useSessionStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 10000,
})

const getToken = () => {
  const storeToken = useSessionStore.getState().token
  if (storeToken && storeToken.trim().length > 0) return storeToken.trim()

  const localToken = localStorage.getItem('serviparamo_token')
  if (!localToken) return null
  const trimmed = localToken.trim()
  return trimmed.length > 0 ? trimmed : null
}

const logoutAndRedirect = () => {
  useSessionStore.getState().setToken(null)
  localStorage.removeItem('serviparamo_token')
  localStorage.removeItem('serviparamo_username')
  window.location.replace('/serviparamo/login')
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
      return Promise.reject(error)
    }

    if (error.response) {
      console.error('API Error:', error.response.data)
    } else if (error.request) {
      console.error('No response from server')
    } else {
      console.error('Request error:', error.message)
    }

    return Promise.reject(error)
  }
)

export default api
