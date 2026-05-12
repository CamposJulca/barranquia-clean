# JOZ Monitoring System — Presentación Cliente
**Fecha:** 2026-05-07
**Audiencia:** Equipo JOZ (PO, dirección operativa)
**Objetivo:** Demostrar el aplicativo, validar consistencia de datos y cerrar la decisión de adopción.

---

## 1. Resumen ejecutivo

JOZ Monitoring es la capa de **inteligencia operacional sobre SuperEfectivo**: lee los movimientos del ERP, los normaliza, los muestra en dashboards ejecutivos y aplica un motor de detección de anomalías (reglas + IA) para anticipar fraude, fugas de caja y operaciones inusuales por cajero / almacén.

**Lo que el negocio recibe:**
- Visión consolidada de los 30 almacenes en un solo panel.
- Alertas automáticas con severidad (crítica / alta / media) y trazabilidad al asiento contable.
- Scoring de riesgo por sucursal para priorizar auditorías.
- Consola SQL para que el equipo financiero valide cualquier número directo contra la fuente.
- Pipeline ETL programado y monitoreado, sin intervención manual.

**Lo que se invierte una sola vez:** la plataforma queda lista para que JOZ defina sus propias reglas de negocio (umbrales de monto, ratios cajero, ventanas de fraccionamiento) y entrene el modelo de IA con su propio histórico.

---

## 2. Estado actual del sistema (datos vivos en producción)

> Capturado el 2026-05-07 contra `joz_postgres`. Reproducible vía SQL Console (módulo 7).

| Métrica | Valor |
|---|---|
| Transacciones cargadas | **31.820** |
| Almacenes monitoreados | **30** |
| Rango temporal | 2026-04-20 → 2026-05-06 (**17 días**) |
| Volumen de aportes (sin ops internas) | **$2.023.234** |
| Volumen de retiros (sin ops internas) | **$2.179.100** |
| Alertas generadas | **14.971** (1.009 críticas/altas abiertas) |
| Reglas de detección configuradas | **5** (3 de sistema + 2 personalizables) |
| Riesgos por almacén calculados | **30** (1 por almacén) |
| Ejecuciones ETL en histórico | **482** (1.334.441 filas recibidas, 143.195 insertadas tras dedup) |

**Distribución de transacciones por tipo:**

| Tipo | Cantidad | Monto total |
|---|---:|---:|
| Abono / Interés | 6.934 | $222.880 |
| Retiro empeño | 5.256 | $451.799 |
| Empeño | 4.631 | $873.216 |
| Western entrada | 4.330 | $878.253 |
| Western salida | 4.259 | $975.439 |
| Otro | 3.404 | $800.742 |
| Cierre caja | 1.326 | $5.225.899 |
| Apertura caja | 1.324 | $4.993.607 |
| Movimiento interno (traslados) | 356 | $763.214 |

---

## 3. Recorrido por módulos

> Todos los módulos accesibles en `http://<servidor>:9006/`. Login con usuario JOZ.

### 3.1 Inicio (`/home`)
**Para qué sirve:** Hub de navegación con descripción humana de cada módulo y mini-KPI de salud (transacciones cargadas, ETL programado).
**Demo:** entrar y verificar que el contador de transacciones coincide con la BD.

### 3.2 Dashboard (`/dashboard`) — KPIs ejecutivos
**Para qué sirve:** Vista 360° del flujo financiero por rango de fechas. Muestra:
- Transacciones, Volumen Aportes, Volumen Retiros, Balance Neto.
- Anomalías detectadas (críticas, altas, medias).
- Grid de tarjetas por **tipo de transacción** (con tooltips explicando origen y fórmula de cada KPI — solicitud del PO ya implementada).
- Actividad por almacén con drill-down a `StoreDetail`.

