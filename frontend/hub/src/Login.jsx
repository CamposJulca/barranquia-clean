import { useState } from 'react'
import axios from 'axios'
import './Login.css'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await axios.post('/api/login/', { username, password })
      localStorage.setItem('token', data.token)
      localStorage.setItem('username', data.username)
      onLogin(data.token, data.username)
    } catch (err) {
      setError(err.response?.data?.error || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">🧠</span>
          <h1>BarranquIA Hub</h1>
          <p>Plataforma Central de Servicios IA</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Ingresa tu usuario"
              autoFocus
              required
            />
          </div>

          <div className="login-field">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Entrando...' : 'Ingresar'}
          </button>
        </form>

        <p className="login-footer">Barranquilla, Colombia · {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
