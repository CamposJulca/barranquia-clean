# Plan de Implementación - Joz/1-7-modulo-configuraciones

## Objetivo
Definir e implementar el alcance funcional del módulo **Configuraciones** de JOZ, evitando mostrar funcionalidades incompletas al usuario final.

## Branch de trabajo
- `Joz/1-7-modulo-configuraciones`

## Alcance (Checklist 1.7)
- [ ] Definir alcance funcional de cada sección.
- [ ] Implementar o deshabilitar temporalmente las opciones sin funcionalidad.
- [ ] Evitar mostrar features incompletas al usuario final.

---

## Diagnóstico del código — estado real

### `joz/frontend/src/pages/Settings.tsx`

5 tabs: `users`, `detection`, `notifications`, `system`, `datos`.

| Tab | Estado actual | Problema |
|---|---|---|
| **Usuarios** | UI estática con usuarios hardcodeados, botón "Agregar" sin acción real | Aparenta funcionar sin backend |
| **Detección** | Switches con `defaultChecked`, inputs con `defaultValue`, botón "Guardar" sin acción real | Aparenta persistir sin backend |
| **Notificaciones** | Switches y emails hardcodeados, botón "Guardar" sin acción real | Aparenta persistir sin backend |
| **Sistema** | Select hardcodeados + `<Button variant="destructive">Restablecer Sistema</Button>` activo | Acción destructiva expuesta sin backend — **riesgo** |
| **Datos (ETL)** | Funcional con `getEtlStatus`/`runEtl` | **Bug activo**: usa `getEtlStatus()` en lugar de `getEtlStatusFull()` → `corriendo` siempre `false`, logs siempre vacíos. También usa tema claro (`text-gray-500`, `bg-gray-50`). |

### Backend
- No existen endpoints de configuración para usuarios, reglas, notificaciones ni sistema.
- Sí existen `/etl/run/` y `/etl/status/` que respaldan la tab Datos.
- No hay modelo persistente para configuración.

---

## Decisión funcional por sección (MVP 1.7)

| Sección | Decisión |
|---|---|
| **Usuarios** | Deshabilitar. Mostrar panel informativo: "Gestión de usuarios administrada desde el Hub central." |
| **Detección** | **Implementar** lectura/escritura real (GET/PATCH) con modelo `ConfigDeteccion`. |
| **Notificaciones** | Deshabilitar. Mostrar panel informativo con badge "Próximamente". |
| **Sistema** | Deshabilitar. Mostrar panel informativo. **Eliminar** el botón destructivo activo. |
| **Datos (ETL)** | Mantener funcional. **Corregir bug** de `getEtlStatus` y migrar a dark theme. |

---

## Diseño técnico

### 1) Backend — nuevo modelo `ConfigDeteccion`

Agregar en `joz/backend/joz/models.py`:

```python
class ConfigDeteccion(models.Model):
    enabled_alto_valor              = models.BooleanField(default=True)
    enabled_multiples_transacciones = models.BooleanField(default=True)
    enabled_horario_inusual         = models.BooleanField(default=True)
    enabled_descuentos_excesivos    = models.BooleanField(default=False)
    monto_maximo                    = models.DecimalField(max_digits=18, decimal_places=2, default=10000000)
    descuento_maximo_pct            = models.IntegerField(default=50)
    transacciones_por_hora          = models.IntegerField(default=20)
    score_riesgo_min                = models.IntegerField(default=75)
    updated_at                      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'joz_config_deteccion'
```

**Migración** — ejecutar en el entorno de desarrollo después de agregar el modelo:
```bash
python manage.py makemigrations joz
python manage.py migrate
```

### 2) Backend — endpoint `config_deteccion`

Agregar en `joz/backend/joz/views.py`:

