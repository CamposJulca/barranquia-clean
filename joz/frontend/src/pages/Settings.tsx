import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { User, Bell, Shield, Settings as SettingsIcon, Database, Play, RefreshCw } from 'lucide-react';
import { getEtlStatus, runEtl } from '../services/api';

// ── ETL Tab ────────────────────────────────────────────────────────────────────

function EtlPanel() {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const [fechaInicio, setFechaInicio] = useState(yesterday);
  const [fechaFin, setFechaFin] = useState(today);
  const [almacen, setAlmacen] = useState('0');
  const [logs, setLogs] = useState<any[]>([]);
  const [corriendo, setCorriendo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cargarEstado = async () => {
    try {
      const res = await getEtlStatus();
      const d = res.data?.data ?? res.data;
      setCorriendo(res.data?.corriendo ?? false);
      setLogs(Array.isArray(d) ? d : []);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    cargarEstado();
    const interval = setInterval(cargarEstado, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRun = async () => {
    setLoading(true);
    setMensaje('');
    try {
      const res = await runEtl({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        almacen: parseInt(almacen),
      });
      const d = res.data?.data ?? res.data;
      setMensaje(d?.mensaje ?? 'ETL iniciado.');
      setCorriendo(true);
    } catch (e: any) {
      setMensaje(`Error: ${e?.response?.data?.error ?? e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = corriendo
    ? <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Corriendo</Badge>
    : <Badge className="bg-green-100 text-green-800 border-green-300">En reposo</Badge>;

  return (
    <div className="space-y-6">

      {/* Estado actual */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Estado del ETL</h3>
          <div className="flex items-center gap-2">
            {statusBadge}
            <Button variant="outline" size="sm" onClick={cargarEstado}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          El ETL consume la API REST de SuperEfectivo y carga los movimientos en la base de datos local.
          Se ejecuta en segundo plano; el estado se actualiza cada 5 segundos.
        </p>
      </Card>

      {/* Disparar ETL */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Ejecutar ETL</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="fechaInicio">Fecha inicio</Label>
            <Input
              id="fechaInicio"
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fechaFin">Fecha fin</Label>
            <Input
              id="fechaFin"
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="almacen">Almacén</Label>
            <Select value={almacen} onValueChange={setAlmacen}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todos (0)</SelectItem>
                {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
                  <SelectItem key={n} value={String(n)}>Almacén {String(n).padStart(2, '0')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {mensaje && (
          <p className={`text-sm mb-4 ${mensaje.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {mensaje}
          </p>
        )}

        <Button
          onClick={handleRun}
          disabled={loading || corriendo}
          className="w-full flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          {corriendo ? 'ETL en ejecución...' : loading ? 'Iniciando...' : 'Ejecutar ETL'}
        </Button>
      </Card>

      {/* Historial de ejecuciones */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Últimas ejecuciones</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">Sin ejecuciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Fecha consulta</th>
                  <th className="pb-2">Almacén</th>
                  <th className="pb-2">Recibidas</th>
                  <th className="pb-2">Insertadas</th>
                  <th className="pb-2">Errores</th>
                  <th className="pb-2">Mensaje</th>
                  <th className="pb-2">Finalizado</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="py-2">{log.fecha_consulta}</td>
                    <td className="py-2">{log.almacen === 0 ? 'Todos' : `Almacén ${String(log.almacen).padStart(2, '0')}`}</td>
                    <td className="py-2">{log.filas_recibidas}</td>
                    <td className="py-2">{log.filas_insertadas}</td>
                    <td className="py-2 text-red-500">{log.filas_error || '—'}</td>
                    <td className="py-2 max-w-xs truncate text-gray-600">{log.mensaje || '—'}</td>
                    <td className="py-2 text-gray-400">
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
  );
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Configuración</h1>
        <p className="text-gray-500 mt-1">Ajustes del sistema y preferencias</p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="detection" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Detección
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificaciones
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Sistema
          </TabsTrigger>
          <TabsTrigger value="datos" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Datos
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Gestión de Usuarios</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userName">Nombre Completo</Label>
                  <Input id="userName" placeholder="Juan Pérez" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userEmail">Correo Electrónico</Label>
                  <Input id="userEmail" type="email" placeholder="juan@ejemplo.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userRole">Rol</Label>
                  <Select defaultValue="analyst">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="analyst">Analista</SelectItem>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userStatus">Estado</Label>
                  <Select defaultValue="active">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full">Agregar Usuario</Button>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">Usuarios Actuales</h4>
                <div className="space-y-3">
                  {[
                    { name: 'Admin User', email: 'admin@joz.com', role: 'Administrador' },
                    { name: 'Ana García', email: 'ana@joz.com', role: 'Analista' },
                    { name: 'Carlos López', email: 'carlos@joz.com', role: 'Visualizador' },
                  ].map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{user.role}</span>
                        <Button variant="outline" size="sm">Editar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Detection Rules Tab */}
        <TabsContent value="detection">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Reglas de Detección de Anomalías</h3>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Transacciones de alto valor</p>
                    <p className="text-sm text-gray-500">Detectar transacciones superiores al umbral</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Múltiples transacciones</p>
                    <p className="text-sm text-gray-500">Alertar cuando hay múltiples transacciones en corto tiempo</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Horario inusual</p>
                    <p className="text-sm text-gray-500">Detectar actividad fuera del horario laboral</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Descuentos excesivos</p>
                    <p className="text-sm text-gray-500">Alertar cuando se aplican descuentos superiores al límite</p>
                  </div>
                  <Switch />
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">Umbrales</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amountThreshold">Monto máximo (COP)</Label>
                    <Input id="amountThreshold" type="number" defaultValue="10000000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountThreshold">Descuento máximo (%)</Label>
                    <Input id="discountThreshold" type="number" defaultValue="50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transactionCount">Transacciones por hora</Label>
                    <Input id="transactionCount" type="number" defaultValue="20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="riskScore">Puntuación de riesgo mínima</Label>
                    <Input id="riskScore" type="number" defaultValue="75" />
                  </div>
                </div>
              </div>

              <Button className="w-full">Guardar Configuración</Button>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Configuración de Notificaciones</h3>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Notificaciones por email</p>
                    <p className="text-sm text-gray-500">Recibir alertas por correo electrónico</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Alertas en tiempo real</p>
                    <p className="text-sm text-gray-500">Notificaciones push instantáneas</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Resumen diario</p>
                    <p className="text-sm text-gray-500">Recibir un resumen diario de actividad</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Alertas de riesgo alto</p>
                    <p className="text-sm text-gray-500">Solo notificar anomalías de riesgo alto</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">Contactos de Notificación</h4>
                <div className="space-y-2">
                  <Label htmlFor="primaryEmail">Email principal</Label>
                  <Input id="primaryEmail" type="email" defaultValue="admin@joz.com" />
                </div>
                <div className="space-y-2 mt-4">
                  <Label htmlFor="secondaryEmail">Email secundario</Label>
                  <Input id="secondaryEmail" type="email" placeholder="opcional@joz.com" />
                </div>
              </div>

              <Button className="w-full">Guardar Preferencias</Button>
            </div>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Preferencias del Sistema</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <Select defaultValue="america/bogota">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="america/bogota">América/Bogotá</SelectItem>
                      <SelectItem value="america/mexico">América/Ciudad de México</SelectItem>
                      <SelectItem value="america/ny">América/Nueva York</SelectItem>
                      <SelectItem value="europe/madrid">Europa/Madrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select defaultValue="es">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">Retención de Datos</h4>
                <div className="space-y-2">
                  <Label htmlFor="dataRetention">Tiempo de retención (días)</Label>
                  <Input id="dataRetention" type="number" defaultValue="90" />
                  <p className="text-sm text-gray-500">Los datos se eliminarán automáticamente después de este período</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">Integración API</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input id="apiKey" type="password" defaultValue="************************" />
                  </div>
                  <Button variant="outline">Regenerar API Key</Button>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-3 text-red-600">Zona de Peligro</h4>
                <Button variant="destructive" className="w-full">Restablecer Sistema</Button>
              </div>

              <Button className="w-full">Guardar Cambios</Button>
            </div>
          </Card>
        </TabsContent>

        {/* Datos / SuperEfectivo Tab */}
        <TabsContent value="datos">
          <EtlPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
