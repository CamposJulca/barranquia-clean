import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom'
import axios from 'axios'
import './ServiParamo.css'

// ── Layout compartido ────────────────────────────────────────────────────────
function Layout({ children }) {
  const navigate = useNavigate()

  return (
    <div className="sp-container">
      <div className="sp-header">
        <button className="sp-back" onClick={() => navigate('/')}>← Hub</button>
        <div className="sp-title">
          <span>🌿</span>
          <div>
            <h1>ServiPáramo</h1>
            <p>Normalización de catálogo de SKUs</p>
          </div>
        </div>
        <nav className="sp-nav">
          {[
            { to: '/serviparamo/dashboard',  label: 'Dashboard'  },
            { to: '/serviparamo/buscar',     label: 'Buscador'   },
            { to: '/serviparamo/duplicados', label: 'Duplicados' },
            { to: '/serviparamo/familias',   label: 'Familias'   },
          ].map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `sp-nav-btn${isActive ? ' active' : ''}`}>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="sp-content">{children}</div>
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    axios.get('/api/serviparamo/stats/')
      .then(r => setStats(r.data))
      .catch(() => setStats({ error: true }))
  }, [])

  return (
    <Layout>
      <h2 className="sp-section-title">Resumen del Catálogo</h2>
      {!stats && <p className="sp-loading">Cargando estadísticas…</p>}
      {stats?.error && <p className="sp-error">Error al cargar estadísticas.</p>}
      {stats && !stats.error && (
        <>
          <div className="sp-kpis">
            <KPI label="Total ítems"         value={stats.total_items?.toLocaleString()} />
            <KPI label="Duplicados"          value={`${stats.pct_duplicados}%`}
                 sub={`${stats.duplicados?.toLocaleString()} registros`} variant="warn" />
            <KPI label="Familias"            value={stats.familias_normalizadas?.toLocaleString()} />
            <KPI label="Sin familia"         value={stats.sin_familia?.toLocaleString()} variant="warn" />
            <KPI label="Aprobados"           value={stats.aprobados?.toLocaleString()} variant="ok" />
            <KPI label="Con embedding"       value={`${stats.pct_embedding}%`}
                 sub={`${stats.con_embedding?.toLocaleString()} / ${stats.total_items?.toLocaleString()}`} />
            <KPI label="Grupos duplicados"   value={stats.grupos_duplicados?.toLocaleString()} variant="warn" />
          </div>

          <div className="sp-progress-section">
            <h3 className="sp-section-subtitle">Progreso de normalización</h3>
            <ProgressBar label="Embeddings generados" pct={stats.pct_embedding} />
            <ProgressBar
              label="Ítems aprobados"
              pct={stats.total_items ? Math.round(stats.aprobados / stats.total_items * 100) : 0}
              color="#51cf66"
            />
          </div>
        </>
      )}
    </Layout>
  )
}

function KPI({ label, value, sub, variant }) {
  return (
    <div className={`sp-kpi ${variant || ''}`}>
      <span className="sp-kpi-value">{value}</span>
      <span className="sp-kpi-label">{label}</span>
      {sub && <span className="sp-kpi-sub">{sub}</span>}
    </div>
  )
}

