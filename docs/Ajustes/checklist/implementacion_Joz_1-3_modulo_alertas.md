# Implementación - Joz/1-3-modulo-alertas

## Objetivo
Documentar los cambios implementados en el punto **1.3 Módulo: Alertas** del checklist del cliente.

## Rama de trabajo
- `Joz/1-3-modulo-alertas`

## Resumen de implementación
Se corrigieron los problemas funcionales de filtros y buscador, y se ajustó la tabla de Alertas para cumplir el lineamiento visual y funcional solicitado por cliente.

---

## Cambios implementados por bug

### Bug 1: Filtro por nivel no aplicaba correctamente ✅
- Backend normaliza `nivel_riesgo` a minúsculas (`.lower()`) y acepta tanto valores en inglés (`high/medium/low`) como en español (`alto/medio/bajo`).
- Para nivel alto se incluyen severidades `alta` y `critica`.
- Frontend envía `value="high"`, `"medium"`, `"low"` desde el Select de riesgo.

### Bug 2: Filtro por almacén ignorado ✅
- Backend lee parámetro `almacen` (con fallback a `tienda`), extrae dígitos del valor y filtra `transaccion__almacen=int(...)`.
- Backend expone `almacen_codigo` en cada resultado.
- Frontend mapea `storeCode` desde `almacen_codigo`, construye lista de tiendas únicas por código y envía `almacen: Number(storeFilter)`.

### Bug 3: Buscador sin implementación ✅
- Backend filtra `Q(tipo__icontains=q) | Q(descripcion__icontains=q)` cuando se recibe el parámetro `q`.

### Bug 4: Tabla en tema claro ✅
- `AlertsTable.tsx` migrado completamente a dark theme (`slate/amber`).
- Header: `bg-slate-950/80 border-amber-500/20`, texto `text-amber-200/70`.
- Filas: `bg-slate-900 hover:bg-slate-800/60`, texto `text-amber-100`.
- Badges de riesgo y estado con variantes `/10 opacity` del dark theme.
- Botón "Ver" con hover amber.

### Bug 5: Fallback de texto en anomalía ✅
- Tipo de anomalía se muestra como `Badge` con clase `bg-amber-500/10 text-amber-200 border-amber-500/30`.
- Sin valor, muestra `—` en lugar del texto `"Sin descripción"`.

---

## Regresión corregida en validación

Durante la implementación de ChatGPT, `Alerts.tsx` fue reescrito perdiendo funcionalidad existente. Fue restaurada:

| Elemento perdido | Estado |
|---|---|
| `error` state + UI de error con `AlertTriangle` y botón Reintentar | Restaurado |
| Auto-refresh cada 30s (`setInterval`) | Restaurado |
| Estado de carga con `Loader` animado dentro de Card estilizada | Restaurado |
| Estado vacío con icono Bell y mensajes amber | Restaurado |
| Header con icono Bell, título amber y botón Actualizar con `RefreshCw` | Restaurado |
| `useCallback` para evitar re-renders innecesarios | Restaurado |
| Filtros con clases dark theme (`bg-slate-900 border-amber-500/20`) | Restaurado |
| `page_size` restaurado a 50 | Restaurado |

---

## Archivos modificados

| Archivo | Cambios |
|---|---|
| `joz/backend/joz/views.py` | Filtro `nivel_riesgo` con mapa completo, filtro `almacen`, filtro `q`, campo `almacen_codigo` en respuesta |
| `joz/frontend/src/pages/Alerts.tsx` | Valores de Select corregidos, filtro almacén por código, regresiones restauradas |
| `joz/frontend/src/components/AlertsTable.tsx` | Dark theme completo, tipo `storeCode` agregado, estados backend (`abierta/en_revision/resuelta/descartada`), anomalía como Badge |

---

## Validaciones

- `python3 -m py_compile joz/backend/joz/views.py` → OK
- `cd joz/frontend && npm run build` → OK (validado por ChatGPT)

## Criterios de aceptación cubiertos

- [x] Filtro por nivel funciona para `Alto`, `Medio` y `Bajo` (incluyendo `critica` como `Alto`).
- [x] Filtro por almacén devuelve resultados del almacén seleccionado.
- [x] Filtros nivel + almacén combinables sin romper resultados.
- [x] Buscador filtra por tipo de anomalía y descripción.
- [x] UI no muestra descripciones ni ayudas visuales del tipo de anomalía.
- [x] Tipo de anomalía se muestra solo como etiqueta (Badge).
- [x] Estados de carga, error y vacío funcionan visualmente.
- [x] Auto-refresh cada 30s activo.

## Estado
**1.3 Módulo: Alertas — Completado.**