```python
@api_view(['GET', 'PATCH'])
def config_deteccion(request):
    """
    GET  → Configuración de detección actual (singleton, crea defaults si no existe).
    PATCH → Actualizar configuración con validación de rangos.
    """
    # Singleton: get_or_create con pk=1 (solo hay un registro global)
    config, _ = ConfigDeteccion.objects.get_or_create(pk=1)

    if request.method == 'GET':
        return Response(_ok(_serializar_config(config)))

    # PATCH: validar y actualizar
    data = request.data
    errores = {}

    bool_fields = [
        'enabled_alto_valor', 'enabled_multiples_transacciones',
        'enabled_horario_inusual', 'enabled_descuentos_excesivos',
    ]
    for field in bool_fields:
        if field in data:
            setattr(config, field, bool(data[field]))

    if 'monto_maximo' in data:
        try:
            v = float(data['monto_maximo'])
            if v <= 0: errores['monto_maximo'] = 'Debe ser mayor que 0.'
            else: config.monto_maximo = v
        except (ValueError, TypeError):
            errores['monto_maximo'] = 'Valor numérico inválido.'

    if 'descuento_maximo_pct' in data:
        try:
            v = int(data['descuento_maximo_pct'])
            if not (0 <= v <= 100): errores['descuento_maximo_pct'] = 'Debe estar entre 0 y 100.'
            else: config.descuento_maximo_pct = v
        except (ValueError, TypeError):
            errores['descuento_maximo_pct'] = 'Valor entero inválido.'

    if 'transacciones_por_hora' in data:
        try:
            v = int(data['transacciones_por_hora'])
            if v <= 0: errores['transacciones_por_hora'] = 'Debe ser mayor que 0.'
            else: config.transacciones_por_hora = v
        except (ValueError, TypeError):
            errores['transacciones_por_hora'] = 'Valor entero inválido.'

    if 'score_riesgo_min' in data:
        try:
            v = int(data['score_riesgo_min'])
            if not (0 <= v <= 100): errores['score_riesgo_min'] = 'Debe estar entre 0 y 100.'
            else: config.score_riesgo_min = v
        except (ValueError, TypeError):
            errores['score_riesgo_min'] = 'Valor entero inválido.'

    if errores:
        return _err(errores)

    config.save()
    return Response(_ok(_serializar_config(config)))


def _serializar_config(config):
    return {
        'enabled_alto_valor':              config.enabled_alto_valor,
        'enabled_multiples_transacciones': config.enabled_multiples_transacciones,
        'enabled_horario_inusual':         config.enabled_horario_inusual,
        'enabled_descuentos_excesivos':    config.enabled_descuentos_excesivos,
        'monto_maximo':                    float(config.monto_maximo),
        'descuento_maximo_pct':            config.descuento_maximo_pct,
        'transacciones_por_hora':          config.transacciones_por_hora,
        'score_riesgo_min':                config.score_riesgo_min,
        'updated_at':                      config.updated_at.isoformat(),
    }
```

Agregar en `joz/backend/joz/urls.py`:
```python
path('config/deteccion/', views.config_deteccion, name='joz-config-deteccion'),
```

Agregar import en `views.py` (junto a los otros modelos):
```python
from .models import Transaccion, Alerta, Riesgo, ETLLog, ConfigDeteccion
```

### 3) Frontend — `joz/frontend/src/services/api.js`

Agregar:
```js
export const getConfigDeteccion = async () => {
  const res = await api.get('/config/deteccion/')
  return unwrap(res)
}

export const updateConfigDeteccion = async (payload) => {
  const res = await api.patch('/config/deteccion/', payload)
  return unwrap(res)
}
```

### 4) Frontend — `joz/frontend/src/pages/Settings.tsx`

#### Header de la página (dark theme)
```tsx
<h1 className="text-2xl font-bold text-white flex items-center gap-2">
  <SettingsIcon className="w-6 h-6 text-amber-400" />
  Configuración
</h1>
<p className="text-amber-200/60 text-sm mt-1">Ajustes del sistema y preferencias</p>
```

#### Panel de sección deshabilitada (componente reutilizable interno)

```tsx
function DisabledSection({ title, message }: { title: string; message: string }) {
  return (
    <Card className="bg-slate-900 border-amber-500/20 p-8 text-center">
      <Lock className="w-10 h-10 text-amber-500/30 mx-auto mb-3" />
      <p className="text-amber-200/60 font-medium">{title}</p>
      <p className="text-amber-200/30 text-sm mt-2">{message}</p>
      <Badge variant="outline" className="mt-4 bg-amber-500/10 text-amber-300 border-amber-500/30">
        No disponible en esta versión
      </Badge>
    </Card>
  )
}
```

Importar `Lock` de `lucide-react`.

#### Tab Usuarios
```tsx
<TabsContent value="users">
  <DisabledSection
    title="Gestión de Usuarios"
    message="La gestión de accesos y usuarios se administra desde el Hub central."
  />
</TabsContent>
```

#### Tab Notificaciones
```tsx
<TabsContent value="notifications">
  <DisabledSection
    title="Notificaciones"
    message="La configuración de canales y alertas estará disponible en una próxima versión."
  />
</TabsContent>
```

#### Tab Sistema
```tsx
<TabsContent value="system">
  <DisabledSection
    title="Parámetros del Sistema"
    message="La configuración de sistema está gestionada por el equipo técnico."
  />
</TabsContent>
```

#### Tab Detección — integración real

```tsx
function DetectionPanel() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    getConfigDeteccion()
      .then(setConfig)
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = (field: string, value: boolean) => {
    setConfig((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleThreshold = (field: string, value: string) => {
    setConfig((prev: any) => ({ ...prev, [field]: Number(value) }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const updated = await updateConfigDeteccion(config)
      setConfig(updated)
      setSuccessMsg('Configuración guardada correctamente.')
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al guardar configuración.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <Card className="bg-slate-900 border-amber-500/20 p-10 flex items-center justify-center gap-3 text-amber-200/60">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>Cargando configuración...</span>
    </Card>
  )

  if (error && !config) return (
    <Card className="bg-red-500/10 border-red-500/30 p-6 text-red-300">{error}</Card>
  )

  // Renderizar toggles y umbrales usando `config.*` como controlled inputs
  // Switches: checked={config.enabled_alto_valor} onCheckedChange={(v) => handleToggle('enabled_alto_valor', v)}
  // Inputs: value={config.monto_maximo} onChange={(e) => handleThreshold('monto_maximo', e.target.value)}
  // Aplicar dark theme: bg-slate-800, border-amber-500/20, texto slate-100/amber-200
  // Mostrar successMsg en verde amber y error en rojo si config ya cargó
  // Botón Guardar: disabled={saving}, muestra spinner si saving
}
```

