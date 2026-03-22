import { Card } from './ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnomalyChartProps {
  data: { date: string; anomalies: number }[];
}

export function AnomalyChart({ data }: AnomalyChartProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">Anomalías Detectadas - Últimos 7 días</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="anomalies" 
            stroke="#2563eb" 
            strokeWidth={2}
            dot={{ fill: '#2563eb', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
