import { useEffect, useState } from 'react'
import { getStats, getHistorial } from '../services/api'
import { RiskCard } from '../components/RiskCard'
import { Card } from '../components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts'
import { Badge } from '../components/ui/badge'

// 🔥 TIPOS
type RiskLevel = 'low' | 'medium' | 'high'

interface Store {
  id: number
  nombre: string
  nivel_riesgo: RiskLevel
  anomalias_count: number
}

interface Transaccion {
  store: string
  entrada: number
  salida: number
}

// 🔥 COLORES
const riskColorsMap: Record<RiskLevel, string> = {
  low: 'bg-green-500/20 text-green-300 border border-green-500/30',
  medium: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  high: 'bg-red-500/20 text-red-300 border border-red-500/30',
}

const riskLabels: Record<RiskLevel, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto'
}

// 🔥 FORMATO
const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP'
  }).format(n)

// 🔥 BI
const calcularScore = (anomalias: number, monto: number) => {
  return anomalias * monto
}

const clasificarImpacto = (score: number) => {
  if (score > 50000) return { label: 'Crítico', color: 'text-red-600' }
  if (score > 20000) return { label: 'Alto', color: 'text-orange-600' }
  if (score > 5000) return { label: 'Medio', color: 'text-yellow-600' }
  return { label: 'Bajo', color: 'text-green-600' }
}

export default function Risks() {
  const [stores, setStores] = useState<Store[]>([])
  const [topStores, setTopStores] = useState<Store[]>([])
  const [riskDistribution, setRiskDistribution] = useState([
    { name: 'Riesgo Alto', value: 0, color: '#ef4444' },
    { name: 'Riesgo Medio', value: 0, color: '#f97316' },
    { name: 'Riesgo Bajo', value: 0, color: '#22c55e' },
  ])
  const [rows, setRows] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, historialData] = await Promise.all([
          getStats(),
          getHistorial({ page_size: 500 }),
        ])

        const tiendas: Store[] = statsData?.tiendas ?? []
        const historial: Transaccion[] = historialData?.results ?? []

        setStores(tiendas)
        setRows(historial)

        // 🔥 TOP STORES
        const sorted = [...tiendas].sort(
          (a, b) => b.anomalias_count - a.anomalias_count
        )

        setTopStores(sorted.slice(0, 5))

        // 🔥 DISTRIBUCIÓN
        const high = tiendas.filter(t => t.nivel_riesgo === 'high').length
        const medium = tiendas.filter(t => t.nivel_riesgo === 'medium').length
        const low = tiendas.filter(t => t.nivel_riesgo === 'low').length

        setRiskDistribution([
          { name: 'Riesgo Alto', value: high, color: '#ef4444' },
          { name: 'Riesgo Medio', value: medium, color: '#f97316' },
          { name: 'Riesgo Bajo', value: low, color: '#22c55e' },
        ])

      } catch (error) {
        console.error('Error cargando riesgos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // 🔥 CALCULAR MONTO REAL POR TIENDA
  const calcularMonto = (nombre: string) => {
    return rows
      .filter(r => r.store === nombre)
      .reduce(
        (sum, r) =>
          sum + Number(r.entrada || 0) + Number(r.salida || 0),
        0
      )
  }

  if (loading) {
    return <div className="text-center py-10 text-amber-200/60">Cargando riesgos...</div>
  }

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-white">Riesgos</h1>
        <p className="text-amber-200/60 text-sm mt-1">Análisis de riesgo por sucursales</p>
      </div>

      {/* 🔥 CHART + RANKING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* DISTRIBUCIÓN */}
        <Card className="bg-slate-900 border-amber-500/20 p-6">
          <h3 className="text-base font-semibold text-white mb-4">Distribución de Riesgos</h3>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={riskDistribution} dataKey="value" outerRadius={80}>
                {riskDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* 🔥 RANKING BI */}
        <Card className="bg-slate-900 border-amber-500/20 p-6">
          <h3 className="text-base font-semibold text-white mb-4">Ranking Inteligente</h3>

          <div className="space-y-3">
            {topStores.map((store, index) => {

              const monto = calcularMonto(store.nombre)
              const score = calcularScore(store.anomalias_count, monto)
              const impacto = clasificarImpacto(score)

              return (
                <div key={store.id} className="flex justify-between p-3 bg-slate-800 rounded-lg">

                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 flex items-center justify-center bg-amber-500 text-slate-950 font-bold rounded-full text-sm">
                      {index + 1}
                    </div>

                    <div>
                      <p className="font-medium text-slate-100">{store.nombre}</p>
                      <p className="text-xs text-amber-200/50">
                        {store.anomalias_count} anomalías
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge className={riskColorsMap[store.nivel_riesgo]}>
                      {riskLabels[store.nivel_riesgo]}
                    </Badge>

                    <p className="text-xs text-amber-200/50 mt-1">
                      {fmt(monto)}
                    </p>

                    <p className={`text-xs ${impacto.color}`}>
                      {impacto.label}
                    </p>
                  </div>

                </div>
              )
            })}
          </div>
        </Card>

      </div>

      {/* 🔥 INSIGHT */}
      <Card className="bg-slate-900 border-amber-500/20 p-6">
        <h3 className="text-base font-semibold text-white mb-2">Análisis Inteligente</h3>

        <p className="text-sm text-amber-200/60">
          {
            topStores[0]
              ? `La tienda ${topStores[0].nombre} presenta el mayor riesgo con ${topStores[0].anomalias_count} anomalías y un impacto financiero de ${fmt(calcularMonto(topStores[0].nombre))}.`
              : 'No hay datos suficientes.'
          }
        </p>
      </Card>

      {/* GRID */}
      <div className="grid grid-cols-3 gap-4">
        {stores.map(store => (
          <RiskCard
            key={store.id}
            storeName={store.nombre}
            riskLevel={store.nivel_riesgo}
            anomalyCount={store.anomalias_count}
          />
        ))}
      </div>

    </div>
  )
}