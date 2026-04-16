import { useEffect, useState, type ReactNode } from 'react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import {
  User,
  Bell,
  Shield,
  Settings as SettingsIcon,
  Database,
  Play,
  RefreshCw,
  Lock,
  Loader2,
} from 'lucide-react';
import {
  getConfigDeteccion,
  getEtlStatusFull,
  runEtl,
  updateConfigDeteccion,
} from '../services/api';

type EtlLog = {
  id: number
  fecha_consulta: string
  almacen: number
  filas_recibidas: number
  filas_insertadas: number
  filas_error: number
  finalizado_en: string | null
  mensaje: string
}

type DetectionConfig = {
  enabled_alto_valor: boolean
  enabled_multiples_transacciones: boolean
  enabled_horario_inusual: boolean
  enabled_descuentos_excesivos: boolean
  monto_maximo: number
  descuento_maximo_pct: number
  transacciones_por_hora: number
  score_riesgo_min: number
  updated_at?: string | null
}

type DisabledSectionProps = {
  title: string
  badgeText: string
  message: string
  detail: string
  icon: ReactNode
}

const DETECTION_DEFAULTS: DetectionConfig = {
  enabled_alto_valor: true,
  enabled_multiples_transacciones: true,
  enabled_horario_inusual: true,
  enabled_descuentos_excesivos: false,
  monto_maximo: 10000000,
  descuento_maximo_pct: 50,
  transacciones_por_hora: 20,
  score_riesgo_min: 75,
}

function DisabledSection({ title, badgeText, message, detail, icon }: DisabledSectionProps) {
  return (
    <Card className="border-amber-500/20 bg-slate-800/70 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-amber-300">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-100">{title}</h3>
            <p className="text-sm text-amber-200/70">{message}</p>
          </div>
        </div>
        <Badge className="border-amber-500/40 bg-amber-500/15 text-amber-200">
          <Lock className="mr-1 h-3.5 w-3.5" />
          {badgeText}
        </Badge>
      </div>
      <div className="mt-5 rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
        {detail}
      </div>
    </Card>
  )
}

