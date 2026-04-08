import { Card } from './ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

interface DayData {
  date: string;
  anomalies?: number;
  aportes?: number;
  retiros?: number;
  monto?: number;
}

interface AnomalyChartProps {
  data: DayData[];
}

const formatDate = (d: string) => {
  const [, mes, day] = d.split('-');
  const meses: Record<string, string> = {
    '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May',
    '06':'Jun','07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic'
  };
  return `${parseInt(day)} ${meses[mes] ?? mes}`;
};

export function AnomalyChart({ data }: AnomalyChartProps) {
  const hasRealData = data.some(d => (d.aportes ?? 0) > 0 || (d.retiros ?? 0) > 0);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-1">Transacciones Diarias — Últimos 7 días</h3>
      <p className="text-sm text-gray-500 mb-4">Aportes y Retiros por día</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
          />
          <Tooltip
            labelFormatter={formatDate}
            formatter={(value: number, name: string) => [
              value.toLocaleString('es-PA'),
              name === 'aportes' ? 'Aportes' : name === 'retiros' ? 'Retiros' : 'Total'
            ]}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '13px'
            }}
          />
          <Legend formatter={(v) => v === 'aportes' ? 'Aportes' : 'Retiros'} />
          {hasRealData ? (
            <>
              <Bar dataKey="aportes" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="retiros" fill="#f97316" radius={[3, 3, 0, 0]} />
            </>
          ) : (
            <Bar dataKey="anomalies" fill="#2563eb" radius={[3, 3, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