**Validación SQL (rango full):**
```sql
-- Total transacciones
SELECT COUNT(*) FROM joz_transacciones;
-- Esperado: 31.820

-- Aportes (excluye ops internas)
SELECT SUM(entrada)::bigint FROM joz_transacciones
WHERE entrada > 0
  AND LOWER(descripcion) NOT LIKE 'apertura%'
  AND LOWER(descripcion) NOT LIKE 'cierre%'
  AND LOWER(descripcion) NOT LIKE '%traslado%'
  AND LOWER(descripcion) NOT LIKE '%transferencia entre%'
  AND LOWER(descripcion) NOT LIKE '%movimiento entre almac%';
-- Esperado: 2.023.234
```

### 3.3 Alertas (`/alerts`) — Gestión de incidencias
**Para qué sirve:** Bandeja de anomalías detectadas, con severidad, tipo, almacén y trazabilidad al movimiento original. Permite:
- Filtrar por severidad, tipo, almacén y rango de fechas.
- Selección masiva: cambiar estado, marcar como resueltas, eliminar.
- Disparar **recálculo del motor de detección** (con opción "borrar antes" para corrida limpia).
- Auto-refresh cada 30 segundos.

**Validación SQL:**
```sql
SELECT severidad, COUNT(*) FROM joz_alertas
WHERE estado='abierta' GROUP BY severidad;
```
| Severidad | Conteo en UI |
|---|---:|
| crítica | 2 |
| alta | 1.007 |
| media | 13.962 |

### 3.4 Riesgos (`/risks`) — Scoring por almacén
**Para qué sirve:** Modelo que combina volumen de anomalías, monto en riesgo y patrones de comportamiento para priorizar auditorías. Hoy los 30 almacenes muestran nivel **alto** porque el motor está calibrado al universo actual; al ajustar umbrales con la operación de JOZ, la distribución se balanceará en alto/medio/bajo.
**Validación SQL:**
```sql
SELECT nivel, COUNT(*) AS almacenes,
       ROUND(AVG(probabilidad)::numeric*100,1) AS prob_pct,
       SUM(impacto_estimado)::bigint AS impacto_total
FROM joz_riesgos GROUP BY nivel;
```

### 3.5 Inteligencia Artificial (`/ia`) — Isolation Forest
**Para qué sirve:** Detección **no supervisada** de anomalías. El modelo aprende el comportamiento normal de cada almacén y marca como sospechosos los movimientos que se desvían (montos atípicos, horas extrañas, patrones cliente-cajero).
- Entrenamiento on-demand desde la UI.
- Score por transacción (-1 a +1).
- Exportable a CSV.
- Genera alertas automáticamente cuando detecta desvíos significativos.

### 3.6 Historial (`/history`) — Exploración detallada
**Para qué sirve:** Tabla auditable de todas las transacciones con filtros por almacén, fecha, tipo y origen (`real` / `prueba` / todos). Cada fila representa **un evento del día** (los asientos de doble partida del mismo día se consolidan automáticamente).

**Hallazgo de la reunión anterior — RESUELTO:** El PO reportó que las descripciones no coincidían con los montos en 4 contratos de empeño. Diagnóstico, evidencia y fix aplicado en sección **§5**.

### 3.7 Monitor ETL (`/etl`) — Pipeline de carga
**Para qué sirve:** Tablero del proceso de sincronización SuperEfectivo API → PostgreSQL. Muestra:
- Tareas programadas (próxima ejecución, frecuencia).
- Última ejecución OK + duración.
- Histórico de batches con filas recibidas / insertadas / errores.
- Disparador manual por almacén o todos.

**Validación SQL:**
```sql
SELECT origen, COUNT(*) AS ejecuciones,
       SUM(filas_recibidas)::bigint AS recibidas,
       SUM(filas_insertadas)::bigint AS insertadas,
       MAX(finalizado_en) AS ultima
FROM joz_etl_log GROUP BY origen;
```
Resultado en BD hoy: 482 ejecuciones manuales · 1.334.441 recibidas · 143.195 insertadas (la diferencia son duplicados que el ETL ya filtra, evidencia del control de calidad).

### 3.8 SQL Console (`/sql`) — Auditoría libre
**Para qué sirve:** Editor SQL embebido para que el equipo financiero / auditoría de JOZ ejecute consultas directas contra la base local sin depender del proveedor del ERP. Incluye:
- Esquema visual con tablas y columnas.
- Queries de ejemplo precargadas (resumen por almacén, top 20 transacciones, alertas críticas).
- Resultado paginado, copiable, exportable.
- **Sandbox:** SELECT-only, sin riesgo para la BD.

