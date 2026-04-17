import { useEffect, useState, useCallback } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  RefreshCw, CheckCircle, XCircle, Loader,
  Activity, Clock, AlertTriangle, Play, Database, Zap,
} from "lucide-react";
import { getEtlStatus, runEtl } from "../services/api";

interface ETLLogEntry {
  id: number;
  tabla_destino: string;
  filas_recibidas: number;
  filas_insertadas: number;
  filas_error: number;
  iniciado_en: string;
  finalizado_en: string | null;
  mensaje: string;
}

interface ETLResumen {
  total_tablas: number;
  tablas_con_error: number;
  ultimo_inicio: string | null;
  ultimo_fin: string | null;
  ultimo_mensaje: string;
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function dur(inicio: string, fin: string | null) {
  if (!fin) return "—";
  const ms = new Date(fin).getTime() - new Date(inicio).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

export default function ETLMonitor() {
  const [entries, setEntries] = useState<ETLLogEntry[]>([]);
  const [resumen, setResumen] = useState<ETLResumen | null>(null);
  const [corriendo, setCorriendo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [mensaje, setMensaje] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getEtlStatus();
      setCorriendo(res.corriendo ?? false);
      setEntries(Array.isArray(res.data) ? res.data : []);
      setResumen(res.resumen ?? null);
      setLastRefresh(new Date());
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, corriendo ? 5_000 : 30_000);
    return () => clearInterval(iv);
  }, [load, corriendo]);

  const handleRun = async () => {
    setRunning(true);
    setMensaje(null);
    try {
      const res = await runEtl();
      const msg = res?.mensaje ?? "ETL iniciado en segundo plano.";
      setMensaje({ text: msg, ok: true });
      setCorriendo(true);
      setTimeout(load, 3_000);
    } catch (e: any) {
      const err = e?.response?.data?.error ?? e?.message ?? "Error al iniciar el ETL.";
      setMensaje({ text: err, ok: false });
    } finally {
      setRunning(false);
    }
  };

  const totalInsertadas = entries.reduce((s, e) => s + (e.filas_insertadas ?? 0), 0);
  const errores = entries.filter(e => (e.filas_error ?? 0) > 0).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-sp-primary">Motor ETL</h1>
          <p className="text-gray-500 text-sm mt-1">
            Sincronización ERP SQL Server → PostgreSQL
            {lastRefresh && (
              <span className="ml-2">· {lastRefresh.toLocaleTimeString("es-CO")}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {corriendo ? (
            <Badge className="bg-sp-green text-white animate-pulse px-3 py-1 font-semibold">
              <Loader className="w-3 h-3 mr-1.5 animate-spin inline" />
              ETL en ejecución
            </Badge>
          ) : (
            <Badge className="bg-green-100 text-sp-green border-sp-green/30 px-3 py-1">
              <Zap className="w-3 h-3 mr-1.5 inline" />
              En reposo
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="border-sp-green/40 text-sp-primary hover:bg-sp-green/10"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-sp-green/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sp-green/10 rounded-xl">
              <Database className="w-5 h-5 text-sp-green" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Tablas sincronizadas</p>
              <p className="text-2xl font-bold text-sp-primary">{entries.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-sp-green/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <Activity className="w-5 h-5 text-sp-green" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total insertadas</p>
              <p className="text-2xl font-bold text-sp-primary">
                {totalInsertadas.toLocaleString("es-CO")}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-sp-green/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sp-green/10 rounded-xl">
              <Clock className="w-5 h-5 text-sp-green" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Último inicio</p>
              <p className="text-xs font-semibold text-sp-primary leading-snug mt-0.5">
                {resumen ? fmt(resumen.ultimo_inicio) : "—"}
              </p>
            </div>
          </div>
        </Card>

        <Card className={`p-4 ${errores > 0 ? "border-red-300" : "border-sp-green/20"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${errores > 0 ? "bg-red-100" : "bg-green-100"}`}>
              <AlertTriangle className={`w-5 h-5 ${errores > 0 ? "text-red-500" : "text-sp-green"}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Tablas con error</p>
              <p className="text-2xl font-bold text-sp-primary">{errores}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Ejecutar ETL */}
      <Card className="p-6 border-sp-green/20">
        <h3 className="text-sm font-semibold text-sp-primary uppercase tracking-wide mb-4 flex items-center gap-2">
          <Play className="w-4 h-4" />
          Ejecutar ETL completo
        </h3>

        {mensaje && (
          <div className={`text-sm rounded-lg px-4 py-3 mb-4 border ${
            mensaje.ok
              ? "bg-green-50 border-sp-green/30 text-sp-green"
              : "bg-red-50 border-red-200 text-red-600"
          }`}>
            {mensaje.text}
          </div>
        )}

        <Button
          onClick={handleRun}
          disabled={running || corriendo}
          className="w-full bg-sp-green hover:opacity-90 text-white font-bold disabled:opacity-50"
        >
          {corriendo
            ? <><Loader className="w-4 h-4 mr-2 animate-spin" />ETL en ejecución…</>
            : running
            ? <><Loader className="w-4 h-4 mr-2 animate-spin" />Iniciando…</>
            : <><Play className="w-4 h-4 mr-2" />Ejecutar ETL</>
          }
        </Button>
      </Card>

      {/* Tabla de estado por tabla */}
      <Card className="border-sp-green/20">
        <div className="px-6 py-4 border-b border-sp-green/20">
          <h3 className="text-sm font-semibold text-sp-primary uppercase tracking-wide flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Estado por tabla
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 p-6 text-sm">
            <Loader className="w-4 h-4 animate-spin" />
            Cargando estado ETL…
          </div>
        ) : entries.length === 0 ? (
          <p className="text-gray-400 text-sm p-6">Sin ejecuciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sp-green/20 text-left text-xs text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3">Tabla</th>
                  <th className="px-4 py-3 text-right">Recibidas</th>
                  <th className="px-4 py-3 text-right">Insertadas</th>
                  <th className="px-4 py-3 text-right">Errores</th>
                  <th className="px-4 py-3">Duración</th>
                  <th className="px-4 py-3">Finalizado</th>
                  <th className="px-4 py-3">Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const tieneError = (e.filas_error ?? 0) > 0;
                  return (
                    <tr
                      key={e.id}
                      className={`border-b border-sp-green/10 last:border-0 transition-colors ${
                        tieneError ? "bg-red-50 hover:bg-red-100/50" : "hover:bg-sp-green/5"
                      }`}
                    >
                      <td className="px-4 py-3">
                        {tieneError
                          ? <XCircle className="w-4 h-4 text-red-500" />
                          : <CheckCircle className="w-4 h-4 text-sp-green" />
                        }
                      </td>
                      <td className="px-4 py-3 font-medium text-sp-primary">
                        {e.tabla_destino}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                        {(e.filas_recibidas ?? 0).toLocaleString("es-CO")}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-sp-primary tabular-nums">
                        {(e.filas_insertadas ?? 0).toLocaleString("es-CO")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {tieneError ? (
                          <Badge className="bg-red-100 text-red-600 border-red-200 text-xs">
                            {e.filas_error}
                          </Badge>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs tabular-nums">
                        {dur(e.iniciado_en, e.finalizado_en)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap tabular-nums">
                        {fmt(e.finalizado_en)}
                      </td>
                      <td
                        className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate"
                        title={e.mensaje}
                      >
                        {e.mensaje || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
