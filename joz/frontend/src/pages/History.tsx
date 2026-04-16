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
  Empeño: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  Retiro: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  Abono: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  Apertura: 'bg-green-500/20 text-green-300 border border-green-500/30',
  Cierre: 'bg-slate-600/40 text-slate-300 border border-slate-500/30',
  Otro: 'bg-slate-700/40 text-slate-400 border border-slate-600/30',
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

      <h1 className="text-2xl font-bold text-white">Historial</h1>

      <Card className="bg-slate-900 border-amber-500/20 p-4 flex gap-3">
        <Search className="w-4 h-4 text-amber-400" />
        <Input
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-950 border-amber-500/30 text-amber-100 placeholder:text-amber-200/30"
        />
      </Card>

      <Card className="bg-slate-900 border-amber-500/20">
        <table className="w-full text-sm">

          <thead className="bg-slate-800 border-b border-slate-700">
            <tr className="text-amber-200/60">
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

          <tbody className="divide-y divide-slate-800">
            {historyData.map((r) => (
              <tr key={r.id} className="text-slate-300 hover:bg-slate-800/60 transition-colors">

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
                <td className="text-right text-green-400 font-medium">
                  {r.entrada > 0 ? fmt(r.entrada) : '—'}
                </td>

                <td className="text-right text-red-400 font-medium">
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