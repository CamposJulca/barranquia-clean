import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Login from './Login'
import ServiParamo from './ServiParamo'
import './App.css'

const SERVICES = [
  {
    id: 'avantika',
    name: 'Avantika',
    description: 'Plataforma de gestión',
    icon: '🤖',
    color: '#6c63ff',
    externalUrl: 'http://localhost:5173',
  },
  {
    id: 'joz',
    name: 'Joz',
    description: 'Sistema de análisis',
    icon: '📊',
    color: '#00d4ff',
    externalUrl: 'http://localhost:5174',
  },
  {
    id: 'powerbi',
    name: 'Power BI',
    description: 'Reportes y dashboards',
    icon: '📈',
    color: '#ff6b6b',
    externalUrl: 'https://app.powerbi.com',
  },
  {
    id: 'serviparamo',
    name: 'ServiPáramo',
    description: 'Normalización de catálogo SKUs',
    icon: '🌿',
    color: '#51cf66',
    path: '/serviparamo',
  },
]

function ServiceCard({ service }) {
  const navigate = useNavigate()

  const handleNavigation = () => {
    if (service.path) {
      navigate(service.path)
    } else if (service.externalUrl) {
      window.location.href = service.externalUrl
    }
  }

  return (
    <div
      className="service-card"
      style={{ '--accent': service.color, cursor: 'pointer' }}
      onClick={handleNavigation}
    >
      <div className="service-icon">{service.icon}</div>
      <h3>{service.name}</h3>
      <p>{service.description}</p>
      <div className="service-status">
        <span className="status-dot"></span>
        Activo
      </div>
    </div>
  )
}

function Hub({ token, username, onLogout }) {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    axios.get('/api/health/')
      .then(r => setHealth(r.data))
      .catch(() => setHealth({ status: 'error' }))
  }, [])

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🧠</span>
            <div>
              <h1>BarranquIA Hub</h1>
              <p>Plataforma Central de Servicios IA</p>
            </div>
          </div>
          <div className="header-right">
            <div className={`health-badge ${health?.status === 'ok' ? 'ok' : 'checking'}`}>
              {health?.status === 'ok' ? '● En línea' : '○ Conectando...'}
            </div>
            <div className="user-menu">
              <span className="username">{username}</span>
              <button className="logout-btn" onClick={onLogout}>Salir</button>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <h2>Servicios Disponibles</h2>
          <p>Accede a todas las plataformas de inteligencia artificial desde un solo lugar</p>
        </section>
        <div className="services-grid">
          {SERVICES.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </main>

      <footer className="footer">
        <p>BarranquIA Hub · Barranquilla, Colombia · {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '')

  function handleLogin(newToken, newUsername) {
    localStorage.setItem('token', newToken)
    localStorage.setItem('username', newUsername)
    setToken(newToken)
    setUsername(newUsername)
  }

  async function handleLogout() {
    try {
      await axios.post('/api/logout/', {}, {
        headers: { Authorization: `Token ${token}` },
      })
    } catch (_) {}
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setToken(null)
    setUsername('')
  }

  if (!token) return <Login onLogin={handleLogin} />

  return (
    <Routes>
      <Route path="/serviparamo/*" element={<ServiParamo token={token} username={username} />} />
      <Route path="*" element={<Hub token={token} username={username} onLogout={handleLogout} />} />
    </Routes>
  )
}

export default App
