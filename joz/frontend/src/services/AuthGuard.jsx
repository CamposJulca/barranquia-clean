const HUB_URL = import.meta.env.VITE_HUB_URL ?? '/'

function hasSessionToken() {
  const token = localStorage.getItem('joz_token') || localStorage.getItem('token')
  return Boolean(token && token.trim().length > 0)
}

function redirectToLogin() {
  window.location.replace('/joz/login')
}

export default function AuthGuard({ children }) {
  if (!hasSessionToken()) {
    redirectToLogin()
    return null
  }

  return children
}
