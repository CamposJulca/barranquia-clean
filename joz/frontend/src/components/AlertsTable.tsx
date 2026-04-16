import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Eye } from 'lucide-react'
import { RiskLevel } from './RiskCard'

export type Alert = {
  id: string
  date: string
  store: string
  storeCode?: number | null
  anomalyType: string
  amount: number
  riskLevel: RiskLevel
  status: 'pending' | 'reviewed' | 'resolved' | 'abierta' | 'en_revision' | 'resuelta' | 'descartada'
}

interface AlertsTableProps {
  alerts: Alert[]
  onViewDetail?: (alertId: string) => void
}

const riskColors: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  medium: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  high: 'bg-red-500/10 text-red-300 border-red-500/30'
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  reviewed: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  resolved: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  abierta: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  en_revision: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  resuelta: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  descartada: 'bg-slate-500/10 text-slate-300 border-slate-500/30'
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  reviewed: 'Revisado',
  resolved: 'Resuelto',
  abierta: 'Abierta',
  en_revision: 'En revisión',
  resuelta: 'Resuelta',
  descartada: 'Descartada'
}

const riskLabels: Record<string, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto'
}

export function AlertsTable({ alerts, onViewDetail }: AlertsTableProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="p-6 text-center text-amber-200/60">
        No hay alertas disponibles
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-slate-950/80 border-b border-amber-500/20">
          <tr>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">ID</th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Fecha</th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Tienda</th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Tipo de Anomalía</th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Monto</th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Riesgo</th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Estado</th>
            <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Acción</th>
          </tr>
        </thead>

        <tbody className="bg-slate-900 divide-y divide-amber-500/10">
          {alerts.map((alert) => {
            const risk = alert.riskLevel || 'low'
            const status = alert.status || 'pending'

            return (
              <tr key={alert.id} className="hover:bg-slate-800/60 transition-colors">
                <td className="px-4 py-3 text-sm text-amber-100">{alert.id}</td>

                <td className="px-4 py-3 text-sm text-amber-200/70">
                  {alert.date || '-'}
                </td>

                <td className="px-4 py-3 text-sm text-amber-100">
                  {alert.store || 'N/A'}
                </td>

                <td className="px-4 py-3 text-sm">
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-200 border-amber-500/30"
                  >
                    {alert.anomalyType || '—'}
                  </Badge>
                </td>

                <td className="px-4 py-3 text-sm text-amber-100">
                  ${alert.amount?.toLocaleString() || 0}
                </td>

                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={riskColors[risk] || riskColors.low}
                  >
                    {riskLabels[risk] || 'Bajo'}
                  </Badge>
                </td>

                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={statusColors[status] || statusColors.pending}
                  >
                    {statusLabels[status] || 'Pendiente'}
                  </Badge>
                </td>

                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetail?.(alert.id)}
                    className="text-amber-200 hover:text-amber-100 hover:bg-amber-500/10"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
