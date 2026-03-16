import { RiskCard } from '../components/RiskCard';
import { Card } from '../components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Badge } from '../components/ui/badge';

// Mock data
const stores = [
  { name: 'Tienda Centro', riskLevel: 'high' as const, anomalyCount: 15 },
  { name: 'Tienda Norte', riskLevel: 'medium' as const, anomalyCount: 8 },
  { name: 'Tienda Sur', riskLevel: 'low' as const, anomalyCount: 3 },
  { name: 'Tienda Este', riskLevel: 'medium' as const, anomalyCount: 7 },
  { name: 'Tienda Oeste', riskLevel: 'high' as const, anomalyCount: 12 },
  { name: 'Tienda Plaza', riskLevel: 'low' as const, anomalyCount: 2 },
  { name: 'Tienda Mall', riskLevel: 'medium' as const, anomalyCount: 9 },
  { name: 'Tienda Express', riskLevel: 'high' as const, anomalyCount: 13 },
  { name: 'Tienda Centro Comercial', riskLevel: 'low' as const, anomalyCount: 4 },
];

const riskDistribution = [
  { name: 'Riesgo Alto', value: 3, color: '#ef4444' },
  { name: 'Riesgo Medio', value: 3, color: '#f97316' },
  { name: 'Riesgo Bajo', value: 3, color: '#22c55e' },
];

const ranking = [
  { position: 1, store: 'Tienda Centro', anomalies: 15, riskLevel: 'high' as const },
  { position: 2, store: 'Tienda Express', anomalies: 13, riskLevel: 'high' as const },
  { position: 3, store: 'Tienda Oeste', anomalies: 12, riskLevel: 'high' as const },
  { position: 4, store: 'Tienda Mall', anomalies: 9, riskLevel: 'medium' as const },
  { position: 5, store: 'Tienda Norte', anomalies: 8, riskLevel: 'medium' as const },
];

const riskColors = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-orange-100 text-orange-800 border-orange-200',
  high: 'bg-red-100 text-red-800 border-red-200'
};

const riskLabels = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto'
};

export default function Risks() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Riesgos</h1>
        <p className="text-gray-500 mt-1">Análisis de riesgo por sucursales</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Distribución de Riesgos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent = 0 }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Stores Ranking */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Ranking: Tiendas con Más Anomalías</h3>
          <div className="space-y-3">
            {ranking.map((item) => (
              <div
                key={item.position}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold">
                    {item.position}
                  </div>
                  <div>
                    <p className="font-medium">{item.store}</p>
                    <p className="text-sm text-gray-500">{item.anomalies} anomalías</p>
                  </div>
                </div>
                <Badge variant="outline" className={riskColors[item.riskLevel]}>
                  {riskLabels[item.riskLevel]}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Stores Grid */}
      <div>
        <h2 className="text-xl font-medium mb-4">Todas las Sucursales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <RiskCard
              key={store.name}
              storeName={store.name}
              riskLevel={store.riskLevel}
              anomalyCount={store.anomalyCount}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
