# Implementación - Serviparamo/2-4-modulo-monitoreo-elt

## Objetivo
Documentar la implementación aplicada al checklist **2.4 Módulo: Monitoreo ELT**, enfocada en cerrar los gaps de UX detectados en la revisión de `Settings.tsx`.

## Rama de trabajo
- `Serviparamo/2-4-modulo-monitoreo-elt`

## Resumen de implementación
Se realizaron ajustes puntuales en el monitoreo ETL dentro de `Configuración` para:
- diferenciar visualmente el estado **"Iniciando…"** vs **"En ejecución…"**,
- y mostrar un mensaje final real cuando el polling detecta que el ETL terminó.

No se modificó backend ni servicios para este ajuste.

---

## Cambios implementados

### Frontend — `serviparamo/frontend/src/pages/Settings.tsx`

#### 1) Nuevo estado `etlStarting`
- Se agregó `const [etlStarting, setEtlStarting] = useState(false)`.
- Objetivo: distinguir el instante posterior al click de un estado ya confirmado por backend/polling.

#### 2) `loadETLStatus(silent)` con detección de transición `true -> false`
- Se capturan dos estados:
  - `wasRunning` (estado previo en frontend),
  - `isRunning` (estado actual desde `res.corriendo`).
- Se limpia `etlStarting` una vez recibido estado real del backend.
- Se agregó lógica de finalización solo en polling silencioso:
  - Si `silent && wasRunning && !isRunning`:
    - con errores: `Sincronización finalizada con N tabla(s) con errores.`
    - sin errores: `Sincronización completada. X tabla(s) actualizadas.`
    - sin resumen: `Sincronización finalizada.`

#### 3) `handleRunETL()` actualizado
- Al iniciar:
  - `setEtlRunning(true)`
  - `setEtlStarting(true)`
  - `setEtlMessage(null)`
- En error no-409:
  - limpia también `etlStarting(false)` para no dejar estado intermedio.

#### 4) Botón ETL con 3 estados
- `Sincronizar ERP` (idle)
- `Iniciando…` (click reciente, aún en fase start)
- `En ejecución…` (confirmado por backend/polling)

---

#### 5) Estilo del mensaje por tipo — fix aplicado por Claude
- El bloque `etlMessage` usaba siempre el mismo estilo azul, incluso para mensajes de error.
- Se agregó condición: si `etlMessage` contiene `"error"` o `"Error"` → fondo rojo (`bg-red-50 border-red-200 text-red-700`), caso contrario → azul (`bg-sp-blue-light border-sp-blue/20 text-sp-navy`).

---

## Archivo no modificado intencionalmente

### `serviparamo/frontend/src/services/serviparamoService.js`
- Sin cambios.
- Justificación: `getETLStatus()` ya entrega `corriendo` y `resumen`; la mejora era de estado UX en la página.

### `serviparamo/backend/serviparamo/views.py`
- Sin cambios.
- Justificación: el contrato backend requerido para este ajuste ya estaba implementado (`corriendo`, `resumen`, `409`).

---

## Archivos modificados

| Archivo | Cambios |
|---|---|
| `serviparamo/frontend/src/pages/Settings.tsx` | `etlStarting`, transición de finalización en polling y label de botón por estado |

---

## Validaciones ejecutadas

- Build frontend Servipáramo:
  - `cd serviparamo/frontend && npm run build`
  - Resultado: **OK**

---

## Criterios de aceptación cubiertos (2.4)

- [x] El botón distingue correctamente "Iniciando…" de "En ejecución…".
- [x] El polling detecta fin de ETL (`true -> false`) y muestra mensaje final real.
- [x] El manejo de `409` permanece funcional (sin regresión).
- [x] No se introducen cambios fuera del alcance (solo `Settings.tsx`).

## Estado
**2.4 Módulo: Monitoreo ELT — Ajuste UX implementado y documentado.**
