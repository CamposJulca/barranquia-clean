import { Card } from './ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

interface DayData {
  date: string
  aportes: number
  retiros: number
}

interface AnomalyChartProps {
  data: DayData[]
}

const formatDate = (d: any) => {
  if (!d) return ''

  const parts = String(d).split('-')
  if (parts.length < 3) return d

  const mes = parts[1]
  const day = parts[2]

  const meses: Record<string, string> = {
    '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May',
    '06':'Jun','07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic'
  }

  return `${parseInt(day)} ${meses[mes] ?? mes}`
}

export function AnomalyChart({ data }: AnomalyChartProps) {

  // 🔥 validar data
  const safeData = Array.isArray(data) ? data : []

  return (
    <Card className="p-6">

      <h3 className="text-lg font-medium mb-1">
        Transacciones Diarias
      </h3>

      <p className="text-sm text-gray-500 mb-4">
        Aportes vs Retiros por día
      </p>

      <ResponsiveContainer width="100%" height={300}>

        <BarChart
          data={safeData}
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        >

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#6b7280"
          />

          <YAxis
            stroke="#6b7280"
            tickFormatter={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
            }
          />

          <Tooltip
  labelFormatter={(label: any) => formatDate(label)}
  formatter={(value: any, name: any) => [
    Number(value ?? 0).toLocaleString('es-CO'),
    name === 'aportes' ? 'Aportes' : 'Retiros'
  ]}
/>

          <Legend
            formatter={(v) =>
              v === 'aportes' ? 'Aportes' : 'Retiros'
            }
          />

          {/* 🔥 BARRAS */}
          <Bar dataKey="aportes" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="retiros" fill="#f97316" radius={[4, 4, 0, 0]} />

        </BarChart>

      </ResponsiveContainer>

    </Card>
  )
}