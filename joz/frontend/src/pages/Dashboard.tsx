import { useEffect, useState } from 'react'
import { StatCard } from '../components/StatCard'
import { RiskCard } from '../components/RiskCard'
import { AnomalyChart } from '../components/AnomalyChart'
import { Card } from '../components/ui/card'
import { ArrowDownCircle, ArrowUpCircle, Activity, DollarSign } from 'lucide-react'

import { getStats, getAnomaliasPorDia, getRiesgos } from '../services/api'

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [resStats, resChart, resRiesgos] = await Promise.all([
          getStats(),
          getAnomaliasPorDia(),
          getRiesgos(),
        ])

        const s    = resStats.data?.data   ?? resStats.data
        const chart = resChart.data?.data  ?? resChart.data
        const riesgos = resRiesgos.data?.data ?? resRiesgos.data

        setStats(s)
        setChartData(chart?.anomalias ?? [])

        const storesArr = riesgos?.tiendas ?? s?.tiendas ?? []
        setStores(storesArr.slice(0, 6).map((t: any) => ({
          name: t.nombre,
          riskLevel: t.nivel_riesgo,
          anomalyCount: t.anomalias_count,
          montoTotal: t.monto_total,
        })))

      } catch (error) {
        console.error('Error cargando dashboard:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const fmtNum = (n: number) =>
    new Intl.NumberFormat('es-PA').format(n)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Cargando dashboard...</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light">Dashboard</h1>
        <p className="text-gray-500 mt-1">Monitoreo de transacciones SuperEfectivo</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Transacciones Totales"
          value={fmtNum(stats?.total_transacciones ?? 0)}
          icon={Activity}
          iconColor="text-blue-600"
          trend={{ value: `${fmtNum(stats?.transacciones_hoy ?? 0)} hoy`, isPositive: true }}
        />
        <StatCard
          title="Volumen Total"
          value={fmt(stats?.total_monto ?? 0)}
          icon={DollarSign}
          iconColor="text-green-600"
          trend={{ value: `${fmt(stats?.monto_hoy ?? 0)} hoy`, isPositive: true }}
        />
        <StatCard
          title="Aportes"
          value={fmtNum(stats?.aportes_count ?? 0)}
          icon={ArrowDownCircle}
          iconColor="text-emerald-600"
          trend={{ value: fmt(stats?.aportes_monto ?? 0), isPositive: true }}
        />
        <StatCard
          title="Retiros"
          value={fmtNum(stats?.retiros_count ?? 0)}
          icon={ArrowUpCircle}
          iconColor="text-orange-600"
          trend={{ value: fmt(stats?.retiros_monto ?? 0), isPositive: false }}
        />
      </div>

      {/* Gráfico de volumen diario */}
      <AnomalyChart data={chartData} />

      {/* Tiendas por volumen */}
      <div>
        <h2 className="text-xl font-medium mb-4">Actividad por Almacén</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <RiskCard
              key={store.name}
              storeName={store.name}
              riskLevel={store.riskLevel}
              anomalyCount={store.anomalyCount}
            />
          ))}
        </div>
      </div>

      {/* Resumen financiero */}
      <Card className="p-6">
        <h2 className="text-lg font-medium mb-4">Resumen Financiero (Últimos 7 días)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">Total Entradas</p>
            <p className="text-2xl font-semibold text-emerald-600 mt-1">{fmt(stats?.total_entrada ?? 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Total Salidas</p>
            <p className="text-2xl font-semibold text-red-600 mt-1">{fmt(stats?.total_salida ?? 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Volumen Bruto</p>
            <p className="text-2xl font-semibold text-blue-600 mt-1">{fmt(stats?.total_monto ?? 0)}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