#### Tab Datos (ETL) — corrección del bug + dark theme

**Bug**: `EtlPanel` usa `getEtlStatus()` (que devuelve array de logs vía `unwrap`) pero luego accede `res.data?.corriendo` que siempre es `undefined`. Corregir usando `getEtlStatusFull()`:

```tsx
// Cambiar import:
import { getEtlStatusFull, runEtl } from '../services/api'

// En cargarEstado():
const res = await getEtlStatusFull()
// res = { ok: true, data: [...logs...], corriendo: bool }
setCorriendo(res.corriendo ?? false)
setLogs(Array.isArray(res.data) ? res.data : [])

// En handleRun(), res de runEtl() ya está unwrapped:
const res = await runEtl({...})
// res = { corriendo: true, mensaje: '...', ... }
setMensaje(res.mensaje ?? 'ETL iniciado.')
setCorriendo(true)
```

Migrar `EtlPanel` a dark theme:
- Cards: `bg-slate-900 border-amber-500/20`
- Texto principal: `text-white` / `text-slate-100`
- Texto secundario: `text-amber-200/60`
- Badge "Corriendo": `bg-amber-500/15 text-amber-300 border-amber-500/30`
- Badge "En reposo": `bg-emerald-500/15 text-emerald-300 border-emerald-500/30`
- Tabla: headers `bg-slate-950/80 border-amber-500/20 text-amber-200/70`, filas `divide-amber-500/10`, celdas `text-slate-300`
- Botón Ejecutar: mantener funcionalidad, aplicar clases amber

---

## Archivos a modificar

| Archivo | Cambios |
|---|---|
| `joz/backend/joz/models.py` | Nuevo modelo `ConfigDeteccion` |
| `joz/backend/joz/views.py` | Import `ConfigDeteccion`, nuevas vistas `config_deteccion` y `_serializar_config` |
| `joz/backend/joz/urls.py` | Ruta `config/deteccion/` |
| `joz/backend/joz/migrations/` | Migración generada con `makemigrations` |
| `joz/frontend/src/services/api.js` | `getConfigDeteccion` y `updateConfigDeteccion` |
| `joz/frontend/src/pages/Settings.tsx` | Feature gating + `DetectionPanel` real + `EtlPanel` fix + dark theme completo |

---

## Pasos de implementación

### 1) Backend
- [ ] Agregar modelo `ConfigDeteccion` en `models.py`.
- [ ] Agregar `ConfigDeteccion` al import de `views.py`.
- [ ] Implementar `_serializar_config()` y `config_deteccion()` en `views.py`.
- [ ] Registrar ruta `config/deteccion/` en `urls.py`.
- [ ] Ejecutar `python manage.py makemigrations joz && python manage.py migrate`.

### 2) Frontend
- [ ] Agregar `getConfigDeteccion` y `updateConfigDeteccion` en `api.js`.
- [ ] Reescribir `Settings.tsx`:
  - Header con dark theme.
  - Componente `DisabledSection`.
  - Tabs Usuarios, Notificaciones, Sistema → `DisabledSection`.
  - `DetectionPanel` con estados `loading/saving/error/success` y datos reales.
  - `EtlPanel` corregido (usar `getEtlStatusFull`, parsing correcto) y con dark theme.

### 3) Validación
- [ ] `GET /config/deteccion/` retorna defaults en DB limpia (sin error 404).
- [ ] `PATCH /config/deteccion/` persiste y se refleja en recarga.
- [ ] `descuento_maximo_pct=150` retorna 400 con mensaje claro.
- [ ] Tabs deshabilitadas no exponen inputs ni botones activos.
- [ ] ETL: `corriendo` se refleja correctamente, logs cargan.
- [ ] ETL: ejecutar ETL muestra mensaje real del backend.

---

## Criterios de aceptación
- No hay formularios "falsos": lo que se puede editar persiste; lo que no existe está deshabilitado con mensaje claro.
- Detección funcional de extremo a extremo (GET/PATCH + UI controlled).
- Usuarios, Notificaciones y Sistema muestran panel deshabilitado, sin botones activos.
- Botón "Restablecer Sistema" eliminado del DOM.
- ETL muestra estado real y logs correctamente.
- Dark theme consistente en toda la página.

---

## Fuera de alcance (esta iteración)
- CRUD real de usuarios (depende de modelo central del Hub).
- Envío real de notificaciones.
- Acciones sensibles de sistema con backend real.
