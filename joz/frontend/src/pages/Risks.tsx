import { useEffect, useState } from 'react'
import { getStats, getHistorial, getRiesgos } from '../services/api'
import { RiskCard } from '../components/RiskCard'
import { RiskDetailModal } from '../components/RiskDetailModal'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts'
import { Badge } from '../components/ui/badge'

type RiskLevel = 'low' | 'medium' | 'high'
type RiskLevelEs = 'bajo' | 'medio' | 'alto'

interface Store {
  id: number
  nombre: string
  nivel_riesgo: RiskLevel
  anomalias_count: number
}

interface RiesgoModel {
  id: number
  categoria: string
  descripcion: string
  nivel: RiskLevelEs
  nivel_riesgo: RiskLevel
  probabilidad: number | null
  impacto_estimado: number | null
}

interface Transaccion {
  store: string
  entrada: number
  salida: number
}

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

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP'
  }).format(n)

const fmtProb = (p: number | null) => {
  if (p === null || p === undefined) return '—'
  const percentage = p <= 1 ? p * 100 : p
  return `${percentage.toFixed(0)}%`
}

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
  const [rows, setRows] = useState<Transaccion[]>([])
  const [riesgos, setRiesgos] = useState<RiesgoModel[]>([])
  const [selectedRiesgoId, setSelectedRiesgoId] = useState<number | null>(null)
  const [riskDistribution, setRiskDistribution] = useState([
    { name: 'Riesgo Alto', value: 0, color: '#ef4444' },
    { name: 'Riesgo Medio', value: 0, color: '#f97316' },
    { name: 'Riesgo Bajo', value: 0, color: '#22c55e' },
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, historialData, riesgosData] = await Promise.all([
          getStats(),
          getHistorial({ page_size: 500 }),
          getRiesgos(),
        ])

        const tiendas: Store[] = statsData?.tiendas ?? []
        const historial: Transaccion[] = historialData?.results ?? []
        const riesgosModel: RiesgoModel[] = riesgosData?.riesgos ?? []

        setStores(tiendas)
        setRows(historial)
        setRiesgos(riesgosModel)

        const sorted = [...tiendas].sort(
          (a, b) => b.anomalias_count - a.anomalias_count
        )

        setTopStores(sorted.slice(0, 5))

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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

      <Card className="bg-slate-900 border-amber-500/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Riesgos Operativos (Modelo)</h3>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-200 border-amber-500/30">
            {riesgos.length} riesgos
          </Badge>
        </div>

        {riesgos.length === 0 ? (
          <p className="text-sm text-amber-200/60">No hay riesgos operativos disponibles.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-amber-500/20">
                <tr>
                  <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-amber-200/70">Categoría</th>
                  <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-amber-200/70">Nivel</th>
                  <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-amber-200/70">Probabilidad</th>
                  <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-amber-200/70">Impacto</th>
                  <th className="text-right px-3 py-2 text-xs uppercase tracking-wide text-amber-200/70">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10">
                {riesgos.map((riesgo) => (
                  <tr key={riesgo.id} className="hover:bg-slate-800/60 transition-colors">
                    <td className="px-3 py-3">
                      <p className="text-sm font-medium text-slate-100">{riesgo.categoria}</p>
                      <p className="text-xs text-amber-200/60 mt-1">{riesgo.descripcion || '—'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={riskColorsMap[riesgo.nivel_riesgo]}>
                        {riskLabels[riesgo.nivel_riesgo]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-sm text-amber-100">{fmtProb(riesgo.probabilidad)}</td>
                    <td className="px-3 py-3 text-sm text-amber-100">
                      {riesgo.impacto_estimado !== null ? fmt(riesgo.impacto_estimado) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-500/30 text-amber-200 hover:bg-amber-500/10"
                        onClick={() => setSelectedRiesgoId(riesgo.id)}
                      >
                        Ver detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {stores.map(store => (
          <RiskCard
            key={store.id}
            storeName={store.nombre}
            riskLevel={store.nivel_riesgo}
            anomalyCount={store.anomalias_count}
          />
        ))}
      </div>

      <RiskDetailModal
        riesgoId={selectedRiesgoId}
        onClose={() => setSelectedRiesgoId(null)}
      />
    </div>
  )
}
