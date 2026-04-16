const HUB_URL = import.meta.env.VITE_HUB_URL ?? '/'

function hasSessionToken() {
  const token = localStorage.getItem('token')
  return Boolean(token && token.trim().length > 0)
}

function redirectToHub() {
  window.location.replace(HUB_URL)
}

export default function AuthGuard({ children }) {
  if (!hasSessionToken()) {
    redirectToHub()
    return null
  }

  return children
}