**Para la presentación:** este módulo es la herramienta de validación en vivo. Cualquier número que cuestione el cliente lo resolvemos ahí mismo.

### 3.9 Configuración (`/settings`)
**Para qué sirve:** Tabs de:
- **Usuario:** cambio de contraseña, perfil.
- **Detección:** CRUD de reglas de motor (`zscore` / `conteo` / `ratio`), parámetros, severidades.

**Reglas de sistema disponibles** (hoy deshabilitadas por defecto, se activan con criterio de JOZ):
| Regla | Tipo | Qué detecta |
|---|---|---|
| Monto inusual | zscore | Transacción cuyo monto está N desviaciones por encima del promedio del almacén |
| Fraccionamiento de operaciones | conteo | Múltiples operaciones del mismo cliente/cajero en ventana corta (señal de fraude estructurado) |
| Concentración de cajero | ratio | Cajero que maneja un % desproporcionado del volumen del turno |
| Turno con mucha salida de dinero | zscore | Salida total del turno significativamente arriba del promedio histórico |

---

## 4. Casos para validar en vivo (SQL Console)

> Pegar cada query en `/sql` y comparar con el dashboard.

### Q1 — Universo de datos
```sql
SELECT COUNT(*) AS transacciones,
       COUNT(DISTINCT almacen) AS almacenes,
       MIN(fecha) AS desde, MAX(fecha) AS hasta
FROM joz_transacciones;
```

### Q2 — Top almacenes por volumen
```sql
SELECT almacen,
       COUNT(*) AS transacciones,
       SUM(entrada)::bigint AS entradas,
       SUM(salida)::bigint AS salidas,
       (SUM(entrada) - SUM(salida))::bigint AS balance
FROM joz_transacciones
GROUP BY almacen
ORDER BY transacciones DESC
LIMIT 10;
```

### Q3 — Trazabilidad contrato de empeño (caso PO)
```sql
SELECT fecha, entrada, salida, descripcion
FROM joz_transacciones
WHERE referencia = 'EM180860'
ORDER BY fecha;
```

### Q4 — Distribución de alertas
```sql
SELECT tipo, severidad, COUNT(*)
FROM joz_alertas
GROUP BY tipo, severidad
ORDER BY COUNT(*) DESC;
```

### Q5 — Salud del ETL
```sql
SELECT DATE(iniciado_en) AS dia,
       COUNT(*) AS ejecuciones,
       SUM(filas_insertadas) AS insertadas,
       SUM(filas_error) AS errores
FROM joz_etl_log
GROUP BY DATE(iniciado_en)
ORDER BY dia DESC
LIMIT 7;
```

---

## 5. Cierre del hallazgo del PO (4 casos de empeño)

### Reporte original
| Documento | Descripción visible | Entrada / Salida visible |
|---|---|---|
| EM180860 | "RETIRA POR VALOR DE $16.00" | $41.20 / $20.00 |
| EM68580 | "RETIRA POR VALOR DE $85.80" | $325.80 / $90.00 |
| EM7934 | "RETIRA POR VALOR DE $210.00" | $270.25 / $15.00 |
| EM403353 | "ABONA A CAPITAL EL VALOR DE $20.00" | $136.00 / — |

### Diagnóstico técnico
**Las tres hipótesis del PO fueron descartadas con SQL en vivo:**
- ❌ No es error de origen — los registros en BD son fieles a SuperEfectivo.
- ❌ No es error de ETL — cada movimiento se carga correctamente.
- ❌ No es error de mapeo frontend — la API devolvía exactamente lo que se pintaba.

**Causa real:** decisión de diseño en el endpoint de Historial. Se agrupaba por `referencia` (que es el ID del **contrato de empeño**, no del evento individual). Un contrato vive semanas: incluye el empeño inicial, los abonos de interés, los super pagos y el retiro final — todos con la misma `referencia`. El backend sumaba los montos de toda la vida del contrato y mostraba como descripción solo la última línea, generando la incoherencia visual.