function ProgressBar({ label, pct, color = '#5bc8f5' }) {
  return (
    <div className="sp-progress">
      <div className="sp-progress-header">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="sp-progress-track">
        <div className="sp-progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Buscador ─────────────────────────────────────────────────────────────────
function Buscador() {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [buscado, setBuscado] = useState(false)

  async function buscar(e) {
    e.preventDefault()
    if (!query.trim()) return
    setBuscando(true)
    setBuscado(true)
    setResultados([])
    try {
      const r = await axios.get(`/api/serviparamo/buscar/?q=${encodeURIComponent(query)}&limit=30`)
      setResultados(r.data)
    } finally {
      setBuscando(false)
    }
  }

  return (
    <Layout>
      <h2 className="sp-section-title">Buscador de SKUs</h2>
      <form onSubmit={buscar} className="sp-search-form">
        <input
          className="sp-search-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ej: válvula esfera, compresor 1HP, filtro aceite…"
          autoFocus
        />
        <button className="sp-search-btn" type="submit" disabled={buscando}>
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {resultados.length > 0 && (
        <table className="sp-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Familia</th>
              <th>Similitud</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map(r => (
              <tr key={r.id}>
                <td><code>{r.codigo}</code></td>
                <td>{r.nombre}</td>
                <td><span className="sp-chip">{r.familia_normalizada}</span></td>
                <td>{r.similitud != null ? `${(r.similitud * 100).toFixed(1)}%` : '—'}</td>
                <td>
                  {r.es_duplicado
                    ? <span className="sp-badge warn">Duplicado</span>
                    : <span className="sp-badge ok">Único</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!buscando && buscado && resultados.length === 0 && (
        <p className="sp-empty">Sin resultados para "{query}"</p>
      )}
    </Layout>
  )
}

// ── Duplicados ───────────────────────────────────────────────────────────────
function Duplicados() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [aprobando, setAprobando] = useState({})
  const [familiaEditando, setFamiliaEditando] = useState({})

  async function cargar(p = 1) {
    setData(null)
    const r = await axios.get(`/api/serviparamo/duplicados/?page=${p}&page_size=10`)
    setData(r.data)
    setPage(p)
  }

  useEffect(() => { cargar(1) }, [])

  async function aprobarGrupo(grupoId, familiaOverride) {
    setAprobando(prev => ({ ...prev, [grupoId]: true }))
    try {
      const body = { grupo_id: grupoId }
      if (familiaOverride) body.familia_normalizada = familiaOverride
      await axios.post('/api/serviparamo/aprobar/', body)
      // refrescar grupo
      setData(prev => ({
        ...prev,
        grupos: prev.grupos.map(g =>
          g.grupo_duplicado === grupoId
            ? { ...g, aprobados: g.total, items: g.items.map(i => ({ ...i, aprobado: true })) }
            : g
        ),
      }))
    } finally {
      setAprobando(prev => ({ ...prev, [grupoId]: false }))
    }
  }

  const totalPags = data ? Math.ceil(data.total_grupos / 10) : 1

  return (
    <Layout>
      <h2 className="sp-section-title">Grupos de Duplicados</h2>
      {!data && <p className="sp-loading">Cargando…</p>}
      {data && (
        <>
          <p className="sp-meta">
            {data.total_grupos?.toLocaleString()} grupos · página {page} de {totalPags}
          </p>

          {data.grupos.map(g => {
            const todoAprobado = g.aprobados === g.total
            const familiaEdit = familiaEditando[g.grupo_duplicado] ?? g.familia_sugerida

            return (
              <div key={g.grupo_duplicado} className={`sp-grupo ${todoAprobado ? 'aprobado' : ''}`}>
                <div className="sp-grupo-header">
                  <input
                    className="sp-familia-input"
                    value={familiaEdit}
                    onChange={e => setFamiliaEditando(prev => ({
                      ...prev, [g.grupo_duplicado]: e.target.value,
                    }))}
                    title="Familia normalizada (editable)"
                  />
                  <span className="sp-badge warn">{g.total} ítems</span>
                  {g.aprobados > 0 && (
                    <span className="sp-badge ok">{g.aprobados} aprobados</span>
                  )}
                  <button
                    className={`sp-aprobar-btn ${todoAprobado ? 'done' : ''}`}
                    onClick={() => aprobarGrupo(g.grupo_duplicado, familiaEdit !== g.familia_sugerida ? familiaEdit : undefined)}
                    disabled={todoAprobado || aprobando[g.grupo_duplicado]}
                  >
                    {todoAprobado ? '✓ Aprobado' : aprobando[g.grupo_duplicado] ? '…' : '✓ Aprobar grupo'}
                  </button>
                </div>

                <table className="sp-table sp-table-sm">
                  <thead>
                    <tr><th>Código</th><th>Nombre</th><th>Unidad</th><th></th></tr>
                  </thead>
                  <tbody>
                    {g.items.map(item => (
                      <tr key={item.id} className={item.aprobado ? 'row-aprobado' : ''}>
                        <td><code>{item.codigo}</code></td>
                        <td>{item.nombre}</td>
                        <td>{item.unidad}</td>
                        <td>
                          {item.aprobado
                            ? <span className="sp-badge ok">✓</span>
                            : (
                              <button
                                className="sp-aprobar-item-btn"
                                onClick={() => aprobarItem(item.id, g)}
                              >Aprobar</button>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}

          <div className="sp-pagination">
            <button disabled={page <= 1} onClick={() => cargar(page - 1)}>← Anterior</button>
            <span>Página {page} de {totalPags}</span>
            <button disabled={page >= totalPags} onClick={() => cargar(page + 1)}>Siguiente →</button>
          </div>
        </>
      )}
    </Layout>
  )

  async function aprobarItem(skuId, grupo) {
    await axios.post('/api/serviparamo/aprobar/', { sku_id: skuId })
    setData(prev => ({
      ...prev,
      grupos: prev.grupos.map(g =>
        g.grupo_duplicado === grupo.grupo_duplicado
          ? {
              ...g,
              aprobados: g.aprobados + 1,
              items: g.items.map(i => i.id === skuId ? { ...i, aprobado: true } : i),
            }
          : g
      ),
    }))
  }
}

// ── Familias ─────────────────────────────────────────────────────────────────
function Familias() {
  const [familias, setFamilias] = useState(null)
  const [fusionando, setFusionando] = useState(null)
  const [destino, setDestino] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    axios.get('/api/serviparamo/familias/')
      .then(r => setFamilias(r.data))
  }, [])

  async function fusionar(origen) {
    if (!destino.trim()) return
    try {
      const r = await axios.post('/api/serviparamo/fusionar-familias/', {
        familia_origen: origen,
        familia_destino: destino.trim(),
      })
      setMsg(`✓ ${r.data.fusionados} ítems fusionados → "${r.data.destino}"`)
      setFusionando(null)
      setDestino('')
      // refrescar
      const upd = await axios.get('/api/serviparamo/familias/')
      setFamilias(upd.data)
    } catch {
      setMsg('Error al fusionar.')
    }
  }

  return (
    <Layout>
      <h2 className="sp-section-title">Familias del Catálogo</h2>
      {msg && <p className="sp-msg-ok">{msg}</p>}
      {!familias && <p className="sp-loading">Cargando…</p>}
      {familias && (
        <table className="sp-table">
          <thead>
            <tr>
              <th>Familia normalizada</th>
              <th>Total ítems</th>
              <th>Duplicados</th>
              <th>% dup</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {familias.map(f => (
              <tr key={f.familia_normalizada}>
                <td><strong>{f.familia_normalizada || <em>SIN FAMILIA</em>}</strong></td>
                <td>{f.total?.toLocaleString()}</td>
                <td>{f.duplicados?.toLocaleString()}</td>
                <td>
                  <span className={`sp-badge ${f.duplicados / f.total > 0.5 ? 'warn' : 'ok'}`}>
                    {f.total ? Math.round(f.duplicados / f.total * 100) : 0}%
                  </span>
                </td>
                <td>
                  {fusionando === f.familia_normalizada ? (
                    <div className="sp-fusion-form">
                      <input
                        className="sp-fusion-input"
                        value={destino}
                        onChange={e => setDestino(e.target.value)}
                        placeholder="Familia destino…"
                        autoFocus
                      />
                      <button className="sp-search-btn" onClick={() => fusionar(f.familia_normalizada)}>OK</button>
                      <button className="sp-back" onClick={() => { setFusionando(null); setDestino('') }}>✕</button>
                    </div>
                  ) : (
                    <button
                      className="sp-fusion-btn"
                      onClick={() => { setFusionando(f.familia_normalizada); setDestino('') }}
                    >
                      Fusionar →
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Layout>
  )
}

// ── Router ServiPáramo ────────────────────────────────────────────────────────
export default function ServiParamo() {
  return (
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard"  element={<Dashboard />} />
      <Route path="buscar"     element={<Buscador />} />
      <Route path="duplicados" element={<Duplicados />} />
      <Route path="familias"   element={<Familias />} />
      <Route path="*"          element={<Navigate to="dashboard" replace />} />
    </Routes>
  )
}
