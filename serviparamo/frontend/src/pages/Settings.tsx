import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { Save, Bell, Database, Sparkles, RefreshCw, CheckCircle, XCircle, Loader } from "lucide-react";
import {
  getETLStatus,
  runETL,
  getConfiguracion,
  updateConfiguracion,
} from "../services/serviparamoService";

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
  corriendo?: boolean;
  resumen?: {
    total_tablas: number;
    tablas_con_error: number;
    ultimo_inicio: string | null;
    ultimo_fin: string | null;
    ultimo_mensaje: string;
  } | null;
}

interface ConfiguracionData {
  sistema: {
    nombre_empresa: string;
    correo_administrador: string;
    zona_horaria: string;
  };
  etl: {
    auto_sync_activo: boolean;
    intervalo_horas: number;
    timeout_minutos: number;
    solo_faltantes_embeddings: boolean;
  };
  preferencias_usuario: {
    notificaciones_email: boolean;
    alertas_duplicados: boolean;
    reporte_normalizacion_semanal: boolean;
    umbral_confianza: number;
    umbral_similitud: number;
  };
  updated_at: string | null;
}

const CONFIG_DEFAULT: ConfiguracionData = {
  sistema: {
    nombre_empresa: "Serviparamo Ingeniería",
    correo_administrador: "admin@serviparamo.com",
    zona_horaria: "America/Bogota",
  },
  etl: {
    auto_sync_activo: false,
    intervalo_horas: 24,
    timeout_minutos: 60,
    solo_faltantes_embeddings: true,
  },
  preferencias_usuario: {
    notificaciones_email: true,
    alertas_duplicados: true,
    reporte_normalizacion_semanal: true,
    umbral_confianza: 85,
    umbral_similitud: 92,
  },
  updated_at: null,
};

const normalizeConfig = (raw: any): ConfiguracionData => ({
  sistema: {
    nombre_empresa: String(raw?.sistema?.nombre_empresa ?? CONFIG_DEFAULT.sistema.nombre_empresa),
    correo_administrador: String(raw?.sistema?.correo_administrador ?? CONFIG_DEFAULT.sistema.correo_administrador),
    zona_horaria: String(raw?.sistema?.zona_horaria ?? CONFIG_DEFAULT.sistema.zona_horaria),
  },
  etl: {
    auto_sync_activo: Boolean(raw?.etl?.auto_sync_activo ?? CONFIG_DEFAULT.etl.auto_sync_activo),
    intervalo_horas: Number(raw?.etl?.intervalo_horas ?? CONFIG_DEFAULT.etl.intervalo_horas),
    timeout_minutos: Number(raw?.etl?.timeout_minutos ?? CONFIG_DEFAULT.etl.timeout_minutos),
    solo_faltantes_embeddings: Boolean(
      raw?.etl?.solo_faltantes_embeddings ?? CONFIG_DEFAULT.etl.solo_faltantes_embeddings,
    ),
  },
  preferencias_usuario: {
    notificaciones_email: Boolean(
      raw?.preferencias_usuario?.notificaciones_email ?? CONFIG_DEFAULT.preferencias_usuario.notificaciones_email,
    ),
    alertas_duplicados: Boolean(
      raw?.preferencias_usuario?.alertas_duplicados ?? CONFIG_DEFAULT.preferencias_usuario.alertas_duplicados,
    ),
    reporte_normalizacion_semanal: Boolean(
      raw?.preferencias_usuario?.reporte_normalizacion_semanal ?? CONFIG_DEFAULT.preferencias_usuario.reporte_normalizacion_semanal,
    ),
    umbral_confianza: Number(
      raw?.preferencias_usuario?.umbral_confianza ?? CONFIG_DEFAULT.preferencias_usuario.umbral_confianza,
    ),
    umbral_similitud: Number(
      raw?.preferencias_usuario?.umbral_similitud ?? CONFIG_DEFAULT.preferencias_usuario.umbral_similitud,
    ),
  },
  updated_at: raw?.updated_at ?? null,
});

