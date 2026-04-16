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
    <Card className="p-6 bg-slate-900 border-amber-500/20">

      <h3 className="text-lg font-medium text-white mb-1">
        Transacciones Diarias
      </h3>

      <p className="text-sm text-amber-200/60 mb-4">
        Aportes vs Retiros por día
      </p>

      <ResponsiveContainer width="100%" height={300}>

        <BarChart
          data={safeData}
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        >

          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#94a3b8"
          />

          <YAxis
            stroke="#94a3b8"
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
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#f59e0b55',
              color: '#f8fafc'
            }}
          />

          <Legend
            formatter={(v) =>
              v === 'aportes' ? 'Aportes' : 'Retiros'
            }
            wrapperStyle={{ color: '#cbd5e1' }}
          />

          {/* 🔥 BARRAS */}
          <Bar dataKey="aportes" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="retiros" fill="#f97316" radius={[4, 4, 0, 0]} />

        </BarChart>

      </ResponsiveContainer>

    </Card>
  )
}
