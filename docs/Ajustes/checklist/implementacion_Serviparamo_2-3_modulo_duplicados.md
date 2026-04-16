# Implementación - Serviparamo/2-3-modulo-duplicados

## Objetivo
Documentar los cambios implementados del checklist **2.3 Módulo: Duplicados** para alinear el estado ETL real del backend con los mensajes mostrados en frontend.

## Rama de trabajo
- `Serviparamo/2-3-modulo-duplicados`

## Resumen de implementación
Se implementaron ajustes en backend y frontend para que:
- el estado de ejecución ETL sea verificable en tiempo real,
- los mensajes de UI distingan correctamente el conflicto `409` ("ETL ya en ejecución"),
- y el módulo Duplicados muestre un estado vacío contextual según el estado ETL real.

---

## Verificación previa solicitada por Claude

Antes de implementar el resumen se validaron los campos reales de `ETLLog` en `models.py`:
- `tabla_destino`
- `filas_insertadas`
- `filas_error`
- `iniciado_en`
- `finalizado_en`
- `mensaje`

No existe campo `estado`, por lo que `tablas_con_error` se calcula usando `filas_error > 0`.

---

## Cambios implementados

### Backend — `serviparamo/backend/serviparamo/views.py`

#### `etl_run`
- Se corrigió el flag `_etl_running`:
  - `_etl_running = True` antes de iniciar el thread.
  - `_etl_running = False` en el `finally` del worker.
- Se mantiene `_etl_lock` como mecanismo de exclusión mutua.

#### `etl_status`
- Se mantuvo `data` para no romper contrato.
- Se agregó al response:
  - `corriendo`: usando `_etl_lock.locked()` como fuente de verdad.
  - `resumen`:
    - `total_tablas`
    - `tablas_con_error` (calculado con `filas_error > 0`)
    - `ultimo_inicio`
    - `ultimo_fin`
    - `ultimo_mensaje`
- Se agregan estos campos al mismo nivel que `ok` y `data` (fuera de `_ok(...)`).

---

### Frontend — `serviparamo/frontend/src/pages/Settings.tsx`

- `loadETLStatus()` ahora sincroniza estado real:
  - `setEtlStatus(res.data ?? [])`
  - `setEtlRunning(Boolean(res.corriendo))`
- Se agregó polling condicionado:
  - `useEffect` con `setInterval(loadETLStatus, 4000)` mientras `etlRunning === true`.
- `handleRunETL()` ahora maneja `409` explícitamente:
  - `if (err?.response?.status === 409) ...`
  - muestra mensaje de backend (`El ETL ya está en ejecución.`) en vez del genérico de conexión.
- Se eliminó dependencia del `setTimeout(5000)` y se pasó a refresco por estado real.
- **Fix aplicado por Claude**: `loadETLStatus` recibe flag `silent = false`. El polling llama `loadETLStatus(true)` para evitar que `setEtlLoading(true)` cause parpadeo de la tabla cada 4 segundos durante ETL en ejecución. La carga inicial sigue usando `silent=false` (muestra spinner).

---

### Frontend — `serviparamo/frontend/src/pages/DuplicateDetection.tsx`

- Se añadió `getETLStatus` en paralelo con `getDuplicados` (`Promise.all`).
- Nuevo estado local `etlStatus` con:
  - `corriendo`
  - `resumen`
- Se reemplazó el mensaje único de estado vacío por mensajes condicionados:
  - ETL corriendo.
  - Sin historial ETL.
  - Última ejecución con errores.
  - ETL exitoso sin duplicados.
- Se mantuvo sin cambios el flujo de paginación y aprobación de grupos.

---

## Archivo no modificado intencionalmente

### `serviparamo/frontend/src/services/serviparamoService.js`
- **Sin cambios** (según ajuste de Claude).
- Justificación: `unwrap = res.data` ya entrega el objeto completo, incluyendo campos nuevos (`corriendo`, `resumen`) sin tocar la capa de servicio.

---

## Archivos modificados

| Archivo | Cambios |
|---|---|
| `serviparamo/backend/serviparamo/views.py` | `etl_run` flags + `etl_status` con `corriendo` y `resumen` |
| `serviparamo/frontend/src/pages/Settings.tsx` | estado ETL real, polling 4s y manejo específico de 409 |
| `serviparamo/frontend/src/pages/DuplicateDetection.tsx` | estado ETL en paralelo y empty-state contextual |

---

## Validaciones ejecutadas

- Sintaxis backend:
  - `python3 -c "import ast, pathlib; ast.parse(pathlib.Path('serviparamo/backend/serviparamo/views.py').read_text())"`
  - Resultado: **OK**

- Build frontend Servipáramo:
  - `cd serviparamo/frontend && npm run build`
  - Resultado: **OK**

---

## Criterios de aceptación cubiertos (2.3)

- [x] Validación de estado ETL corregida y alineada a backend.
- [x] Revisión/corrección de flags de ejecución.
- [x] Estado backend extendido con `corriendo` y `resumen`.
- [x] Mensajes frontend corregidos, incluyendo caso `409`.
- [x] Consistencia entre estado real ETL y mensaje mostrado en Duplicados/Settings.

## Estado
**2.3 Módulo: Duplicados — Implementado.**
