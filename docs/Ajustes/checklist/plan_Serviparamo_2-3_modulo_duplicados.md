# Plan de Implementación - Serviparamo/2-3-modulo-duplicados

## Objetivo
Corregir la validación y visualización del estado del ETL en el módulo **Duplicados** para que el mensaje en frontend refleje el estado real del backend.

## Branch de trabajo
- `Serviparamo/2-3-modulo-duplicados`

## Alcance (Checklist 2.3)
- [ ] Corregir la validación del estado del ETL.
- [ ] Revisar flags de ejecución.
- [ ] Revisar estado en backend.
- [ ] Revisar mensajes mostrados en frontend.
- [ ] Asegurar consistencia entre el estado real del ETL y el mensaje mostrado.

---

## Diagnóstico del código — estado real

### Backend (`serviparamo/backend/serviparamo/views.py`)

1. `_etl_running` (línea 217) está declarado pero **nunca se asigna a `True`**.
   - `etl_run` declara `global _etl_running` pero no lo actualiza antes de `thread.start()`.
   - `_run()` declara `global _etl_running` pero tampoco lo actualiza en `finally`.
   - La fuente de verdad confiable ya existente es **`_etl_lock.locked()`**: el lock se adquiere antes del thread y se libera en el `finally` de `_run()`.

2. `etl_status` (línea 198-213) solo devuelve una lista de últimos logs por tabla, sin `corriendo` ni resumen.

3. `etl_run` devuelve `409` con `{'ok': False, 'error': 'El ETL ya está en ejecución.'}` — el contrato existe, el frontend no lo usa.

### Frontend Settings (`serviparamo/frontend/src/pages/Settings.tsx`)

4. `etlRunning` es local: se pone `true` durante el POST y vuelve a `false` al terminar. El ETL background sigue pero la UI no lo sabe.
5. El `catch` de `runETL` siempre muestra `"Error al iniciar el ETL. Revisa la conexión con el backend."` — no distingue `409`.

### Frontend Duplicados (`serviparamo/frontend/src/pages/DuplicateDetection.tsx`)

6. No consulta `getETLStatus`. Si no hay grupos, siempre muestra el mismo mensaje sin saber el estado real del ETL.

### Service (`serviparamo/frontend/src/services/serviparamoService.js`)

7. **Importante**: `unwrap = res.data` (no `res.data?.data`). Esto significa que `getETLStatus()` ya entrega directamente el objeto `{ok, data: [...]}` al componente. Al agregar `corriendo` al response del backend, el frontend lo leerá como `res.corriendo` — **no se necesita cambio en la capa de servicio**.

---

## Diseño técnico

### 1) Backend — `serviparamo/backend/serviparamo/views.py`

**Corregir `etl_run`** — actualizar `_etl_running` explícitamente:

```python
@api_view(['POST'])
def etl_run(request):
    global _etl_running

    if not _etl_lock.acquire(blocking=False):
        return Response(
            {'ok': False, 'error': 'El ETL ya está en ejecución.'},
            status=status.HTTP_409_CONFLICT,
        )

    _etl_running = True                          # ← AGREGAR: marcar antes del thread
    tablas = request.data.get('tablas', None)

    def _run():
        global _etl_running
        try:
            from serviparamo.etl import run
            run(tablas=tablas)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"ETL falló: {e}")
        finally:
            _etl_running = False                 # ← AGREGAR: limpiar al terminar
            _etl_lock.release()

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()

    return Response({
        'ok': True,
        'mensaje': 'ETL iniciado en segundo plano.',
        'tablas': tablas or 'todas',
    })
```

**Extender `etl_status`** — agregar `corriendo` y `resumen` sin romper `data`:

```python
@api_view(['GET'])
def etl_status(request):
    """Último registro del ETL por tabla, más estado de ejecución."""
    tablas = ETLLog.objects.values('tabla_destino').distinct()
    resultado = []
    for t in tablas:
        ultimo = (
            ETLLog.objects
            .filter(tabla_destino=t['tabla_destino'])
            .order_by('-iniciado_en')
            .first()
        )
        if ultimo:
            resultado.append(ETLLogSerializer(ultimo).data)

    # Resumen global: último log de toda la historia
    ultimo_global = ETLLog.objects.order_by('-iniciado_en').first()
    resumen = None
    if ultimo_global:
        resumen = {
            'total_tablas':     len(resultado),
            'tablas_con_error': sum(1 for r in resultado if r.get('estado') == 'error'),
            'ultimo_inicio':    ultimo_global.iniciado_en.isoformat() if ultimo_global.iniciado_en else None,
            'ultimo_fin':       ultimo_global.finalizado_en.isoformat() if ultimo_global.finalizado_en else None,
            'ultimo_mensaje':   ultimo_global.mensaje or '',
        }

    response_data = _ok(resultado)
    response_data['corriendo'] = _etl_lock.locked()   # fuente de verdad confiable
    response_data['resumen']   = resumen
    return Response(response_data)
```

> **Nota**: `_ok(resultado)` devuelve `{'ok': True, 'data': [...]}`. Se agregan `corriendo` y `resumen` al mismo nivel que `ok` y `data`. Como Servipáramo usa `unwrap = res.data` (no `res.data?.data`), el frontend recibe el objeto completo y accede a `res.data`, `res.corriendo`, `res.resumen` directamente.

Verificar qué campos tiene `ETLLog` para usar los nombres correctos:
- `tabla_destino`, `iniciado_en`, `finalizado_en`, `mensaje`, `estado` — confirmar en `serviparamo/backend/serviparamo/models.py` antes de implementar.

### 2) Frontend Settings — `serviparamo/frontend/src/pages/Settings.tsx`

**Sincronizar `etlRunning` desde backend y añadir polling:**

