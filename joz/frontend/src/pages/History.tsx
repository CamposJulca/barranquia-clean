import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Calendar, Download } from 'lucide-react';
import { useState } from 'react';

interface HistoryRecord {
  id: string;
  date: string;
  store: string;
  anomalyType: string;
  amount: number;
  result: string;
  status: 'false_positive' | 'confirmed' | 'investigating';
}

const historyData: HistoryRecord[] = [
  {
    id: 'HST-001',
    date: '16/03/2026 14:32',
    store: 'Tienda Centro',
    anomalyType: 'Transacción inusual',
    amount: 15000,
    result: 'Fraude confirmado',
    status: 'confirmed',
  },
  {
    id: 'HST-002',
    date: '16/03/2026 12:15',
    store: 'Tienda Norte',
    anomalyType: 'Devolución atípica',
    amount: 8500,
    result: 'Falso positivo',
    status: 'false_positive',
  },
  {
    id: 'HST-003',
    date: '15/03/2026 18:45',
    store: 'Tienda Este',
    anomalyType: 'Descuento excesivo',
    amount: 12000,
    result: 'En investigación',
    status: 'investigating',
  },
  {
    id: 'HST-004',
    date: '15/03/2026 16:20',
    store: 'Tienda Oeste',
    anomalyType: 'Horario fuera de rango',
    amount: 9200,
    result: 'Error del sistema',
    status: 'false_positive',
  },
  {
    id: 'HST-005',
    date: '15/03/2026 11:05',
    store: 'Tienda Sur',
    anomalyType: 'Múltiples transacciones',
    amount: 6800,
    result: 'Comportamiento normal',
    status: 'false_positive',
  },
  {
    id: 'HST-006',
    date: '14/03/2026 19:30',
    store: 'Tienda Plaza',
    anomalyType: 'Transacción sospechosa',
    amount: 11500,
    result: 'Fraude confirmado',
    status: 'confirmed',
  },
  {
    id: 'HST-007',
    date: '14/03/2026 15:10',
    store: 'Tienda Centro',
    anomalyType: 'Cambio de precio',
    amount: 7200,
    result: 'Acción correctiva aplicada',
    status: 'confirmed',
  },
  {
    id: 'HST-008',
    date: '14/03/2026 10:45',
    store: 'Tienda Norte',
    anomalyType: 'Cancelación masiva',
    amount: 5400,
    result: 'Falso positivo',
    status: 'false_positive',
  },
  {
    id: 'HST-009',
    date: '13/03/2026 17:25',
    store: 'Tienda Este',
    anomalyType: 'Usuario no autorizado',
    amount: 13600,
    result: 'Acceso bloqueado',
    status: 'confirmed',
  },
  {
    id: 'HST-010',
    date: '13/03/2026 13:50',
    store: 'Tienda Oeste',
    anomalyType: 'Patrón inusual',
    amount: 9800,
    result: 'En investigación',
    status: 'investigating',
  },
];

const statusColors = {
  false_positive: 'bg-gray-100 text-gray-800 border-gray-200',
  confirmed: 'bg-red-100 text-red-800 border-red-200',
  investigating: 'bg-blue-100 text-blue-800 border-blue-200',
};

const statusLabels = {
  false_positive: 'Falso Positivo',
  confirmed: 'Confirmado',
  investigating: 'Investigando',
};

export default function History() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = historyData.filter(record =>
    record.store.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.anomalyType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl">Historial</h1>
          <p className="text-gray-500 mt-1">Historial completo de anomalías detectadas</p>
        </div>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-500" />
          <Input
            type="text"
            placeholder="Buscar en historial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline">Filtrar por fecha</Button>
        </div>
      </Card>

      {/* History Table */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Mostrando {filteredHistory.length} de {historyData.length} registros
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm text-gray-600">ID</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600">Fecha y Hora</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600">Tienda</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600">Tipo de Anomalía</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600">Monto</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600">Resultado</th>
                <th className="text-left px-4 py-3 text-sm text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{record.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.date}</td>
                  <td className="px-4 py-3 text-sm">{record.store}</td>
                  <td className="px-4 py-3 text-sm">{record.anomalyType}</td>
                  <td className="px-4 py-3 text-sm">${record.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{record.result}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusColors[record.status]}>
                      {statusLabels[record.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