export default function Settings() {
  const [etlStatus, setEtlStatus] = useState<ETLLogEntry[]>([]);
  const [etlLoading, setEtlLoading] = useState(true);
  const [etlRunning, setEtlRunning] = useState(false);
  const [etlStarting, setEtlStarting] = useState(false);
  const [etlMessage, setEtlMessage] = useState<string | null>(null);

  const [config, setConfig] = useState<ConfiguracionData>(CONFIG_DEFAULT);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadETLStatus = async (silent = false) => {
    if (!silent) setEtlLoading(true);
    try {
      const res: ETLStatusData = await getETLStatus();
      const wasRunning = etlRunning;
      const isRunning = Boolean(res.corriendo);
      setEtlStatus(res.data ?? []);
      setEtlRunning(isRunning);
      setEtlStarting(false);

      if (silent && wasRunning && !isRunning) {
        if ((res.resumen?.tablas_con_error ?? 0) > 0) {
          setEtlMessage(
            `Sincronización finalizada con ${res.resumen?.tablas_con_error ?? 0} tabla(s) con errores.`,
          );
        } else if (res.resumen) {
          setEtlMessage(
            `Sincronización completada. ${res.resumen.total_tablas} tabla(s) actualizadas.`,
          );
        } else {
          setEtlMessage("Sincronización finalizada.");
        }
      }
    } catch {
      setEtlStatus([]);
      setEtlRunning(false);
      setEtlStarting(false);
    } finally {
      if (!silent) setEtlLoading(false);
    }
  };

  const loadConfig = async () => {
    setConfigLoading(true);
    setConfigError(null);
    try {
      const data = await getConfiguracion();
      if (data) {
        setConfig(normalizeConfig(data));
      } else {
        setConfig(CONFIG_DEFAULT);
      }
    } catch {
      setConfigError("No se pudo cargar la configuración.");
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    loadETLStatus();
    loadConfig();
  }, []);

  useEffect(() => {
    if (!etlRunning) return;
    const interval = setInterval(() => loadETLStatus(true), 4000);
    return () => clearInterval(interval);
  }, [etlRunning]);

  const handleRunETL = async () => {
    setEtlRunning(true);
    setEtlStarting(true);
    setEtlMessage(null);
    try {
      const res = await runETL();
      setEtlMessage(res.mensaje ?? "ETL iniciado en segundo plano.");
      await loadETLStatus();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setEtlMessage(err?.response?.data?.error ?? "El ETL ya está en ejecución.");
        await loadETLStatus();
      } else {
        setEtlMessage("Error al iniciar el ETL. Revisa la conexión con el backend.");
        setEtlRunning(false);
        setEtlStarting(false);
      }
    }
  };

  const setSistema = (field: keyof ConfiguracionData["sistema"], value: string) => {
    setConfig((prev) => ({ ...prev, sistema: { ...prev.sistema, [field]: value } }));
  };

  const setEtl = (
    field: keyof ConfiguracionData["etl"],
    value: ConfiguracionData["etl"][keyof ConfiguracionData["etl"]],
  ) => {
    setConfig((prev) => ({ ...prev, etl: { ...prev.etl, [field]: value } }));
  };

  const setPreferencia = (
    field: keyof ConfiguracionData["preferencias_usuario"],
    value: ConfiguracionData["preferencias_usuario"][keyof ConfiguracionData["preferencias_usuario"]],
  ) => {
    setConfig((prev) => ({
      ...prev,
      preferencias_usuario: { ...prev.preferencias_usuario, [field]: value },
    }));
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setConfigMessage(null);
    setConfigError(null);
    setFieldErrors({});

    try {
      const payload = {
        sistema: config.sistema,
        etl: config.etl,
        preferencias_usuario: config.preferencias_usuario,
      };
      const data = await updateConfiguracion(payload);
      if (data) {
        setConfig(normalizeConfig(data));
      }
      setConfigMessage("Configuración guardada correctamente.");
    } catch (err: any) {
      const apiError = err?.response?.data;
      if (apiError?.fields && typeof apiError.fields === "object") {
        setFieldErrors(apiError.fields);
      }
      setConfigError(apiError?.error ?? "No se pudo guardar la configuración.");
    } finally {
      setConfigSaving(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fieldError = (key: string) => (
    fieldErrors[key] ? <p className="text-xs text-red-600">{fieldErrors[key]}</p> : null
  );

  const disableConfig = configLoading || configSaving;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Configuración</h1>
        <p className="text-gray-600">
          Parámetros del sistema, políticas ETL y preferencias del usuario
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
                Extrae tablas del ERP hacia PostgreSQL y ejecuta indexación semántica según la configuración ETL.
              </p>
            </div>
            <Button
              onClick={handleRunETL}
              disabled={etlRunning}
              className="shrink-0 bg-sp-blue hover:bg-sp-blue-hover text-white"
            >
              {etlRunning ? (
                etlStarting ? (
                  <><Loader className="w-4 h-4 mr-2 animate-spin" />Iniciando…</>
                ) : (
                  <><Loader className="w-4 h-4 mr-2 animate-spin" />En ejecución…</>
                )
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" />Sincronizar ERP</>
              )}
            </Button>
          </div>

          {etlMessage && (
            <div className={`rounded-lg p-3 text-sm ${
              etlMessage.includes("error") || etlMessage.includes("Error")
                ? "bg-red-50 border border-red-200 text-red-700"
                : "bg-sp-blue-light border border-sp-blue/20 text-sp-navy"
            }`}>
              {etlMessage}
            </div>
          )}

          <Separator />

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

      {/* ── Parámetros del Sistema ───────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Parámetros del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="company">Nombre de la Empresa</Label>
            <Input
              id="company"
              value={config.sistema.nombre_empresa}
              disabled={disableConfig}
              onChange={(e) => setSistema("nombre_empresa", e.target.value)}
            />
            {fieldError("sistema.nombre_empresa")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico del Administrador</Label>
            <Input
              id="email"
              type="email"
              value={config.sistema.correo_administrador}
              disabled={disableConfig}
              onChange={(e) => setSistema("correo_administrador", e.target.value)}
            />
            {fieldError("sistema.correo_administrador")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Zona Horaria</Label>
            <Input
              id="timezone"
              value={config.sistema.zona_horaria}
              disabled={disableConfig}
              onChange={(e) => setSistema("zona_horaria", e.target.value)}
            />
            {fieldError("sistema.zona_horaria")}
          </div>
        </CardContent>
      </Card>

      {/* ── Configuración ETL ────────────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Configuración de ETL
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-sincronización activa</Label>
              <p className="text-sm text-gray-500">Define la política de ejecución automática del ETL</p>
            </div>
            <Switch
              checked={config.etl.auto_sync_activo}
              disabled={disableConfig}
              onCheckedChange={(checked) => setEtl("auto_sync_activo", checked)}
            />
          </div>
          {fieldError("etl.auto_sync_activo")}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="etl-interval">Intervalo de sincronización (horas)</Label>
            <Input
              id="etl-interval"
              type="number"
              min="1"
              max="168"
              value={config.etl.intervalo_horas}
              disabled={disableConfig}
              onChange={(e) => setEtl("intervalo_horas", Number(e.target.value || 0))}
              className="w-28"
            />
            {fieldError("etl.intervalo_horas")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="etl-timeout">Timeout máximo de ETL (minutos)</Label>
            <Input
              id="etl-timeout"
              type="number"
              min="5"
              max="720"
              value={config.etl.timeout_minutos}
              disabled={disableConfig}
              onChange={(e) => setEtl("timeout_minutos", Number(e.target.value || 0))}
              className="w-28"
            />
            {fieldError("etl.timeout_minutos")}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Indexación incremental de embeddings</Label>
              <p className="text-sm text-gray-500">Si está activa, ETL genera embeddings solo para SKUs faltantes</p>
            </div>
            <Switch
              checked={config.etl.solo_faltantes_embeddings}
              disabled={disableConfig}
              onCheckedChange={(checked) => setEtl("solo_faltantes_embeddings", checked)}
            />
          </div>
          {fieldError("etl.solo_faltantes_embeddings")}
        </CardContent>
      </Card>

      {/* ── Preferencias de Usuario ──────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Preferencias de Usuario
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificaciones por Correo</Label>
              <p className="text-sm text-gray-500">Recibir actualizaciones operativas por email</p>
            </div>
            <Switch
              checked={config.preferencias_usuario.notificaciones_email}
              disabled={disableConfig}
              onCheckedChange={(checked) => setPreferencia("notificaciones_email", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alertas de Duplicados</Label>
              <p className="text-sm text-gray-500">Notificar cuando se detecten nuevos duplicados</p>
            </div>
            <Switch
              checked={config.preferencias_usuario.alertas_duplicados}
              disabled={disableConfig}
              onCheckedChange={(checked) => setPreferencia("alertas_duplicados", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reporte semanal de normalización</Label>
              <p className="text-sm text-gray-500">Enviar resumen semanal de normalización del catálogo</p>
            </div>
            <Switch
              checked={config.preferencias_usuario.reporte_normalizacion_semanal}
              disabled={disableConfig}
              onCheckedChange={(checked) => setPreferencia("reporte_normalizacion_semanal", checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="confidence">Umbral mínimo de confianza (%)</Label>
            <Input
              id="confidence"
              type="number"
              min="0"
              max="100"
              value={config.preferencias_usuario.umbral_confianza}
              disabled={disableConfig}
              onChange={(e) => setPreferencia("umbral_confianza", Number(e.target.value || 0))}
              className="w-28"
            />
            {fieldError("preferencias_usuario.umbral_confianza")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="similarity">Sensibilidad de detección de duplicados (%)</Label>
            <Input
              id="similarity"
              type="number"
              min="0"
              max="100"
              value={config.preferencias_usuario.umbral_similitud}
              disabled={disableConfig}
              onChange={(e) => setPreferencia("umbral_similitud", Number(e.target.value || 0))}
              className="w-28"
            />
            {fieldError("preferencias_usuario.umbral_similitud")}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {configError && (
          <div className="rounded-lg p-3 text-sm bg-red-50 border border-red-200 text-red-700">
            {configError}
          </div>
        )}
        {configMessage && (
          <div className="rounded-lg p-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700">
            {configMessage}
          </div>
        )}
        <p className="text-xs text-gray-500">
          Última actualización de configuración: {formatDate(config.updated_at)}
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleSaveConfig}
          disabled={disableConfig}
        >
          {configSaving ? (
            <><Loader className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Guardar Cambios</>
          )}
        </Button>
      </div>
    </div>
  );
}
