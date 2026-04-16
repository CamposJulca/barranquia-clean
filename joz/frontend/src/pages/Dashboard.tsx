import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { StatCard } from '../components/StatCard'
import { AnomalyChart } from '../components/AnomalyChart'
import { Card } from '../components/ui/card'

import {
  Activity,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react'

import { getStats, getAnomaliasPorDia, getHistorial } from '../services/api'

type TipoOperacion =
  | 'Empeño'
  | 'Retiro de empeño'
  | 'Abono / Interés'
  | 'Apertura de caja'
  | 'Cierre de caja'
  | 'Otro'

interface TipoData {
  count: number
  monto: number
}

interface StoreCalculado {
  nombre: string
  total: number
  cantidad: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [storesCalculados, setStoresCalculados] = useState<StoreCalculado[]>([])
  const [tiposGlobales, setTiposGlobales] = useState<Record<TipoOperacion, TipoData>>({
    'Empeño': { count: 0, monto: 0 },
    'Retiro de empeño': { count: 0, monto: 0 },
    'Abono / Interés': { count: 0, monto: 0 },
    'Apertura de caja': { count: 0, monto: 0 },
    'Cierre de caja': { count: 0, monto: 0 },
    'Otro': { count: 0, monto: 0 },
  })
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRaw, chartRaw, historialRaw] = await Promise.all([
          getStats(),
          getAnomaliasPorDia(),
          getHistorial({ page_size: 500 }),
        ])

        const statsData = statsRaw?.data ?? statsRaw
        setStats(statsData)

        const rows = historialRaw?.results ?? []

        const chartDataFromHistorial = rows.reduce((acc: any, r: any) => {
  const date = r.date

  if (!acc[date]) {
    acc[date] = {
      date,          // 🔥 clave correcta
      aportes: 0,
      retiros: 0
    }
  }

  acc[date].aportes += Number(r.entrada || 0)
  acc[date].retiros += Number(r.salida || 0)

  return acc
}, {})

const chartArray = Object.values(chartDataFromHistorial).sort(
  (a: any, b: any) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
)

setChartData(chartArray)

        const categorizar = (r: any): TipoOperacion => {
          const desc = r.descripcion?.toLowerCase() ?? ''

          if (desc.startsWith('empeño')) return 'Empeño'
          if (desc.startsWith('retira')) return 'Retiro de empeño'
          if (desc.startsWith('abona') || desc.startsWith('paga')) return 'Abono / Interés'
          if (desc.startsWith('apertura')) return 'Apertura de caja'
          if (desc.startsWith('cierre')) return 'Cierre de caja'

          return 'Otro'
        }

        const mapa: Record<string, StoreCalculado> = {}

        const tipos: Record<TipoOperacion, TipoData> = {
          'Empeño': { count: 0, monto: 0 },
          'Retiro de empeño': { count: 0, monto: 0 },
          'Abono / Interés': { count: 0, monto: 0 },
          'Apertura de caja': { count: 0, monto: 0 },
          'Cierre de caja': { count: 0, monto: 0 },
          'Otro': { count: 0, monto: 0 },
        }

        rows.forEach((r: any) => {
          const store = r.store
          const categoria = categorizar(r)
          const monto = Number(r.entrada || 0) + Number(r.salida || 0)

          if (!mapa[store]) {
            mapa[store] = {
              nombre: store,
              total: 0,
              cantidad: 0,
            }
          }

          mapa[store].total += monto
          mapa[store].cantidad += 1

          tipos[categoria].count++
          tipos[categoria].monto += monto
        })

        setStoresCalculados(Object.values(mapa))
        setTiposGlobales(tipos)

      } catch (error) {
        console.error('Error cargando dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(n)

  const fmtNum = (n: number) =>
    new Intl.NumberFormat('es-CO').format(n)

  if (loading) return <div>Cargando...</div>

  return (
    <div className="space-y-6">

      <h1 className="text-3xl">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard title="Transacciones" value={fmtNum(stats?.total_transacciones)} icon={Activity} />
        <StatCard title="Volumen Total" value={fmt(stats?.total_monto)} icon={DollarSign} />
        <StatCard title="Aportes" value={fmtNum(stats?.aportes_count)} icon={ArrowDownCircle} />
        <StatCard title="Retiros" value={fmtNum(stats?.retiros_count)} icon={ArrowUpCircle} />
      </div>

      {/* TIPOS */}
      <div className="grid grid-cols-6 gap-4">
        {Object.entries(tiposGlobales).map(([tipo, val]) => (
          <Card key={tipo} className="p-4 text-center">
            <p className="text-sm text-gray-500">{tipo}</p>
            <p className="text-xl font-semibold">{fmtNum(val.count)}</p>
            <p className="text-xs text-gray-400">{fmt(val.monto)}</p>
          </Card>
        ))}
      </div>

      <AnomalyChart data={chartData} />

      {/* ALMACENES — clic → detalle */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Almacenes
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {storesCalculados
            .sort((a, b) => b.total - a.total)
            .map((store) => (
            <div
              key={store.nombre}
              onClick={() => navigate(`/store/${encodeURIComponent(store.nombre)}`)}
              className="p-4 bg-slate-900 border border-slate-700 rounded-xl cursor-pointer hover:border-slate-500/40 hover:shadow-lg hover:shadow-slate-800/50 transition-all group"
            >
              <p className="text-xs text-amber-200/60 mb-1">{store.nombre}</p>
              <p className="text-xl font-bold text-amber-400 group-hover:text-amber-300 transition">
                {fmt(store.total)}
              </p>
              <p className="text-xs text-amber-200/40 mt-1">
                {store.cantidad.toLocaleString('es-CO')} transacciones
              </p>
            </div>
          ))}
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p>Entradas</p>
            <p className="text-green-600">{fmt(stats?.total_entrada)}</p>
          </div>
          <div>
            <p>Salidas</p>
            <p className="text-red-600">{fmt(stats?.total_salida)}</p>
          </div>
          <div>
            <p>Balance</p>
            <p>{fmt(stats?.total_entrada - stats?.total_salida)}</p>
          </div>
        </div>
      </Card>

    </div>
  )
}