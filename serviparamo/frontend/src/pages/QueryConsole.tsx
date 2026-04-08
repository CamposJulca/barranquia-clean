import { useState, useRef, KeyboardEvent } from "react";
import { Play, RotateCcw, Terminal, Clock, Hash, AlertCircle, ChevronDown } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import api from "../services/api";

const EXAMPLE_QUERIES = [
  {
    label: "SKUs por familia",
    sql: `SELECT familia, COUNT(*) AS total
FROM serviparamo_catalogo_skus
GROUP BY familia
ORDER BY total DESC
LIMIT 20`,
  },
  {
    label: "Duplicados detectados",
    sql: `SELECT codigo, nombre, familia, grupo_duplicado
FROM serviparamo_catalogo_skus
WHERE es_duplicado = true
ORDER BY grupo_duplicado, codigo
LIMIT 100`,
  },
  {
    label: "Órdenes de compra recientes",
    sql: `SELECT numfac, proveedor_id, fecha_oc, estado
FROM serviparamo_raw_ordenes_encabezado
ORDER BY fecha_oc DESC NULLS LAST
LIMIT 50`,
  },
  {
    label: "Compras por proveedor",
    sql: `SELECT proveedor_id, COUNT(*) AS total_oc
FROM serviparamo_raw_ordenes_encabezado
GROUP BY proveedor_id
ORDER BY total_oc DESC
LIMIT 20`,
  },
  {
    label: "Pedidos por estado",
    sql: `SELECT estado, COUNT(*) AS total
FROM serviparamo_raw_pedidos_encabezado
GROUP BY estado
ORDER BY total DESC`,
  },
  {
    label: "Movimientos de Kardex",
    sql: `SELECT nomsis, codigo_item, cantidad, fecha_mov
FROM serviparamo_raw_kardex
ORDER BY fecha_mov DESC NULLS LAST
LIMIT 50`,
  },
  {
    label: "Tablas disponibles",
    sql: `SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'serviparamo_%'
ORDER BY table_name`,
  },
];

interface QueryResult {
  columns: string[];
  rows: (string | number | null)[][];
  row_count: number;
  elapsed_ms: number;
}

export default function QueryConsole() {
  const [sql, setSql] = useState(EXAMPLE_QUERIES[0].sql);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const run = async () => {
    if (!sql.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post("/api/serviparamo/query/", { sql });
      const data = res.data;
      if (!data.ok) {
        setError(data.error || "Error desconocido");
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    }
    // Tab inserts spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newVal = sql.substring(0, start) + "  " + sql.substring(end);
      setSql(newVal);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  const reset = () => {
    setSql("");
    setResult(null);
    setError(null);
    textareaRef.current?.focus();
  };

  const formatCell = (val: string | number | null) => {
    if (val === null) return <span className="text-gray-400 italic">null</span>;
    if (typeof val === "boolean") return <span className="text-purple-600 font-mono">{String(val)}</span>;
    if (typeof val === "number") return <span className="text-blue-700 font-mono">{val}</span>;
    const s = String(val);
    if (s.length > 80) return <span title={s}>{s.slice(0, 80)}<span className="text-gray-400">…</span></span>;
    return s;
  };

  return (
    <div className="flex flex-col h-full gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Consola SQL</h1>
            <p className="text-sm text-gray-500">Consultas SELECT sobre los datos cargados</p>
          </div>
        </div>

        {/* Ejemplos dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExamples(!showExamples)}
            className="gap-1.5"
          >
            Ejemplos
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
          {showExamples && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q.label}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setSql(q.sql);
                    setShowExamples(false);
                    textareaRef.current?.focus();
                  }}
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Editor toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-mono">SQL — solo SELECT · máx 1000 filas · Ctrl+Enter para ejecutar</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={reset}
              className="h-7 px-2 text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              onClick={run}
              disabled={loading}
              className="h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              {loading ? "Ejecutando…" : "Ejecutar"}
            </Button>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          rows={10}
          className="w-full bg-gray-950 text-green-300 font-mono text-sm p-4 resize-y outline-none leading-relaxed"
          placeholder="SELECT * FROM serviparamo_catalogo_skus LIMIT 10"
          style={{ minHeight: "200px" }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <pre className="text-sm font-mono whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-2 min-h-0">
          {/* Stats bar */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1.5">
              <Hash className="w-3 h-3" />
              {result.row_count.toLocaleString()} filas
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Clock className="w-3 h-3" />
              {result.elapsed_ms} ms
            </Badge>
            <span className="text-xs text-gray-400">
              {result.columns.length} columnas
            </span>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-gray-200 overflow-auto max-h-[500px] shadow-sm">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 w-10">#</th>
                  {result.columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 hover:bg-indigo-50/40 transition-colors"
                  >
                    <td className="px-3 py-1.5 text-xs text-gray-400 font-mono">{i + 1}</td>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-1.5 text-gray-800 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">
                        {formatCell(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
