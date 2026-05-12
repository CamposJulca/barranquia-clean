import { useEffect, useState } from 'react'
import { getStats, getRiesgos, getRiesgosConfig, runDeteccion } from '../services/api'
import { fmtUSD } from '../utils/formatters'
import { RiskCard } from '../components/RiskCard'
import { RiskDetailModal } from '../components/RiskDetailModal'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts'

type RiskLevel = 'low' | 'medium' | 'high'
type RiskLevelEs = 'bajo' | 'medio' | 'alto'

interface Store {
  id: number
  nombre: string
  nivel_riesgo: RiskLevel
  anomalias_count: number
  monto_total: number
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

interface RiesgosConfig {
  pesos: { tasa_anomalia: number; avg_score: number; tasa_critica: number }
  saturacion: { tasa_anomalia: number; tasa_critica: number }
  umbrales: {
    alto: { score: number; tasa_critica: number }
    medio: { score: number; tasa_critica: number }
  }
  formula: string
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

const fmt = fmtUSD

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
  const [riesgos, setRiesgos] = useState<RiesgoModel[]>([])
  const [config, setConfig] = useState<RiesgosConfig | null>(null)
  const [selectedRiesgoId, setSelectedRiesgoId] = useState<number | null>(null)
  const [recalculating, setRecalculating] = useState(false)
  const [riskDistribution, setRiskDistribution] = useState([
    { name: 'Riesgo Alto', value: 0, color: '#ef4444' },
    { name: 'Riesgo Medio', value: 0, color: '#f97316' },
    { name: 'Riesgo Bajo', value: 0, color: '#22c55e' },
  ])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [statsData, riesgosData, configData] = await Promise.all([
        getStats(),
        getRiesgos(),
        getRiesgosConfig().catch(() => null),
      ])
      if (configData) setConfig(configData as RiesgosConfig)

      const tiendasRiesgos: Store[] = riesgosData?.tiendas ?? []
      const tiendas: Store[] = tiendasRiesgos.length > 0 ? tiendasRiesgos : (statsData?.tiendas ?? [])
      const riesgosModel: RiesgoModel[] = riesgosData?.riesgos ?? []

      setStores(tiendas)
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

  useEffect(() => {
    fetchData()
  }, [])

  const handleRecalculate = async () => {
    setRecalculating(true)
    try {
      await runDeteccion({ limpiar: true })
      // Esperar a que el backend procese la detección y actualice riesgos
      const poll = async (attempts: number) => {
        if (attempts <= 0) {
          setRecalculating(false)
          return
        }
        await new Promise(r => setTimeout(r, 2000))
        await fetchData()
        setRecalculating(false)
      }
      poll(3)
    } catch {
      setRecalculating(false)
    }
  }

  const calcularMonto = (nombre: string) => {
    const store = stores.find(s => s.nombre === nombre)
    return store?.monto_total ?? 0
  }

  if (loading) {
    return <div className="text-center py-10 text-[#c9a84c]/60">Cargando riesgos...</div>
  }

