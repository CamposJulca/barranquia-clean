import { useEffect, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { getRiesgoDetalle } from '../services/api'

type RiskLevel = 'low' | 'medium' | 'high'

type RiesgoDetalle = {
  id: number
  motivo_riesgo: {
    categoria: string
    descripcion: string
  }
  datos_asociados: {
    nivel: string
    nivel_riesgo: RiskLevel
    probabilidad: number | null
    impacto_estimado: number | null
    calculado_en: string | null
  }
  contexto_anomalia: {
    total_alertas_nivel: number
    alertas_abiertas: number
    tipos_frecuentes: string[]
  }
}

interface RiskDetailModalProps {
  riesgoId: number | null
  onClose: () => void
}

const riskStyles: Record<RiskLevel, string> = {
  low: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  high: 'bg-red-500/15 text-red-300 border-red-500/30',
}

const riskLabels: Record<RiskLevel, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
}

const formatCop = (value: number | null) => {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value)
}

const formatProbabilidad = (value: number | null) => {
  if (value === null || value === undefined) return '—'
  const percentage = value <= 1 ? value * 100 : value
  return `${percentage.toFixed(0)}%`
}

const formatDateTime = (value: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-CO')
}

export function RiskDetailModal({ riesgoId, onClose }: RiskDetailModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<RiesgoDetalle | null>(null)

  useEffect(() => {
    if (!riesgoId) return

    let cancelled = false

    async function fetchDetail() {
      setLoading(true)
      setError(null)
      try {
        const res = await getRiesgoDetalle(riesgoId)
        if (!cancelled) {
          setData(res as RiesgoDetalle)
        }
      } catch (err: any) {
        if (!cancelled) {
          const message = err?.response?.data?.error ?? err?.message ?? 'No se pudo cargar el detalle del riesgo.'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchDetail()

    return () => {
      cancelled = true
    }
  }, [riesgoId])

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  if (!riesgoId) return null

  const level = data?.datos_asociados?.nivel_riesgo ?? 'low'
  const frequentTypes = data?.contexto_anomalia?.tipos_frecuentes ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar detalle de riesgo"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      <Card className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-amber-500/20 p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-xl font-semibold text-white">Detalle de Riesgo</h3>
            <p className="text-sm text-amber-200/60 mt-1">
              Riesgo ID: {riesgoId}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-amber-200 hover:text-amber-100 hover:bg-amber-500/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {loading && (
          <div className="text-center text-amber-200/70 py-8">
            Cargando detalle del riesgo...
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300">
            <p className="font-medium">Error al cargar detalle</p>
            <p className="text-sm mt-1 text-red-300/80">{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-5">
            <Card className="bg-slate-800 border-amber-500/20 p-4">
              <h4 className="text-sm uppercase tracking-wide text-amber-200/70 mb-2">Motivo del Riesgo</h4>
              <p className="text-lg font-semibold text-slate-100">{data.motivo_riesgo.categoria}</p>
              <p className="text-sm text-amber-200/70 mt-2">{data.motivo_riesgo.descripcion || '—'}</p>
            </Card>

            <Card className="bg-slate-800 border-amber-500/20 p-4">
              <h4 className="text-sm uppercase tracking-wide text-amber-200/70 mb-3">Datos Asociados</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-900 rounded-lg p-3 border border-amber-500/10">
                  <p className="text-xs text-amber-200/60">Nivel</p>
                  <Badge variant="outline" className={`mt-2 ${riskStyles[level] || riskStyles.low}`}>
                    {riskLabels[level] || 'Bajo'}
                  </Badge>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 border border-amber-500/10">
                  <p className="text-xs text-amber-200/60">Probabilidad</p>
                  <p className="text-slate-100 mt-2">{formatProbabilidad(data.datos_asociados.probabilidad)}</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 border border-amber-500/10">
                  <p className="text-xs text-amber-200/60">Impacto Estimado</p>
                  <p className="text-slate-100 mt-2">{formatCop(data.datos_asociados.impacto_estimado)}</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 border border-amber-500/10">
                  <p className="text-xs text-amber-200/60">Calculado en</p>
                  <p className="text-slate-100 mt-2">{formatDateTime(data.datos_asociados.calculado_en)}</p>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-800 border-amber-500/20 p-4">
              <h4 className="text-sm uppercase tracking-wide text-amber-200/70 mb-3">Contexto de la Anomalía</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-900 rounded-lg p-3 border border-amber-500/10">
                  <p className="text-xs text-amber-200/60">Total alertas del nivel</p>
                  <p className="text-xl font-semibold text-slate-100 mt-1">{data.contexto_anomalia.total_alertas_nivel}</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 border border-amber-500/10">
                  <p className="text-xs text-amber-200/60">Alertas abiertas</p>
                  <p className="text-xl font-semibold text-slate-100 mt-1">{data.contexto_anomalia.alertas_abiertas}</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-3 border border-amber-500/10">
                  <p className="text-xs text-amber-200/60">Tipos frecuentes</p>
                  {frequentTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {frequentTypes.map((type, idx) => (
                        <Badge key={`${type}-${idx}`} variant="outline" className="bg-amber-500/10 text-amber-200 border-amber-500/30">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-100 mt-2">—</p>
                  )}
                </div>
              </div>
            </Card>

            {level === 'high' && (
              <div className="flex items-start gap-2 text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-sm">
                  Riesgo de nivel alto. Se recomienda priorizar seguimiento operativo.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