```tsx
// En loadETLStatus():
const res = await getETLStatus()
// res = { ok: true, data: [...logs...], corriendo: bool, resumen: {...} }
setEtlRunning(res.corriendo ?? false)
setEtlLogs(Array.isArray(res.data) ? res.data : [])

// Polling: mientras ETL corra, refrescar cada 4 segundos
useEffect(() => {
  loadETLStatus()
  let interval: ReturnType<typeof setInterval> | null = null
  if (etlRunning) {
    interval = setInterval(loadETLStatus, 4000)
  }
  return () => { if (interval) clearInterval(interval) }
}, [etlRunning])
```

**Manejar 409 en `handleRunETL`:**

```tsx
const handleRunETL = async () => {
  try {
    setEtlRunning(true)
    await runETL({ tablas: null })
    await loadETLStatus()
  } catch (err: any) {
    if (err?.response?.status === 409) {
      setError(err.response.data?.error ?? 'El ETL ya está en ejecución.')
    } else {
      setError('Error al iniciar el ETL. Revisa la conexión con el backend.')
    }
    setEtlRunning(false)
  }
}
```

### 3) Frontend Duplicados — `serviparamo/frontend/src/pages/DuplicateDetection.tsx`

**Agregar consulta de estado ETL en paralelo a `getDuplicados`:**

```tsx
// Estado adicional
const [etlStatus, setEtlStatus] = useState<{
  corriendo: boolean
  resumen: { tablas_con_error: number; total_tablas: number } | null
} | null>(null)

// En loadData() — cargar en paralelo:
const [dupRes, statusRes] = await Promise.all([
  getDuplicados({ page, search }),
  getETLStatus(),
])
setEtlStatus({
  corriendo: statusRes.corriendo ?? false,
  resumen:   statusRes.resumen ?? null,
})
// ... resto del manejo de duplicados
```

**Reemplazar mensaje único vacío por mensajes condicionados:**

```tsx
// Cuando total_grupos === 0:
function EmptyStateMessage({ etlStatus }: { etlStatus: ... }) {
  if (!etlStatus) {
    return <p>Cargando estado del sistema...</p>
  }
  if (etlStatus.corriendo) {
    return <p>El ETL está en ejecución. Espera a que finalice para ver duplicados actualizados.</p>
  }
  if (!etlStatus.resumen) {
    return <p>Aún no hay historial ETL. Ejecuta la primera sincronización desde Configuración.</p>
  }
  if (etlStatus.resumen.tablas_con_error > 0) {
    return <p>La última ejecución del ETL terminó con errores. Revisa Configuración → Sincronización ERP.</p>
  }
  return <p>No se detectaron duplicados con la última ejecución del ETL.</p>
}
```

Mantener la paginación y el flujo de aprobación/rechazo sin cambios.

---

## Archivos a modificar

| Archivo | Cambios |
|---|---|
| `serviparamo/backend/serviparamo/views.py` | `etl_run`: actualizar `_etl_running` antes/después del thread. `etl_status`: agregar `corriendo` y `resumen` al response. |
| `serviparamo/frontend/src/pages/Settings.tsx` | Leer `res.corriendo` en `loadETLStatus`, polling con `setInterval(4s)`, manejar 409 con mensaje específico. |
| `serviparamo/frontend/src/pages/DuplicateDetection.tsx` | Agregar `getETLStatus` en `loadData`, estado `etlStatus`, reemplazar mensaje vacío único por matriz de mensajes. |

> **No modificar** `serviparamo/frontend/src/services/serviparamoService.js`: el `unwrap = res.data` ya devuelve el objeto completo con todos los campos nuevos.

---

## Pasos de implementación

### 1) Backend
- [ ] Verificar nombres de campos de `ETLLog` en `models.py` (especialmente `estado`, `finalizado_en`, `mensaje`).
- [ ] Actualizar `etl_run`: asignar `_etl_running = True` antes de `thread.start()` y `_etl_running = False` en el `finally` de `_run()`.
- [ ] Extender `etl_status`: construir `resumen` desde queryset, agregar `corriendo = _etl_lock.locked()` y `resumen` al response fuera del `_ok()`.

### 2) Frontend Settings
- [ ] En `loadETLStatus()`: leer `res.corriendo` para `setEtlRunning`, leer `res.data` para logs.
- [ ] Agregar `useEffect` con `setInterval(loadETLStatus, 4000)` mientras `etlRunning === true`.
- [ ] En `handleRunETL` catch: detectar `err?.response?.status === 409` y mostrar mensaje del backend.

### 3) Frontend Duplicados
- [ ] Agregar estado `etlStatus` con `corriendo` y `resumen`.
- [ ] Cambiar `loadData` a `Promise.all([getDuplicados(...), getETLStatus()])`.
- [ ] Crear componente/bloque `EmptyStateMessage` con los 4 casos condicionados.
- [ ] Mantener paginación y aprobación sin regresión.

### 4) Validación funcional
- [ ] Caso A: ETL corriendo → Settings y Duplicados muestran estado en ejecución.
- [ ] Caso B: doble click en ejecutar → segundo intento muestra "El ETL ya está en ejecución."
- [ ] Caso C: ETL con error → Duplicados muestra mensaje de fallo real, no "sin duplicados".
- [ ] Caso D: ETL exitoso sin duplicados → mensaje correcto de 0 duplicados.

---

## Criterios de aceptación
- El estado mostrado en frontend coincide con el estado real del ETL backend.
- No hay mensajes ambiguos en Duplicados cuando `total_grupos = 0`.
- El conflicto de ejecución concurrente (409) se comunica correctamente al usuario.
- Settings y Duplicados consumen el mismo origen de verdad de estado ETL (`getETLStatus`).
- La capa de servicio (`serviparamoService.js`) no requiere cambios.
