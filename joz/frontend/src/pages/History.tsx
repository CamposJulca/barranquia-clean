import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
  Aporte: 'bg-green-500/20 text-green-300 border border-green-500/30',
  Retiro: 'bg-red-500/20 text-red-300 border border-red-500/30',
  Empeño: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  Abono: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  Apertura: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  Cierre: 'bg-slate-600/40 text-slate-300 border border-slate-500/30',
  Otro: 'bg-slate-700/40 text-slate-400 border border-slate-600/30',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(n);

const resolverCategoria = (anomalyType: string, descripcion: string) => {
  if (anomalyType && anomalyType !== 'Sin tipo') return anomalyType;
  return categorizar(descripcion);
};

type OrigenFilter = 'todos' | 'real' | 'prueba';

interface HistoryRow {
  id: number;
  date: string;
  store: string;
  anomalyType: string;
  entrada: number | null;
  salida: number | null;
  estado: string;
  analista: string;
  referencia: string;
  cliente: string;
  descripcion: string;
  categoria: string;
}

const PAGE_SIZE = 50;

export default function History() {
  const [historyData, setHistoryData] = useState<HistoryRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [origenFilter, setOrigenFilter] = useState<OrigenFilter>('todos');
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHistorial({
        page,
        page_size: PAGE_SIZE,
        q: debouncedSearch || undefined,
        origen: origenFilter !== 'todos' ? origenFilter : undefined,
      });

      const results = data?.results ?? [];
      setCount(data?.count ?? 0);

      setHistoryData(
        results.map((item: any) => ({
          ...item,
          categoria: resolverCategoria(item.anomalyType, item.descripcion),
        }))
      );
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? 'Error al cargar historial.';
      setError(msg);
      setHistoryData([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, origenFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold text-white">Historial</h1>

      <Card className="bg-slate-900 border-amber-500/20 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Search className="w-4 h-4 text-amber-400 shrink-0" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 min-w-[180px] bg-slate-950 border-amber-500/30 text-amber-100 placeholder:text-amber-200/30"
          />
          <Select
            value={origenFilter}
            onValueChange={(value) => {
              setOrigenFilter(value as OrigenFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44 bg-slate-950 border-amber-500/30 text-amber-100">
              <SelectValue placeholder="Origen de datos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="real">Solo reales</SelectItem>
              <SelectItem value="prueba">Solo prueba</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading && (
        <Card className="bg-slate-900 border-amber-500/20 p-10 flex items-center justify-center gap-3 text-amber-200/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Cargando historial...</span>
        </Card>
      )}

      {!loading && error && (
        <Card className="bg-red-500/10 border-red-500/30 p-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <p className="text-red-300 font-medium">Error al cargar historial</p>
            <p className="text-red-400/80 text-sm mt-0.5">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="ml-auto border-red-500/30 text-red-300 hover:bg-red-500/10"
          >
            Reintentar
          </Button>
        </Card>
      )}

      {!loading && !error && historyData.length === 0 && (
        <Card className="bg-slate-900 border-amber-500/20 p-10 text-center">
          <p className="text-amber-200/60 font-medium">No se encontraron registros con los filtros aplicados.</p>
        </Card>
      )}

      {!loading && !error && historyData.length > 0 && (
        <Card className="bg-slate-900 border-amber-500/20">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-950/80 border-b border-amber-500/20">
                <tr>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Ref</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Almacén</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Operación</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Descripción</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Cajero</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Entrada</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Salida</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-amber-500/10">
                {historyData.map((r) => (
                  <tr key={r.id} className="text-slate-300 hover:bg-slate-800/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{r.referencia || '—'}</span>
                        {r.estado === 'seed' && (
                          <span className="text-xs text-slate-400 italic">[prueba]</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-amber-200/70">{r.date || '—'}</td>
                    <td className="px-4 py-3">{r.store || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={tipoColors[r.categoria] || tipoColors.Otro}>
                        {r.categoria}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{r.cliente || '—'}</td>
                    <td className="px-4 py-3 text-xs max-w-xs truncate">{r.descripcion || '—'}</td>
                    <td className="px-4 py-3">{r.analista || '—'}</td>
                    <td className="px-4 py-3 text-right text-green-400 font-medium">
                      {Number(r.entrada) > 0 ? fmt(Number(r.entrada)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-red-400 font-medium">
                      {Number(r.salida) > 0 ? fmt(Number(r.salida)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-amber-500/10">
            <span className="text-xs text-amber-200/60">
              Página {page} de {totalPages} · {count} registros
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canGoPrev}
                className="border-amber-500/30 text-amber-200 hover:bg-amber-500/10"
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={!canGoNext}
                className="border-amber-500/30 text-amber-200 hover:bg-amber-500/10"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
