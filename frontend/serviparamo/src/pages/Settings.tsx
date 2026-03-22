import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { Save, Bell, Database, Sparkles, RefreshCw, CheckCircle, XCircle, Loader } from "lucide-react";
import { getETLStatus, runETL } from "../services/serviparamoService";

interface ETLLogEntry {
  id: number;
  tabla_destino: string;
  filas_insertadas: number;
  filas_error: number;
  iniciado_en: string;
  finalizado_en: string | null;
  mensaje: string;
}

interface ETLStatusData {
  ok: boolean;
  data: ETLLogEntry[];
}

export default function Settings() {
  const [etlStatus, setEtlStatus] = useState<ETLLogEntry[]>([]);
  const [etlLoading, setEtlLoading] = useState(true);
  const [etlRunning, setEtlRunning] = useState(false);
  const [etlMessage, setEtlMessage] = useState<string | null>(null);

  const loadETLStatus = async () => {
    setEtlLoading(true);
    try {
      const res: ETLStatusData = await getETLStatus();
      setEtlStatus(res.data ?? []);
    } catch {
      setEtlStatus([]);
    } finally {
      setEtlLoading(false);
    }
  };

  useEffect(() => { loadETLStatus(); }, []);

  const handleRunETL = async () => {
    setEtlRunning(true);
    setEtlMessage(null);
    try {
      const res = await runETL();
      setEtlMessage(res.mensaje ?? "ETL iniciado en segundo plano.");
      // Refresca el estado después de 5s
      setTimeout(() => loadETLStatus(), 5000);
    } catch {
      setEtlMessage("Error al iniciar el ETL. Revisa la conexión con el backend.");
    } finally {
      setEtlRunning(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-CO", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Configuración</h1>
        <p className="text-gray-600">
          Preferencias del gestor de catálogo con IA y sincronización con el ERP
        </p>
      </div>

      {/* ── Sincronización ERP (ETL) ─────────────────────────────────────────── */}
      <Card className="shadow-sm border-sp-blue/20">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-sp-blue" />
            Sincronización ERP
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900 mb-1">Ejecutar sincronización completa</p>
              <p className="text-sm text-gray-500">
                Extrae todas las tablas del ERP de Servipáramo (SQL Server) hacia PostgreSQL.
                El proceso corre en segundo plano y puede tardar varios minutos.
              </p>
            </div>
            <Button
              onClick={handleRunETL}
              disabled={etlRunning}
              className="shrink-0 bg-sp-blue hover:bg-sp-blue-hover text-white"
            >
              {etlRunning ? (
                <><Loader className="w-4 h-4 mr-2 animate-spin" />Iniciando…</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" />Sincronizar ERP</>
              )}
            </Button>
          </div>

          {etlMessage && (
            <div className="bg-sp-blue-light border border-sp-blue/20 rounded-lg p-3 text-sm text-sp-navy">
              {etlMessage}
            </div>
          )}

          <Separator />

          {/* Estado por tabla */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-gray-900 text-sm">Última sincronización por tabla</p>
              <Button variant="ghost" size="sm" onClick={loadETLStatus} disabled={etlLoading}>
                <RefreshCw className={`w-3 h-3 mr-1 ${etlLoading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            </div>

            {etlLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
                <Loader className="w-4 h-4 animate-spin" />
                Cargando estado del ETL…
              </div>
            ) : etlStatus.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">
                Sin historial de sincronización. Ejecuta el ETL por primera vez.
              </p>
            ) : (
              <div className="space-y-2">
                {etlStatus.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      {entry.filas_error > 0 ? (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-sp-blue shrink-0" />
                      )}
                      <span className="font-mono text-gray-700 text-xs">{entry.tabla_destino}</span>
                    </div>
                    <div className="flex items-center gap-4 text-gray-500 text-xs">
                      <span>{entry.filas_insertadas.toLocaleString()} filas</span>
                      {entry.filas_error > 0 && (
                        <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                          {entry.filas_error} errores
                        </Badge>
                      )}
                      <span>{formatDate(entry.finalizado_en ?? entry.iniciado_en)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── General ──────────────────────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Configuración General
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="company">Nombre de la Empresa</Label>
            <Input id="company" defaultValue="Serviparamo Ingeniería" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico del Administrador</Label>
            <Input id="email" type="email" defaultValue="admin@serviparamo.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Zona Horaria</Label>
            <Input id="timezone" defaultValue="America/Bogota" />
          </div>
        </CardContent>
      </Card>

      {/* ── IA ────────────────────────────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Configuración de IA
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-detección de Duplicados</Label>
              <p className="text-sm text-gray-500">Escanear automáticamente en busca de SKUs duplicados</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-normalización</Label>
              <p className="text-sm text-gray-500">Aplicar sugerencias de IA automáticamente con confianza alta</p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="confidence">Umbral mínimo de confianza</Label>
            <div className="flex items-center gap-4">
              <Input id="confidence" type="number" min="0" max="100" defaultValue="85" className="w-24" />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="similarity">Sensibilidad de detección de duplicados (umbral coseno)</Label>
            <div className="flex items-center gap-4">
              <Input id="similarity" type="number" min="0" max="100" defaultValue="92" className="w-24" />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Notificaciones ──────────────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificaciones por Correo</Label>
              <p className="text-sm text-gray-500">Recibir actualizaciones por correo</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alertas de Duplicados</Label>
              <p className="text-sm text-gray-500">Notificar cuando se detecten nuevos duplicados</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reportes de Normalización</Label>
              <p className="text-sm text-gray-500">Resumen semanal de normalización del catálogo</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
