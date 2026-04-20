function hasSessionToken() {
  const token = localStorage.getItem('joz_token')
  return Boolean(token && token.trim().length > 0)
}

export default function AuthGuard({ children }) {
  if (!hasSessionToken()) {
    window.location.replace('/joz/login')
    return null
  }

  return children
}
