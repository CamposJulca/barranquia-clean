import { useEffect, useState } from 'react';
import { getStats } from '../services/api';
import { RiskCard } from '../components/RiskCard';
import { Card } from '../components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Badge } from '../components/ui/badge';

type Store = {
  id: number;
  nombre: string;
  codigo: string;
  ciudad: string;
  nivel_riesgo: 'low' | 'medium' | 'high';
  anomalias_count: number;
  activa: boolean;
};

export default function Risks() {
  const [stores, setStores] = useState<Store[]>([]);
  const [topStores, setTopStores] = useState<Store[]>([]);
  const [riskDistribution, setRiskDistribution] = useState([
    { name: 'Riesgo Alto', value: 0, color: '#ef4444' },
    { name: 'Riesgo Medio', value: 0, color: '#f97316' },
    { name: 'Riesgo Bajo', value: 0, color: '#22c55e' },
  ]);

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

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await getStats();
        const data = response.data;

        // Todas las tiendas
        setStores(data.tiendas);

        // Top 5
        setTopStores(data.top5);

        // Distribución de riesgos
        const highCount = data.tiendas.filter((t: Store) => t.nivel_riesgo === 'high').length;
        const mediumCount = data.tiendas.filter((t: Store) => t.nivel_riesgo === 'medium').length;
        const lowCount = data.tiendas.filter((t: Store) => t.nivel_riesgo === 'low').length;

        setRiskDistribution([
          { name: 'Riesgo Alto', value: highCount, color: '#ef4444' },
          { name: 'Riesgo Medio', value: mediumCount, color: '#f97316' },
          { name: 'Riesgo Bajo', value: lowCount, color: '#22c55e' },
        ]);
      } catch (error) {
        console.error('Error al cargar los datos de riesgos', error);
      }
    }

    fetchData();
  }, []);

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
            {topStores.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{item.nombre}</p>
                    <p className="text-sm text-gray-500">{item.anomalias_count} anomalías</p>
                  </div>
                </div>
                <Badge variant="outline" className={riskColors[item.nivel_riesgo]}>
                  {riskLabels[item.nivel_riesgo]}
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
              key={store.id}
              storeName={store.nombre}
              riskLevel={store.nivel_riesgo}
              anomalyCount={store.anomalias_count}
            />
          ))}
        </div>
      </div>
    </div>
  );
}