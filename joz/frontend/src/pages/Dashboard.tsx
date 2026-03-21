import { useEffect, useState } from 'react'
import { StatCard } from '../components/StatCard'
import { RiskCard } from '../components/RiskCard'
import { AnomalyChart } from '../components/AnomalyChart'
import { AlertsTable, Alert } from '../components/AlertsTable'
import { Card } from '../components/ui/card'
import { Bell, TrendingUp, Activity, AlertTriangle } from 'lucide-react'

import { getStats, getAnomaliasPorDia, getAlertas, getRiesgos } from '../services/api'

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const resStats = await getStats()
        const resChart = await getAnomaliasPorDia()
        const resRiesgos = await getRiesgos()
        const resAlerts = await getAlertas({ page_size: 5 })

        console.log('STATS:', resStats.data)
        console.log('CHART:', resChart.data)
        console.log('RIESGOS:', resRiesgos.data)
        console.log('ALERTS:', resAlerts.data)

        // --------------------
        // STATS
        // --------------------
        setStats(resStats.data)

        // --------------------
        // CHART (FIX CLAVE)
        // --------------------
        const chartArray =
          resChart.data?.anomalias ||
          resChart.data?.results ||
          resChart.data?.data ||
          (Array.isArray(resChart.data) ? resChart.data : [])

        const formattedChart = chartArray.map((item: any) => ({
          date: item.date,
          anomalies: item.anomalies
        }))

        setChartData(formattedChart)

        // --------------------
        // RIESGOS (TIENDAS)
        // --------------------
        const storesArray =
          resRiesgos.data?.tiendas ||
          resRiesgos.data?.results ||
          []

        const formattedStores = storesArray.slice(0, 6).map((t: any) => ({
          name: t.nombre,
          riskLevel: t.nivel_riesgo,
          anomalyCount: t.anomalias_count
        }))

        setStores(formattedStores)

        // --------------------
        // ALERTAS
        // --------------------
        const alertsArray =
          resAlerts.data?.results ||
          resAlerts.data?.data ||
          []

        const formattedAlerts = alertsArray.map((a: any) => ({
          id: a.id,
          date: a.date,
          store: a.store,
          anomalyType: a.anomalyType,
          amount: a.amount,
          riskLevel: a.riskLevel,
          status: a.estado
        }))

        setAlerts(formattedAlerts)

      } catch (error) {
        console.error('Error cargando dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div>Cargando dashboard...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Dashboard</h1>
        <p className="text-gray-500 mt-1">Resumen general del sistema de monitoreo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Alertas Hoy" value={stats?.alertas_hoy || 0} icon={Bell} />
        <StatCard title="Riesgo Alto" value={stats?.distribucion_riesgo?.alto || 0} icon={TrendingUp} />
        <StatCard title="Transacciones" value={stats?.transacciones_analizadas || 0} icon={Activity} />
        <StatCard title="Anomalías" value={stats?.anomalias_detectadas || 0} icon={AlertTriangle} />
      </div>

      {/* Chart */}
      <AnomalyChart data={chartData} />

      {/* Riesgos */}
      <div>
        <h2 className="text-xl font-medium mb-4">Riesgo por Tienda</h2>
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

      {/* Alertas */}
      <div>
        <h2 className="text-xl font-medium mb-4">Alertas Recientes</h2>
        <Card>
          <AlertsTable alerts={alerts} />
        </Card>
      </div>
    </div>
  )
}