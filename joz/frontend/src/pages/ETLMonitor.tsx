import { useEffect, useState, useCallback } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  RefreshCw, CheckCircle, XCircle, Loader,
  Activity, Clock, AlertTriangle, Play, Database, Zap,
} from "lucide-react";
import { getEtlStatusFull, runEtl } from "../services/api";

interface ETLLogEntry {
  id: number;
  fecha_consulta: string;
  almacen: number;
  filas_recibidas: number;
  filas_insertadas: number;
  filas_error: number;
  iniciado_en: string;
  finalizado_en: string | null;
  mensaje: string;
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

function isReciente(iso: string | null, horas = 25) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < horas * 3_600_000;
}

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ETLMonitor() {
  const hoy = toDateInput(new Date());
  const ayer = toDateInput(new Date(Date.now() - 86_400_000));

  const [entries, setEntries] = useState<ETLLogEntry[]>([]);
  const [corriendo, setCorriendo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [mensaje, setMensaje] = useState<{ text: string; ok: boolean } | null>(null);

  // Formulario ETL
  const [fechaInicio, setFechaInicio] = useState(ayer);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [almacen, setAlmacen] = useState("0");

  const load = useCallback(async () => {
    try {
      const res = await getEtlStatusFull();  // { ok, data: [...], corriendo }
      setCorriendo(res.corriendo ?? false);
      setEntries(Array.isArray(res.data) ? res.data : []);
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
      const res = await runEtl({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        almacen: parseInt(almacen),
      });
      const msg = res?.mensaje ?? res?.data?.mensaje ?? "ETL iniciado en segundo plano.";
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

  // ── Métricas ────────────────────────────────────────────────────────────────
  const ultimaOK = entries.find(e => e.filas_error === 0);
  const erroresRecientes = entries.filter(
    e => e.filas_error > 0 && isReciente(e.finalizado_en ?? e.iniciado_en)
  ).length;
  const totalInsertadasRecientes = entries
    .filter(e => isReciente(e.finalizado_en ?? e.iniciado_en))
    .reduce((s, e) => s + e.filas_insertadas, 0);

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Monitor ETL — Joz</h1>
          <p className="text-amber-200/60 text-sm mt-1">
            Sincronización SuperEfectivo API → PostgreSQL
            {lastRefresh && (
              <span className="ml-2">· {lastRefresh.toLocaleTimeString("es-CO")}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {corriendo ? (
            <Badge className="bg-amber-500 text-slate-950 border-amber-400 animate-pulse px-3 py-1 font-semibold">
              <Loader className="w-3 h-3 mr-1.5 animate-spin inline" />
              ETL en ejecución
            </Badge>
          ) : (
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 px-3 py-1">
              <Zap className="w-3 h-3 mr-1.5 inline" />
              En reposo
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="border-amber-500/30 text-amber-200 hover:bg-amber-500/10"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-amber-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl">
              <Database className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-amber-200/60">Ejecuciones registradas</p>
              <p className="text-2xl font-bold text-white">{entries.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900 border-amber-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-xl">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-amber-200/60">Insertadas (25h)</p>
              <p className="text-2xl font-bold text-white">
                {totalInsertadasRecientes.toLocaleString("es-CO")}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900 border-amber-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-amber-200/60">Última ejecución OK</p>
              <p className="text-xs font-semibold text-amber-100 leading-snug mt-0.5">
                {ultimaOK ? fmt(ultimaOK.finalizado_en) : "—"}
              </p>
            </div>
          </div>
        </Card>

        <Card className={`bg-slate-900 p-4 ${erroresRecientes > 0 ? "border-red-500/40" : "border-amber-500/20"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${erroresRecientes > 0 ? "bg-red-500/20" : "bg-green-500/20"}`}>
              <AlertTriangle className={`w-5 h-5 ${erroresRecientes > 0 ? "text-red-400" : "text-green-400"}`} />
            </div>
            <div>
              <p className="text-xs text-amber-200/60">Errores recientes</p>
              <p className="text-2xl font-bold text-white">{erroresRecientes}</p>
              <p className="text-xs text-amber-200/40">últimas 25h</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Formulario ejecutar ─────────────────────────────────────────────── */}
      <Card className="bg-slate-900 border-amber-500/20 p-6">
        <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Play className="w-4 h-4" />
          Ejecutar ETL
        </h3>

        {mensaje && (
          <div className={`text-sm rounded-lg px-4 py-3 mb-4 border ${
            mensaje.ok
              ? "bg-green-500/10 border-green-500/30 text-green-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}>
            {mensaje.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-amber-200/70">Fecha inicio</Label>
            <Input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="bg-slate-950 border-amber-500/30 text-amber-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-amber-200/70">Fecha fin</Label>
            <Input
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              className="bg-slate-950 border-amber-500/30 text-amber-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-amber-200/70">Almacén</Label>
            <Select value={almacen} onValueChange={setAlmacen}>
              <SelectTrigger className="bg-slate-950 border-amber-500/30 text-amber-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todos (0)</SelectItem>
                {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
                  <SelectItem key={n} value={String(n)}>
                    Almacén {String(n).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleRun}
          disabled={running || corriendo}
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
        >
          {corriendo
            ? <><Loader className="w-4 h-4 mr-2 animate-spin" />ETL en ejecución…</>
            : running
            ? <><Loader className="w-4 h-4 mr-2 animate-spin" />Iniciando…</>
            : <><Play className="w-4 h-4 mr-2" />Ejecutar ETL</>
          }
        </Button>
      </Card>

      {/* ── Log de ejecuciones ──────────────────────────────────────────────── */}
      <Card className="bg-slate-900 border-amber-500/20">
        <div className="px-6 py-4 border-b border-amber-500/20">
          <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wide flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Historial de ejecuciones
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-amber-200/50 p-6 text-sm">
            <Loader className="w-4 h-4 animate-spin" />
            Cargando historial ETL…
          </div>
        ) : entries.length === 0 ? (
          <p className="text-amber-200/40 text-sm p-6">Sin ejecuciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-500/20 text-left text-xs text-amber-200/50 uppercase tracking-wide">
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3">Fecha consulta</th>
                  <th className="px-4 py-3">Almacén</th>
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
                  const tieneError = e.filas_error > 0;
                  const reciente = isReciente(e.finalizado_en ?? e.iniciado_en);
                  return (
                    <tr
                      key={e.id}
                      className={`border-b border-amber-500/10 last:border-0 transition-colors ${
                        tieneError && reciente
                          ? "bg-red-500/10 hover:bg-red-500/15"
                          : "hover:bg-amber-500/5"
                      }`}
                    >
                      <td className="px-4 py-3">
                        {tieneError
                          ? <XCircle className="w-4 h-4 text-red-400" />
                          : <CheckCircle className="w-4 h-4 text-green-400" />
                        }
                      </td>
                      <td className="px-4 py-3 font-medium text-amber-100">
                        {e.fecha_consulta}
                      </td>
                      <td className="px-4 py-3 text-amber-200/70">
                        {e.almacen === 0 ? "Todos" : `Almacén ${String(e.almacen).padStart(2, "0")}`}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-200/70 tabular-nums">
                        {(e.filas_recibidas ?? 0).toLocaleString("es-CO")}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-100 tabular-nums">
                        {e.filas_insertadas.toLocaleString("es-CO")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {tieneError ? (
                          <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                            {e.filas_error}
                          </Badge>
                        ) : (
                          <span className="text-amber-200/20">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-amber-200/50 text-xs tabular-nums">
                        {dur(e.iniciado_en, e.finalizado_en)}
                      </td>
                      <td className="px-4 py-3 text-amber-200/50 text-xs whitespace-nowrap tabular-nums">
                        {fmt(e.finalizado_en)}
                      </td>
                      <td
                        className="px-4 py-3 text-amber-200/60 text-xs max-w-xs truncate"
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