  return (
    <div className="space-y-6">

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Riesgos</h1>
          <p className="text-[#7a8ea0] text-sm mt-1">
            Scoring de riesgo operativo por almacén — combina volumen de anomalías, monto en riesgo y patrones de comportamiento para priorizar auditorías.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRecalculate}
          disabled={recalculating}
          className="border-[#d4a853]/30 text-[#c9a84c] hover:bg-[#d4a853]/10"
        >
          {recalculating ? 'Recalculando...' : 'Recalcular riesgos'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card className="bg-[#162032] border-[#d4a853]/20 p-6">
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

        <Card className="bg-[#162032] border-[#d4a853]/20 p-6">
          <h3 className="text-base font-semibold text-white mb-4">Ranking Inteligente</h3>

          <div className="space-y-3">
            {topStores.map((store, index) => {
              const monto = calcularMonto(store.nombre)
              const score = calcularScore(store.anomalias_count, monto)
              const impacto = clasificarImpacto(score)

              return (
                <div key={store.id} className="flex justify-between p-3 bg-[#1e2d42] rounded-lg">
                  <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 flex items-center justify-center bg-[#d4a853] text-[#0c1220] font-bold rounded-full text-sm">
                      {index + 1}
                    </div>

                    <div>
                      <p className="font-medium text-slate-100">{store.nombre}</p>
                      <p className="text-xs text-[#c9a84c]/50">
                        {store.anomalias_count} anomalías
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge className={riskColorsMap[store.nivel_riesgo]}>
                      {riskLabels[store.nivel_riesgo]}
                    </Badge>

                    <p className="text-xs text-[#c9a84c]/50 mt-1">
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

      <Card className="bg-[#162032] border-[#d4a853]/20 p-6">
        <h3 className="text-base font-semibold text-white mb-2">Análisis Inteligente</h3>

        <p className="text-sm text-[#c9a84c]/60">
          {
            topStores[0]
              ? `La tienda ${topStores[0].nombre} presenta el mayor riesgo con ${topStores[0].anomalias_count} anomalías y un impacto financiero de ${fmt(calcularMonto(topStores[0].nombre))}.`
              : 'No hay datos suficientes.'
          }
        </p>
      </Card>

      {config && (
        <Card className="bg-[#162032] border-[#d4a853]/20 p-6">
          <h3 className="text-base font-semibold text-white mb-3">Cómo se calcula el riesgo</h3>
          <div className="space-y-3 text-sm text-[#b8c5d4]">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#c9a84c]/60 mb-1">Fórmula del score</p>
              <code className="block bg-[#0c1220] border border-[#2a3a50] rounded px-3 py-2 text-xs text-[#f0e6d0] font-mono">
                {config.formula}
              </code>
              <p className="mt-2 text-xs text-[#7a8ea0]">
                Pesos: tasa de anomalía <strong className="text-[#f0e6d0]">{Math.round(config.pesos.tasa_anomalia * 100)}%</strong>,
                score promedio <strong className="text-[#f0e6d0]">{Math.round(config.pesos.avg_score * 100)}%</strong>,
                tasa crítica <strong className="text-[#f0e6d0]">{Math.round(config.pesos.tasa_critica * 100)}%</strong>.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#c9a84c]/60 mb-1">Umbrales por nivel</p>
              <ul className="space-y-1 text-xs">
                <li>
                  <Badge className={riskColorsMap.high}>Alto</Badge>
                  <span className="ml-2">score ≥ {config.umbrales.alto.score} <em>o</em> tasa crítica ≥ {(config.umbrales.alto.tasa_critica * 100).toFixed(1)}%</span>
                </li>
                <li>
                  <Badge className={riskColorsMap.medium}>Medio</Badge>
                  <span className="ml-2">score ≥ {config.umbrales.medio.score} <em>o</em> tasa crítica ≥ {(config.umbrales.medio.tasa_critica * 100).toFixed(1)}%</span>
                </li>
                <li>
                  <Badge className={riskColorsMap.low}>Bajo</Badge>
                  <span className="ml-2">por debajo de ambos umbrales</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#c9a84c]/60 mb-1">Ejemplo</p>
              <p className="text-xs text-[#7a8ea0]">
                Un almacén con tasa de anomalía del 4% y score promedio de 60/100 obtiene
                score ≈ min(0.04·10, 1)·0.4 + (60/100)·0.3 + 0 = <strong className="text-[#f0e6d0]">0.34</strong> → nivel <strong className="text-[#f0e6d0]">medio</strong>.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="bg-[#162032] border-[#d4a853]/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Riesgos Operativos (Modelo)</h3>
          <Badge variant="outline" className="bg-[#d4a853]/10 text-[#c9a84c] border-[#d4a853]/30">
            {riesgos.length} riesgos
          </Badge>
        </div>

        {riesgos.length === 0 ? (
          <p className="text-sm text-[#c9a84c]/60">No hay riesgos operativos disponibles.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#d4a853]/20">
                <tr>
                  <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-[#c9a84c]/70">Categoría</th>
                  <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-[#c9a84c]/70">Nivel</th>
                  <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-[#c9a84c]/70">Probabilidad</th>
                  <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-[#c9a84c]/70">Impacto</th>
                  <th className="text-right px-3 py-2 text-xs uppercase tracking-wide text-[#c9a84c]/70">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10">
                {riesgos.map((riesgo) => (
                  <tr key={riesgo.id} className="hover:bg-[#1e2d42]/60 transition-colors">
                    <td className="px-3 py-3">
                      <p className="text-sm font-medium text-slate-100">{riesgo.categoria}</p>
                      <p className="text-xs text-[#c9a84c]/60 mt-1">{riesgo.descripcion || '—'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={riskColorsMap[riesgo.nivel_riesgo]}>
                        {riskLabels[riesgo.nivel_riesgo]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-sm text-[#f0e6d0]">{fmtProb(riesgo.probabilidad)}</td>
                    <td className="px-3 py-3 text-sm text-[#f0e6d0]">
                      {riesgo.impacto_estimado !== null ? fmt(riesgo.impacto_estimado) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#d4a853]/30 text-[#c9a84c] hover:bg-[#d4a853]/10"
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

      {/* Nota informativa */}
      <div className="rounded-lg border border-[#2a3a50] bg-[#0c1220] px-4 py-3 text-xs text-[#7a8ea0]">
        <strong className="text-[#b8c5d4]">Nota:</strong> El ranking y los niveles de riesgo se calculan a partir de las alertas existentes.
        Si modificó las reglas de detección en Configuración, pulse &quot;Recalcular riesgos&quot; para actualizar
        los niveles con base en las nuevas alertas generadas.
      </div>

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
