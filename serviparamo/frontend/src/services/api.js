import axios from 'axios'
import useSessionStore from '../store/useSessionStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 10000,
})

api.interceptors.request.use(
  (config) => {
    const token = useSessionStore.getState().token

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
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