import axios from 'axios'

export const TOKEN_KEY = 'serviparamo_token'
export const USERNAME_KEY = 'serviparamo_username'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/serviparamo'

export const loginUser = async (username, password) => {
  const res = await axios.post(`${BASE_URL}/login/`, { username, password })
  return res.data
}

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USERNAME_KEY)
  window.location.replace('/serviparamo/login')
}

export const getToken = () => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return null
  const trimmed = token.trim()
  return trimmed.length > 0 ? trimmed : null
}