function DetectionPanel() {
  const [config, setConfig] = useState<DetectionConfig>(DETECTION_DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadConfig = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getConfigDeteccion()
      setConfig({
        enabled_alto_valor: Boolean(data?.enabled_alto_valor),
        enabled_multiples_transacciones: Boolean(data?.enabled_multiples_transacciones),
        enabled_horario_inusual: Boolean(data?.enabled_horario_inusual),
        enabled_descuentos_excesivos: Boolean(data?.enabled_descuentos_excesivos),
        monto_maximo: Number(data?.monto_maximo ?? DETECTION_DEFAULTS.monto_maximo),
        descuento_maximo_pct: Number(data?.descuento_maximo_pct ?? DETECTION_DEFAULTS.descuento_maximo_pct),
        transacciones_por_hora: Number(data?.transacciones_por_hora ?? DETECTION_DEFAULTS.transacciones_por_hora),
        score_riesgo_min: Number(data?.score_riesgo_min ?? DETECTION_DEFAULTS.score_riesgo_min),
        updated_at: data?.updated_at ?? null,
      })
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'No se pudo cargar la configuración de detección.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const updateNumber = (field: keyof DetectionConfig, value: string) => {
    setSuccess('')
    setConfig(prev => ({ ...prev, [field]: Number(value) }))
  }

  const updateSwitch = (field: keyof DetectionConfig, checked: boolean) => {
    setSuccess('')
    setConfig(prev => ({ ...prev, [field]: checked }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const saved = await updateConfigDeteccion({
        enabled_alto_valor: config.enabled_alto_valor,
        enabled_multiples_transacciones: config.enabled_multiples_transacciones,
        enabled_horario_inusual: config.enabled_horario_inusual,
        enabled_descuentos_excesivos: config.enabled_descuentos_excesivos,
        monto_maximo: config.monto_maximo,
        descuento_maximo_pct: config.descuento_maximo_pct,
        transacciones_por_hora: config.transacciones_por_hora,
        score_riesgo_min: config.score_riesgo_min,
      })
      setConfig(prev => ({ ...prev, updated_at: saved?.updated_at ?? prev.updated_at }))
      setSuccess('Configuración guardada correctamente.')
    } catch (e: any) {
      const backendError = e?.response?.data?.error
      const fieldErrors = e?.response?.data?.fields
      if (fieldErrors && typeof fieldErrors === 'object') {
        const details = Object.values(fieldErrors).join(' | ')
        setError(details || backendError || 'Hay errores de validación.')
      } else {
        setError(backendError ?? 'No se pudo guardar la configuración.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-amber-500/20 bg-slate-800/70 p-6">
        <div className="flex items-center gap-2 text-amber-200/80">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando configuración de detección...
        </div>
      </Card>
    )
  }

  return (
    <Card className="border-amber-500/20 bg-slate-800/70 p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-slate-100">Reglas de Detección de Anomalías</h3>
          <p className="text-sm text-amber-200/60">Configuración persistente (GET/PATCH) del módulo de detección.</p>
        </div>
        {config.updated_at && (
          <span className="text-xs text-slate-400">
            Última actualización: {new Date(config.updated_at).toLocaleString('es-CO')}
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <div>
            <p className="font-medium text-slate-100">Transacciones de alto valor</p>
            <p className="text-sm text-slate-400">Detectar transacciones superiores al umbral configurado.</p>
          </div>
          <Switch
            checked={config.enabled_alto_valor}
            onCheckedChange={(v) => updateSwitch('enabled_alto_valor', v)}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <div>
            <p className="font-medium text-slate-100">Múltiples transacciones</p>
            <p className="text-sm text-slate-400">Alertar actividad repetitiva en ventana corta.</p>
          </div>
          <Switch
            checked={config.enabled_multiples_transacciones}
            onCheckedChange={(v) => updateSwitch('enabled_multiples_transacciones', v)}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <div>
            <p className="font-medium text-slate-100">Horario inusual</p>
            <p className="text-sm text-slate-400">Detectar actividad fuera del horario operativo normal.</p>
          </div>
          <Switch
            checked={config.enabled_horario_inusual}
            onCheckedChange={(v) => updateSwitch('enabled_horario_inusual', v)}
            disabled={saving}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <div>
            <p className="font-medium text-slate-100">Descuentos excesivos</p>
            <p className="text-sm text-slate-400">Aplicar alertas por descuentos fuera de rango.</p>
          </div>
          <Switch
            checked={config.enabled_descuentos_excesivos}
            onCheckedChange={(v) => updateSwitch('enabled_descuentos_excesivos', v)}
            disabled={saving}
          />
        </div>
      </div>

      <div className="mt-6 border-t border-slate-700 pt-6">
        <h4 className="mb-3 font-medium text-slate-100">Umbrales</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amountThreshold" className="text-slate-200">Monto máximo (COP)</Label>
            <Input
              id="amountThreshold"
              type="number"
              value={config.monto_maximo}
              onChange={(e) => updateNumber('monto_maximo', e.target.value)}
              className="border-slate-600 bg-slate-900 text-slate-100"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discountThreshold" className="text-slate-200">Descuento máximo (%)</Label>
            <Input
              id="discountThreshold"
              type="number"
              value={config.descuento_maximo_pct}
              onChange={(e) => updateNumber('descuento_maximo_pct', e.target.value)}
              className="border-slate-600 bg-slate-900 text-slate-100"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionCount" className="text-slate-200">Transacciones por hora</Label>
            <Input
              id="transactionCount"
              type="number"
              value={config.transacciones_por_hora}
              onChange={(e) => updateNumber('transacciones_por_hora', e.target.value)}
              className="border-slate-600 bg-slate-900 text-slate-100"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="riskScore" className="text-slate-200">Puntuación de riesgo mínima</Label>
            <Input
              id="riskScore"
              type="number"
              value={config.score_riesgo_min}
              onChange={(e) => updateNumber('score_riesgo_min', e.target.value)}
              className="border-slate-600 bg-slate-900 text-slate-100"
              disabled={saving}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {success}
        </div>
      )}

      <Button
        className="mt-6 w-full bg-amber-500 text-slate-900 hover:bg-amber-400"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Guardando...' : 'Guardar Configuración'}
      </Button>
    </Card>
  )
}

function EtlPanel() {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  const [fechaInicio, setFechaInicio] = useState(yesterday)
  const [fechaFin, setFechaFin] = useState(today)
  const [almacen, setAlmacen] = useState('0')
  const [logs, setLogs] = useState<EtlLog[]>([])
  const [corriendo, setCorriendo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const cargarEstado = async () => {
    try {
      const res = await getEtlStatusFull()
      setCorriendo(Boolean(res?.corriendo))
      setLogs(Array.isArray(res?.data) ? res.data : [])
    } catch {
      setCorriendo(false)
      setLogs([])
    }
  }

  useEffect(() => {
    cargarEstado()
    const interval = setInterval(cargarEstado, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleRun = async () => {
    setLoading(true)
    setMensaje('')
    try {
      const res = await runEtl({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        almacen: parseInt(almacen, 10),
      })
      setMensaje(res?.mensaje ?? 'ETL iniciado.')
      setCorriendo(true)
    } catch (e: any) {
      setMensaje(`Error: ${e?.response?.data?.error ?? e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const statusBadge = corriendo
    ? <Badge className="border-yellow-500/40 bg-yellow-500/20 text-yellow-200">Corriendo</Badge>
    : <Badge className="border-emerald-500/40 bg-emerald-500/20 text-emerald-200">En reposo</Badge>

  return (
    <div className="space-y-6">
      <Card className="border-amber-500/20 bg-slate-800/70 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-slate-100">Estado del ETL</h3>
          <div className="flex items-center gap-2">
            {statusBadge}
            <Button
              variant="outline"
              size="sm"
              onClick={cargarEstado}
              className="border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-amber-200/70">
          El ETL consume la API de SuperEfectivo y carga movimientos en la base local.
          El estado se actualiza automáticamente cada 5 segundos.
        </p>
      </Card>

      <Card className="border-amber-500/20 bg-slate-800/70 p-6">
        <h3 className="mb-4 text-lg font-medium text-slate-100">Ejecutar ETL</h3>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="fechaInicio" className="text-slate-200">Fecha inicio</Label>
            <Input
              id="fechaInicio"
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="border-slate-600 bg-slate-900 text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fechaFin" className="text-slate-200">Fecha fin</Label>
            <Input
              id="fechaFin"
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              className="border-slate-600 bg-slate-900 text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="almacen" className="text-slate-200">Almacén</Label>
            <Select value={almacen} onValueChange={setAlmacen}>
              <SelectTrigger id="almacen" className="border-slate-600 bg-slate-900 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-600 bg-slate-900 text-slate-100">
                <SelectItem value="0">Todos (0)</SelectItem>
                {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
                  <SelectItem key={n} value={String(n)}>
                    Almacén {String(n).padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {mensaje && (
          <p className={`mb-4 text-sm ${mensaje.startsWith('Error') ? 'text-red-300' : 'text-emerald-300'}`}>
            {mensaje}
          </p>
        )}

        <Button
          onClick={handleRun}
          disabled={loading || corriendo}
          className="w-full bg-amber-500 text-slate-900 hover:bg-amber-400"
        >
          <Play className="mr-2 h-4 w-4" />
          {corriendo ? 'ETL en ejecución...' : loading ? 'Iniciando...' : 'Ejecutar ETL'}
        </Button>
      </Card>

      <Card className="border-amber-500/20 bg-slate-800/70 p-6">
        <h3 className="mb-4 text-lg font-medium text-slate-100">Últimas ejecuciones</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400">Sin ejecuciones registradas.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-700">
            <table className="w-full text-sm text-slate-200">
              <thead className="bg-slate-900/70">
                <tr className="text-left text-xs uppercase tracking-wide text-amber-200/70">
                  <th className="px-4 py-3">Fecha consulta</th>
                  <th className="px-4 py-3">Almacén</th>
                  <th className="px-4 py-3">Recibidas</th>
                  <th className="px-4 py-3">Insertadas</th>
                  <th className="px-4 py-3">Errores</th>
                  <th className="px-4 py-3">Mensaje</th>
                  <th className="px-4 py-3">Finalizado</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-t border-slate-700">
                    <td className="px-4 py-3">{log.fecha_consulta}</td>
                    <td className="px-4 py-3">
                      {log.almacen === 0 ? 'Todos' : `Almacén ${String(log.almacen).padStart(2, '0')}`}
                    </td>
                    <td className="px-4 py-3">{log.filas_recibidas}</td>
                    <td className="px-4 py-3">{log.filas_insertadas}</td>
                    <td className="px-4 py-3 text-red-300">{log.filas_error || '—'}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-300">{log.mensaje || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {log.finalizado_en ? new Date(log.finalizado_en).toLocaleString('es-CO') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default function Settings() {
  return (
    <div className="space-y-6 text-slate-100">
      <div>
        <h1 className="text-3xl font-semibold text-slate-100">Configuración</h1>
        <p className="mt-1 text-amber-200/70">Ajustes del sistema y preferencias funcionales</p>
      </div>

      <Tabs defaultValue="detection" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 border border-amber-500/20 bg-slate-800/80">
          <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-200">
            <User className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="detection" className="flex items-center gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-200">
            <Shield className="h-4 w-4" />
            Detección
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-200">
            <Bell className="h-4 w-4" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-200">
            <SettingsIcon className="h-4 w-4" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="datos" className="flex items-center gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-amber-200">
            <Database className="h-4 w-4" />
            Datos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <DisabledSection
            title="Gestión de Usuarios"
            badgeText="Gestionado por Hub"
            message="La administración de accesos no se gestiona en JOZ."
            detail="Esta sección queda deshabilitada para evitar operaciones sin persistencia local. Las altas/bajas/roles deben realizarse desde el Hub central."
            icon={<User className="h-4 w-4" />}
          />
        </TabsContent>

        <TabsContent value="detection">
          <DetectionPanel />
        </TabsContent>

        <TabsContent value="notifications">
          <DisabledSection
            title="Configuración de Notificaciones"
            badgeText="Próximamente"
            message="Canales de notificación aún no implementados en backend."
            detail="No se muestran switches ni formularios editables para evitar expectativa de envío real de email/push/webhook en esta versión."
            icon={<Bell className="h-4 w-4" />}
          />
        </TabsContent>

        <TabsContent value="system">
          <DisabledSection
            title="Preferencias del Sistema"
            badgeText="No habilitado"
            message="Parámetros globales y acciones sensibles fuera de alcance en esta iteración."
            detail="La acción destructiva de restablecimiento de sistema fue retirada del DOM hasta contar con backend seguro y confirmaciones de auditoría."
            icon={<SettingsIcon className="h-4 w-4" />}
          />
        </TabsContent>

        <TabsContent value="datos">
          <EtlPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
