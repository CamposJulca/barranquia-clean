import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import axios from 'axios'
import './App.css'

const SERVICES = [
  {
    id: 'avantika',
    name: 'Avantika',
    description: 'Plataforma de gestión',
    icon: '🤖',
    color: '#6c63ff',
    externalUrl: '/avantika/',
  },
  {
    id: 'joz',
    name: 'Joz',
    description: 'Sistema de análisis',
    icon: '📊',
    color: '#00d4ff',
    externalUrl: '/joz/',
  },
  {
    id: 'serviparamo',
    name: 'ServiPáramo',
    description: 'Normalización de catálogo SKUs',
    icon: '🌿',
    color: '#51cf66',
    externalUrl: '/serviparamo/',
  },
]

function ServiceCard({ service }) {
  const handleNavigation = () => {
    if (service.externalUrl) {
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

function Hub() {
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
  return (
    <Routes>
      <Route path="*" element={<Hub />} />
    </Routes>
  )
}

export default App
