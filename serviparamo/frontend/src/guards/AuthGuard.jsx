import { useEffect } from 'react'
import useSessionStore from '../store/useSessionStore'

const HUB_URL = import.meta.env.VITE_HUB_URL ?? '/'

const getTokenFromStorage = () => {
  const token = localStorage.getItem('serviparamo_token') || localStorage.getItem('token')
  if (!token) return null
  const trimmed = token.trim()
  return trimmed.length > 0 ? trimmed : null
}

export default function AuthGuard({ children }) {
  const tokenInStore = useSessionStore((s) => s.token)
  const setToken = useSessionStore((s) => s.setToken)
  const token = tokenInStore || getTokenFromStorage()

  useEffect(() => {
    if (!tokenInStore && token) {
      setToken(token)
    }
  }, [setToken, tokenInStore, token])

  if (!token) {
    window.location.replace('/serviparamo/login')
    return null
  }

  return children
}
