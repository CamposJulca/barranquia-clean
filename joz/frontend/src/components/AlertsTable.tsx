import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Eye } from 'lucide-react'
import { RiskLevel } from './RiskCard'

export type Alert = {
  id: string
  date: string
  store: string
  anomalyType: string
  amount: number
  riskLevel: RiskLevel
  status: 'pending' | 'reviewed' | 'resolved'
}

interface AlertsTableProps {
  alerts: Alert[]
  onViewDetail?: (alertId: string) => void
}

const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-orange-100 text-orange-800 border-orange-200',
  high: 'bg-red-100 text-red-800 border-red-200'
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  reviewed: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-gray-100 text-gray-800 border-gray-200'
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  reviewed: 'Revisado',
  resolved: 'Resuelto'
}

const riskLabels: Record<string, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto'
}

export function AlertsTable({ alerts, onViewDetail }: AlertsTableProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No hay alertas disponibles
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 text-sm text-gray-600">ID</th>
            <th className="text-left px-4 py-3 text-sm text-gray-600">Fecha</th>
            <th className="text-left px-4 py-3 text-sm text-gray-600">Tienda</th>
            <th className="text-left px-4 py-3 text-sm text-gray-600">Tipo de Anomalía</th>
            <th className="text-left px-4 py-3 text-sm text-gray-600">Monto</th>
            <th className="text-left px-4 py-3 text-sm text-gray-600">Riesgo</th>
            <th className="text-left px-4 py-3 text-sm text-gray-600">Estado</th>
            <th className="text-left px-4 py-3 text-sm text-gray-600">Acción</th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {alerts.map((alert) => {
            const risk = alert.riskLevel || 'low'
            const status = alert.status || 'pending'

            return (
              <tr key={alert.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{alert.id}</td>

                <td className="px-4 py-3 text-sm text-gray-600">
                  {alert.date || '-'}
                </td>

                <td className="px-4 py-3 text-sm">
                  {alert.store || 'N/A'}
                </td>

                <td className="px-4 py-3 text-sm">
                  {alert.anomalyType || 'Sin descripción'}
                </td>

                <td className="px-4 py-3 text-sm">
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