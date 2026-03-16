import { useState } from 'react';
import { AlertsTable, Alert } from '../components/AlertsTable';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Filter } from 'lucide-react';

// Mock data
const allAlerts: Alert[] = [
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
  {
    id: 'ALR-005',
    date: '15/03/2026',
    store: 'Tienda Sur',
    anomalyType: 'Múltiples transacciones',
    amount: 6800,
    riskLevel: 'low',
    status: 'reviewed',
  },
  {
    id: 'ALR-006',
    date: '14/03/2026',
    store: 'Tienda Plaza',
    anomalyType: 'Transacción sospechosa',
    amount: 11500,
    riskLevel: 'high',
    status: 'pending',
  },
  {
    id: 'ALR-007',
    date: '14/03/2026',
    store: 'Tienda Centro',
    anomalyType: 'Cambio de precio',
    amount: 7200,
    riskLevel: 'medium',
    status: 'resolved',
  },
  {
    id: 'ALR-008',
    date: '14/03/2026',
    store: 'Tienda Norte',
    anomalyType: 'Cancelación masiva',
    amount: 5400,
    riskLevel: 'low',
    status: 'reviewed',
  },
  {
    id: 'ALR-009',
    date: '13/03/2026',
    store: 'Tienda Este',
    anomalyType: 'Usuario no autorizado',
    amount: 13600,
    riskLevel: 'high',
    status: 'resolved',
  },
  {
    id: 'ALR-010',
    date: '13/03/2026',
    store: 'Tienda Oeste',
    anomalyType: 'Patrón inusual',
    amount: 9800,
    riskLevel: 'medium',
    status: 'pending',
  },
];

export default function Alerts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');

  const filteredAlerts = allAlerts.filter(alert => {
    const matchesSearch = 
      alert.store.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.anomalyType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRisk = riskFilter === 'all' || alert.riskLevel === riskFilter;
    const matchesStore = storeFilter === 'all' || alert.store === storeFilter;

    return matchesSearch && matchesRisk && matchesStore;
  });

  const stores = Array.from(new Set(allAlerts.map(a => a.store)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Alertas</h1>
        <p className="text-gray-500 mt-1">Gestión completa de alertas del sistema</p>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="text"
              placeholder="Buscar por tienda, tipo o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por riesgo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los niveles</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="medium">Medio</SelectItem>
                <SelectItem value="low">Bajo</SelectItem>
              </SelectContent>
            </Select>

            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tienda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las tiendas</SelectItem>
                {stores.map(store => (
                  <SelectItem key={store} value={store}>{store}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {(searchTerm || riskFilter !== 'all' || storeFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setRiskFilter('all');
                setStoreFilter('all');
              }}
            >
              Limpiar
            </Button>
          )}
        </div>
      </Card>

      {/* Results */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Mostrando {filteredAlerts.length} de {allAlerts.length} alertas
          </p>
        </div>
        <AlertsTable alerts={filteredAlerts} />
      </Card>
    </div>
  );
}
