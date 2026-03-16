import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Save, Bell, Database, Sparkles } from "lucide-react";

export default function Settings() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Configuración</h1>
        <p className="text-gray-600">
          Administre las preferencias y configuraciones de su gestor de catálogo con IA
        </p>
      </div>

      {/* General Settings */}
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

      {/* AI Configuration */}
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
              <p className="text-sm text-gray-500">
                Escanear automáticamente en busca de materiales duplicados
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-normalización</Label>
              <p className="text-sm text-gray-500">
                Aplicar sugerencias de IA automáticamente cuando la confianza sea alta
              </p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="confidence">Umbral Mínimo de Confianza</Label>
            <div className="flex items-center gap-4">
              <Input
                id="confidence"
                type="number"
                min="0"
                max="100"
                defaultValue="85"
                className="w-24"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="similarity">Sensibilidad de Detección de Duplicados</Label>
            <div className="flex items-center gap-4">
              <Input
                id="similarity"
                type="number"
                min="0"
                max="100"
                defaultValue="90"
                className="w-24"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
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
              <p className="text-sm text-gray-500">
                Recibir actualizaciones por correo electrónico
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alertas de Duplicados</Label>
              <p className="text-sm text-gray-500">
                Recibir notificaciones cuando se detecten duplicados
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reportes de Normalización</Label>
              <p className="text-sm text-gray-500">
                Resumen semanal de actividades de normalización
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
