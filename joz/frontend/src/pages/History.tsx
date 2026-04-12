import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getHistorial } from '../services/api';

const categorizar = (descripcion: string) => {
  const d = descripcion?.toLowerCase() ?? '';
  if (d.includes('empeño')) return 'Empeño';
  if (d.includes('retira')) return 'Retiro';
  if (d.includes('abona') || d.includes('paga')) return 'Abono';
  if (d.includes('apertura')) return 'Apertura';
  if (d.includes('cierre')) return 'Cierre';
  return 'Otro';
};

const tipoColors: Record<string, string> = {
  Empeño: 'bg-purple-100 text-purple-700',
  Retiro: 'bg-orange-100 text-orange-700',
  Abono: 'bg-blue-100 text-blue-700',
  Apertura: 'bg-green-100 text-green-700',
  Cierre: 'bg-gray-200 text-gray-700',
  Otro: 'bg-gray-100 text-gray-700',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(n);

export default function History() {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  async function fetchData() {
    const data = await getHistorial({
      page: 1,
      page_size: 100,
      q: searchTerm || undefined,
    });

    const results = data.results ?? [];

    setHistoryData(
      results.map((item: any) => ({
        ...item,
        categoria: categorizar(item.descripcion),
      }))
    );
  }

  return (
    <div className="space-y-6">

      <h1 className="text-3xl font-light">Historial</h1>

      <Card className="p-4 flex gap-3">
        <Search className="w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Card>

      <Card>
        <table className="w-full text-sm">

          <thead className="bg-gray-50 border-b">
            <tr>
              <th>Ref</th>
              <th>Fecha</th>
              <th>Almacén</th>
              <th>Operación</th>
              <th>Cliente</th>
              <th>Descripción</th>
              <th>Cajero</th>
              <th className="text-right">Entrada</th>
              <th className="text-right">Salida</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {historyData.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">

                <td>{r.referencia}</td>
                <td>{r.date}</td>
                <td>{r.store}</td>

                <td>
                  <Badge className={tipoColors[r.categoria]}>
                    {r.categoria}
                  </Badge>
                </td>

                <td>{r.cliente}</td>

                <td className="text-xs max-w-xs truncate">
                  {r.descripcion}
                </td>

                <td>{r.analista}</td>

                {/* 🔥 COLOR VERDE */}
                <td className="text-right text-green-700 font-medium">
                  {r.entrada > 0 ? fmt(r.entrada) : '—'}
                </td>

                {/* 🔥 COLOR ROJO */}
                <td className="text-right text-red-700 font-medium">
                  {r.salida > 0 ? fmt(r.salida) : '—'}
                </td>

              </tr>
            ))}
          </tbody>

        </table>
      </Card>
    </div>
  );
}