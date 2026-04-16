# Plan de Implementación - Serviparamo/2-4-modulo-monitoreo-elt

## Objetivo
Validar el estado funcional del monitoreo ETL y corregir los dos gaps de UX encontrados en `Settings.tsx` tras revisión de código.

## Branch de trabajo
`Serviparamo/2-4-modulo-monitoreo-elt`

## Alcance (Checklist 2.4)
- [ ] Validar el funcionamiento general del módulo.
- [ ] Confirmar/corregir gaps encontrados en la revisión de código.

---

## Estado actual del módulo (post 2.3)

No existe una ruta dedicada "Monitoreo ELT". El monitoreo vive en `/settings` dentro de la sección **Sincronización ERP** de `Settings.tsx`. Esto es intencional y suficiente para el alcance de 2.4 — no se crea página nueva.

### Lo que ya funciona correctamente
- `etl_status` expone `corriendo`, `resumen` y `data` (logs por tabla). ✅
- `etl_run` actualiza `_etl_running` y maneja 409. ✅
- `loadETLStatus(silent)` sincroniza `etlRunning` desde backend. ✅
- Polling cada 4s mientras `etlRunning === true`. ✅
- Error 409 muestra mensaje del backend, no genérico. ✅

---

## Gaps encontrados en revisión de código

### Gap 1 — Etiqueta del botón invariante (`Settings.tsx` línea 122-126)

**Problema**: `etlRunning` es `true` tanto al hacer click como durante todo el polling. El botón muestra `"Iniciando…"` aunque el ETL lleve 10 minutos corriendo.

**Código actual:**
```tsx
{etlRunning ? (
  <><Loader className="w-4 h-4 mr-2 animate-spin" />Iniciando…</>
) : (
  <><RefreshCw className="w-4 h-4 mr-2" />Sincronizar ERP</>
)}
```

**Fix**: Agregar estado `etlStarting` para distinguir entre "acabo de hacer click" y "ETL ya confirmado corriendo desde backend". `etlStarting` se pone `true` en `handleRunETL` y se limpia en la primera llamada a `loadETLStatus` (silent o no).

```tsx
// Nuevo estado:
const [etlStarting, setEtlStarting] = useState(false);

// En handleRunETL, al inicio:
setEtlStarting(true);

// En loadETLStatus, después de setEtlRunning:
setEtlStarting(false);   // una vez que el backend confirmó estado, ya no "starting"

// En el botón:
{etlRunning ? (
  etlStarting
    ? <><Loader className="w-4 h-4 mr-2 animate-spin" />Iniciando…</>
    : <><Loader className="w-4 h-4 mr-2 animate-spin" />En ejecución…</>
) : (
  <><RefreshCw className="w-4 h-4 mr-2" />Sincronizar ERP</>
)}
```

### Gap 2 — Sin mensaje de finalización vía polling (`Settings.tsx` líneas 41-53, 57-63)

**Problema**: Cuando el polling detecta `corriendo: false` y setea `setEtlRunning(false)`, `etlMessage` permanece mostrando `"ETL iniciado en segundo plano."` indefinidamente. El usuario no sabe si terminó bien o mal.

**Fix**: En `loadETLStatus`, al detectar que `corriendo` pasó de `true` a `false`, actualizar `etlMessage` con el resultado del resumen:

```tsx
const loadETLStatus = async (silent = false) => {
  if (!silent) setEtlLoading(true);
  try {
    const res: ETLStatusData = await getETLStatus();
    const estabaCorreindo = etlRunning;               // capturar estado previo
    setEtlStatus(res.data ?? []);
    setEtlRunning(Boolean(res.corriendo));
    setEtlStarting(false);

    // Si el ETL acaba de terminar (polling detectó transición true -> false)
    if (estabaCorreindo && !res.corriendo && silent) {
      if (res.resumen && res.resumen.tablas_con_error > 0) {
        setEtlMessage(
          `Sincronización finalizada con ${res.resumen.tablas_con_error} tabla(s) con errores.`
        );
      } else if (res.resumen) {
        setEtlMessage(
          `Sincronización completada. ${res.resumen.total_tablas} tabla(s) actualizadas.`
        );
      } else {
        setEtlMessage('Sincronización finalizada.');
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
```

> **Nota**: La condición `silent` en el if asegura que el mensaje de finalización solo aparece cuando lo detecta el polling (background), no cuando el usuario hace click en "Actualizar" manualmente.

---

## Archivos a modificar

| Archivo | Cambios |
|---|---|
| `serviparamo/frontend/src/pages/Settings.tsx` | Agregar `etlStarting` state, actualizar `loadETLStatus` con detección de transición, actualizar label del botón. |

---

## Pasos de implementación

### 1) Agregar estado `etlStarting`
- Declarar `const [etlStarting, setEtlStarting] = useState(false)` junto a los otros estados.

### 2) Actualizar `loadETLStatus`
- Capturar `etlRunning` antes de la llamada como `const estabaCorreindo = etlRunning`.
- Llamar `setEtlStarting(false)` después de `setEtlRunning(...)`.
- Agregar el bloque `if (estabaCorreindo && !res.corriendo && silent)` para mensaje de finalización.

### 3) Actualizar `handleRunETL`
- Agregar `setEtlStarting(true)` al inicio del handler (antes del try).

### 4) Actualizar label del botón
- Reemplazar el ternario simple por la lógica de tres estados descripta arriba.

### 5) Validación funcional
- [ ] Click en "Sincronizar ERP" → muestra "Iniciando…" brevemente.
- [ ] Tras primer polling → cambia a "En ejecución…".
- [ ] ETL termina sin error → mensaje "Sincronización completada. X tabla(s) actualizadas."
- [ ] ETL termina con errores → mensaje "Sincronización finalizada con N tabla(s) con errores."
- [ ] Click manual "Actualizar" → no sobreescribe el mensaje de finalización.

---

## Criterios de aceptación
- Botón ETL diferencia visualmente "iniciando" de "en ejecución".
- Al finalizar el ETL (detectado por polling), el usuario ve un mensaje de resultado claro.
- Los estados previos (corriendo, 409, error de red) no se rompen.
- El build de frontend compila sin errores TypeScript.
