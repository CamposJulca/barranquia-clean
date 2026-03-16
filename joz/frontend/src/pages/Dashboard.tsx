import { StatCard } from '../components/StatCard';
import { RiskCard } from '../components/RiskCard';
import { AnomalyChart } from '../components/AnomalyChart';
import { AlertsTable, Alert } from '../components/AlertsTable';
import { Card } from '../components/ui/card';
import { Bell, TrendingUp, Activity, AlertTriangle } from 'lucide-react';

// Mock data
const chartData = [
  { date: '10 Mar', anomalies: 12 },
  { date: '11 Mar', anomalies: 19 },
  { date: '12 Mar', anomalies: 15 },
  { date: '13 Mar', anomalies: 22 },
  { date: '14 Mar', anomalies: 18 },
  { date: '15 Mar', anomalies: 25 },
  { date: '16 Mar', anomalies: 20 },
];

const stores = [
  { name: 'Tienda Centro', riskLevel: 'high' as const, anomalyCount: 15 },
  { name: 'Tienda Norte', riskLevel: 'medium' as const, anomalyCount: 8 },
  { name: 'Tienda Sur', riskLevel: 'low' as const, anomalyCount: 3 },
  { name: 'Tienda Este', riskLevel: 'medium' as const, anomalyCount: 7 },
  { name: 'Tienda Oeste', riskLevel: 'high' as const, anomalyCount: 12 },
  { name: 'Tienda Plaza', riskLevel: 'low' as const, anomalyCount: 2 },
];

const recentAlerts: Alert[] = [
  {
    id: 'ALR-001',
    date: '16/03/2026',
    store: 'Tienda Centro',
    anomalyType: 'Transacción inusual',
    amount: 15000,
    riskLevel: 'high',
    status: 'pending',
  },
  {
    id: 'ALR-002',
    date: '16/03/2026',
    store: 'Tienda Norte',
    anomalyType: 'Devolución atípica',
    amount: 8500,
    riskLevel: 'medium',
    status: 'reviewed',
  },
  {
    id: 'ALR-003',
    date: '15/03/2026',
    store: 'Tienda Este',
    anomalyType: 'Descuento excesivo',
    amount: 12000,
    riskLevel: 'medium',
    status: 'pending',
  },
  {
    id: 'ALR-004',
    date: '15/03/2026',
    store: 'Tienda Oeste',
    anomalyType: 'Horario fuera de rango',
    amount: 9200,
    riskLevel: 'high',
    status: 'resolved',
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Dashboard</h1>
        <p className="text-gray-500 mt-1">Resumen general del sistema de monitoreo</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Alertas Hoy"
          value={24}
          icon={Bell}
          trend={{ value: '+12% vs ayer', isPositive: false }}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Riesgo Promedio"
          value="Medio"
          icon={TrendingUp}
          trend={{ value: 'Estable', isPositive: true }}
          iconColor="text-orange-600"
        />
        <StatCard
          title="Transacciones Analizadas"
          value="1,284"
          icon={Activity}
          trend={{ value: '+8% vs ayer', isPositive: true }}
          iconColor="text-green-600"
        />
        <StatCard
          title="Anomalías Detectadas"
          value={20}
          icon={AlertTriangle}
          trend={{ value: '+15% vs ayer', isPositive: false }}
          iconColor="text-red-600"
        />
      </div>

      {/* Chart */}
      <AnomalyChart data={chartData} />

      {/* Risk by Store */}
      <div>
        <h2 className="text-xl font-medium mb-4">Riesgo por Tienda</h2>
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

      {/* Recent Alerts */}
      <div>
        <h2 className="text-xl font-medium mb-4">Alertas Recientes</h2>
        <Card>
          <AlertsTable alerts={recentAlerts} />
        </Card>
      </div>
    </div>
  );
}
