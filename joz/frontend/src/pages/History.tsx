import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Calendar, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getHistorial } from '../services/api';

type ResultadoType = 'false_positive' | 'confirmed' | 'investigating';

interface HistoryRecord {
  id: number;
  date: string;
  store: string;
  anomalyType: string;
  amount: number;
  resultado: ResultadoType; // aquí usamos el tipo exacto
  estado: string;
  analista: string;
}

const statusColors: Record<ResultadoType, string> = {
  false_positive: 'bg-gray-100 text-gray-800 border-gray-200',
  confirmed: 'bg-red-100 text-red-800 border-red-200',
  investigating: 'bg-blue-100 text-blue-800 border-blue-200',
};

const statusLabels: Record<ResultadoType, string> = {
  false_positive: 'Falso Positivo',
  confirmed: 'Confirmado',
  investigating: 'Investigando',
};

export default function History() {
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await getHistorial({ page: 1, page_size: 20 });
        const data: HistoryRecord[] = response.data.results.map((item: any) => ({
          ...item,
          amount: Number(item.amount),
          resultado: item.resultado as ResultadoType, // casteamos al tipo correcto
        }));
        setHistoryData(data);
      } catch (error) {
        console.error('Error al cargar historial', error);
      }
    }

    fetchData();
  }, []);

  const filteredHistory = historyData.filter(record =>
    record.store.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.anomalyType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.id.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
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
                <th className="text-left px-4 py-3 text-sm text-gray-600">Analista</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{record.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(record.date).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{record.store}</td>
                  <td className="px-4 py-3 text-sm">{record.anomalyType}</td>
                  <td className="px-4 py-3 text-sm">${record.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant="outline" className={statusColors[record.resultado]}>
                      {statusLabels[record.resultado]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">{record.estado}</td>
                  <td className="px-4 py-3 text-sm">{record.analista}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}