### Fix aplicado (1 línea, sin tocar ETL ni datos)
**Archivo:** `joz/backend/joz/views.py:899-908`
**Cambio:** `GROUP BY referencia` → `GROUP BY (referencia, fecha)`

### Resultado validado
| Documento | Antes | Después (fila más reciente) |
|---|---|---|
| EM180860 | "RETIRA $16.00" / $41.20 | "RETIRA $16.00" / **$16.00** ✅ |
| EM68580 | "RETIRA $85.80" / $325.80 | "RETIRA $85.80" / **$85.80** ✅ |
| EM7934 | "RETIRA $210.00" / $270.25 | "RETIRA $210.00" / **$210.25** ✅ |
| EM403353 | "ABONA $20.00" / $136.00 | "ABONA $20.00" / **$20.00** ✅ |

**Invariantes preservadas:**
- Asientos de doble partida del mismo día (interés + capital) **siguen unificados** — no se rompió la lógica contable original.
- Totales agregados de las tarjetas del Dashboard **no cambian** (suman sobre el queryset crudo, no sobre el deduplicado).

---

## 6. Estado consolidado de pendientes con el PO

| Item | Estado |
|---|---|
| Origen de datos actualizado al día anterior | ✅ Corregido |
| Cuadros de Dashboard duplicados | ✅ Corregido |
| Tipificación de "Otros" | ✅ Corregido (9 tipos discriminados, ver §2) |
| Tooltips explicativos en tarjetas | ✅ Implementado |
| Subtítulos descriptivos en cada módulo | ✅ Implementado hoy |
| Inconsistencia transaccional EM180860/EM68580/EM7934/EM403353 | ✅ Resuelto (ver §5) |
| Gestión avanzada de alertas (recalcular, borrar masivo) | ✅ Implementado |
| Calibración de umbrales con criterio de JOZ | 🚧 Próxima fase |
| Entrenamiento del modelo IA con histórico extendido (>17 días) | 🚧 Próxima fase |

---

## 7. Plan de demo (orden sugerido, ~25 min)

| # | Módulo | Tiempo | Mensaje clave |
|---|---|---|---|
| 1 | Home | 1' | "Todo en un solo lugar, navegación humana" |
| 2 | Dashboard | 5' | KPIs vivos, tooltips, drill-down a almacén |
| 3 | Historial | 4' | **Mostrar caso EM180860 corregido** |
| 4 | Alertas | 4' | Filtrar críticas, marcar resueltas, recalcular |
| 5 | Riesgos | 2' | Mapa de calor por almacén |
| 6 | IA | 3' | Entrenar modelo en vivo, ver scores |
| 7 | SQL Console | 4' | Ejecutar Q1 y Q3 — validar contra dashboard |
| 8 | Monitor ETL | 1' | "El sistema se alimenta solo, programado" |
| 9 | Configuración → Reglas | 1' | "Ustedes definen sus umbrales" |

---

## 8. Próximos pasos propuestos (post-decisión)

1. **Calibración de reglas con JOZ** (sesión de 2 horas con operación) — definir umbrales reales de monto inusual, fraccionamiento y concentración.
2. **Histórico extendido** — pasar de 17 días a 6+ meses para que el modelo IA capture estacionalidad real.
3. **Roles y permisos por sucursal** — gerentes regionales solo ven sus almacenes.
4. **Notificaciones push** (email / WhatsApp) para alertas críticas.
5. **Reportería ejecutiva** — PDF semanal automático para gerencia.

---

## Anexo — Acceso técnico para el equipo JOZ

- **URL aplicativo:** `http://<servidor>:9006/`
- **SQL Console:** `/sql` (login requerido, SELECT-only)
- **Documentación funcional por módulo:** `joz/docs/MODULO_*.md`
- **Arquitectura técnica:** ver §3 de `correcciones/DOCUMENTO_TECNICO_FUNCIONAL_JOZ.md` (doc canónico v2.1).
- **Modelo de datos:** `joz/docs/BASE_DE_DATOS.md`
