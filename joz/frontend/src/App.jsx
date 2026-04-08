import { useEffect, useState } from 'react'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,
})

function fmt(v) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(v)
}

function categorizar(descripcion) {
  const d = descripcion?.toLowerCase() ?? ''
  if (d.startsWith('empeño de:'))            return 'Empeño'
  if (d.startsWith('retira por valor'))       return 'Retiro de empeño'
  if (d.startsWith('abona') || d.startsWith('paga')) return 'Abono / Interés'
  if (d.startsWith('apertura de caja'))       return 'Apertura de caja'
  if (d.startsWith('cierre de caja'))         return 'Cierre de caja'
  return 'Otro'
}

const CAT_STYLE = {
  'Empeño':           'bg-purple-100 text-purple-700',
  'Retiro de empeño': 'bg-amber-100  text-amber-700',
  'Abono / Interés':  'bg-blue-100   text-blue-700',
  'Apertura de caja': 'bg-green-100  text-green-700',
  'Cierre de caja':   'bg-gray-100   text-gray-600',
  'Otro':             'bg-slate-100  text-slate-600',
}

const CATS = ['Empeño', 'Retiro de empeño', 'Abono / Interés', 'Apertura de caja', 'Cierre de caja', 'Otro']

export default function App() {
  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [catFiltro, setCatFiltro] = useState('Todas')

  useEffect(() => {
    api.get('/historial/', { params: { page_size: 500 } })
      .then(res => {
        const data = res.data?.data?.results ?? res.data?.results ?? []
        setRows(data.map(r => ({ ...r, categoria: categorizar(r.descripcion) })))
      })
      .catch(() => setError('No se pudo conectar con el servidor'))
      .finally(() => setLoading(false))
  }, [])

  // KPIs por categoría
  const kpis = CATS.map(cat => {
    const grupo = rows.filter(r => r.categoria === cat)
    return { cat, cant: grupo.length, total: grupo.reduce((s, r) => s + Number(r.amount || 0), 0) }
  }).filter(k => k.cant > 0)

  // Almacenes únicos con totales
  const almacenes = [...new Set(rows.map(r => r.store))].sort()
  const porAlmacen = almacenes.map(name => {
    const g = rows.filter(r => r.store === name)
    return { name, cant: g.length, total: g.reduce((s, r) => s + Number(r.amount || 0), 0) }
  })

  // Filtrado de tabla
  const filtradas = rows.filter(r => {
    const okCat = catFiltro === 'Todas' || r.categoria === catFiltro
    const okBus = !busqueda ||
      r.cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.referencia?.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.store?.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
    return okCat && okBus
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-3">
        <span className="text-xl font-bold text-gray-900">SuperEfectivo</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500 text-sm">Movimientos del día · 27 Mar 2026</span>
        <span className="ml-auto text-xs text-gray-400">{rows.length} transacciones cargadas</span>
      </header>

      <main className="px-8 py-6 max-w-7xl mx-auto space-y-8">

        {/* KPIs por operación */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Operaciones del día</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {kpis.map(k => (
              <div
                key={k.cat}
                onClick={() => setCatFiltro(catFiltro === k.cat ? 'Todas' : k.cat)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all
                  ${catFiltro === k.cat ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${CAT_STYLE[k.cat]}`}>
                  {k.cat}
                </span>
                <p className="text-2xl font-bold text-gray-900">{k.cant}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fmt(k.total)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen por almacén */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Por almacén</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {porAlmacen.map(a => (
              <div key={a.name} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-xs font-semibold text-gray-500">{a.name}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{a.cant}</p>
                <p className="text-xs text-gray-400">{fmt(a.total)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
            <h2 className="font-semibold text-gray-900 shrink-0">
              Transacciones
              <span className="ml-2 text-xs text-gray-400 font-normal">{filtradas.length} de {rows.length}</span>
            </h2>
            {catFiltro !== 'Todas' && (
              <span
                onClick={() => setCatFiltro('Todas')}
                className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${CAT_STYLE[catFiltro]}`}
              >
                {catFiltro} ✕
              </span>
            )}
            <input
              type="text"
              placeholder="Buscar cliente, referencia, descripción…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-72
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loading && <div className="p-12 text-center text-gray-400">Cargando…</div>}
          {error   && <div className="p-12 text-center text-red-500">{error}</div>}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Ref.</th>
                    <th className="px-4 py-3 text-left">Almacén</th>
                    <th className="px-4 py-3 text-left">Operación</th>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Descripción</th>
                    <th className="px-4 py-3 text-left">Cajero</th>
                    <th className="px-4 py-3 text-right">Entrada</th>
                    <th className="px-4 py-3 text-right">Salida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtradas.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.referencia}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{r.store}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${CAT_STYLE[r.categoria]}`}>
                          {r.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{r.cliente}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate text-xs" title={r.descripcion}>{r.descripcion}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{r.analista}</td>
                      <td className="px-4 py-3 text-right text-green-700 font-medium whitespace-nowrap">
                        {Number(r.entrada) > 0 ? fmt(r.entrada) : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-red-700 font-medium whitespace-nowrap">
                        {Number(r.salida) > 0 ? fmt(r.salida) : <span className="text-gray-200">—</span>}
                      </td>
                    </tr>
                  ))}
                  {filtradas.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-400">Sin resultados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
