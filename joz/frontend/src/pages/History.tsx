import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Download, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getHistorial } from '../services/api';

interface HistoryRecord {
  id: number;
  date: string;
  store: string;
  anomalyType: string;
  amount: number;
  entrada: number;
  salida: number;
  estado: string;
  analista: string;
  referencia: string;
  cliente: string;
  numero_identificacion: string;
  descripcion: string;
}

const tipoColors: Record<string, string> = {
  Aporte:  'bg-emerald-100 text-emerald-800 border-emerald-200',
  Retiro:  'bg-orange-100 text-orange-800 border-orange-200',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-PA', { style: 'currency', currency: 'USD' }).format(n);

export default function History() {
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  async function fetchData() {
    setLoading(true);
    try {
      const response = await getHistorial({ page: 1, page_size: 50, q: searchTerm || undefined });
      const payload  = response.data?.data ?? response.data ?? {};
      const results  = payload.results ?? [];
      setTotal(response.data?.count ?? payload.count ?? results.length);
      setHistoryData(results.map((item: any) => ({
        ...item,
        amount:  Number(item.amount),
        entrada: Number(item.entrada ?? 0),
        salida:  Number(item.salida  ?? 0),
      })));
    } catch (error) {
      console.error('Error al cargar historial', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light">Historial</h1>
          <p className="text-gray-500 mt-1">Transacciones SuperEfectivo</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Búsqueda */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por cliente, referencia, cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 border-0 shadow-none focus-visible:ring-0 p-0"
          />
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {loading ? 'Cargando...' : `${historyData.length} de ${total.toLocaleString()} registros`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Referencia</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Almacén</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Tipo</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Entrada</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Salida</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Cajero</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {historyData.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors" title={record.descripcion}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{record.referencia}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{record.date}</td>
                  <td className="px-4 py-3">{record.store}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{record.cliente}</div>
                    <div className="text-xs text-gray-400">{record.numero_identificacion}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={tipoColors[record.anomalyType] ?? 'bg-gray-100 text-gray-700'}>
                      {record.anomalyType}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700 font-medium">
                    {record.entrada > 0 ? fmt(record.entrada) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-700 font-medium">
                    {record.salida > 0 ? fmt(record.salida) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{record.analista}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && historyData.length === 0 && (
            <div className="text-center py-12 text-gray-400">Sin resultados</div>
          )}
        </div>
      </Card>
    </div>
  );
}
