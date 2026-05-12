# Plan de Trabajo — Joz · SuperEfectivo
**BarranquIA** · Abril 2026

---

## Objetivo

Construir un motor de detección de anomalías en los movimientos de caja de los 30 almacenes de SuperEfectivo, con alertas automáticas y dashboard de monitoreo en tiempo casi-real.

---

## Equipo

| Persona | Rol |
|---|---|
| **Daniel** | Backend · Base de datos · Infraestructura |
| **Juan** | Frontend |

---

## Sprints

> 2 semanas por sprint · 8 semanas en total

---

### Sprint 1 · Motor de anomalías
**14 abr → 25 abr**

**Meta:** El sistema detecta anomalías automáticamente al cargar transacciones y las persiste como alertas.

| # | Tarea | Quién |
|---|---|---|
| 1.1 | Modelo `ReglaNegocio` — catálogo configurable de reglas con umbrales | Daniel |
| 1.2 | Motor `anomalias.py` con 5 reglas: tope de caja, movimiento sin contraparte, saldo fuera de rango, gasto no autorizado, apertura sin cierre | Daniel |
| 1.3 | Integrar motor al ETL — ejecuta detección tras cada carga | Daniel |
| 1.4 | Seed de reglas base con parámetros iniciales | Daniel |
| 1.5 | Endpoints: `GET /api/joz/anomalias/`, `GET /api/joz/anomalias/resumen/`, `GET /api/joz/reglas/`, `PATCH /api/joz/reglas/<id>/` | Daniel |
| 1.6 | Conectar `Dashboard.tsx` a datos reales (`/stats/` + `/anomalias/resumen/`) | Juan |
| 1.7 | Refactorizar `Alerts.tsx` — tabla con filtros por severidad, almacén y estado | Juan |
| 1.8 | Componente `SeveridadBadge` + badge de alertas abiertas en el menú | Juan |

**Entregable:** Anomalías detectadas automáticamente y visibles en el dashboard.

---

### Sprint 2 · Cuadre de caja e inventarios
**28 abr → 9 may**

**Meta:** Integrar cuadres de caja y movimientos de inventario. Mostrar estado de cuadre por almacén.

| # | Tarea | Quién |
|---|---|---|
| 2.1 | Modelo `CuadreCaja` y endpoints de carga/consulta | Daniel |
| 2.2 | Lógica de comparación: saldo reportado vs. saldo calculado por IA | Daniel |
| 2.3 | Alerta automática si la diferencia supera el umbral configurado | Daniel |
| 2.4 | Modelo `MovimientoInventario` y endpoint de sincronización | Daniel |
| 2.5 | Reglas R-06 (artículo vendido sin contrato cerrado) y R-07 (traslado sin recepción) | Daniel |
| 2.6 | Índices de BD en `joz_transacciones` para optimizar cálculos del motor | Daniel |
| 2.7 | Página `CashReconciliation.tsx` — semáforo de cuadre por almacén (verde/rojo/gris) | Juan |
| 2.8 | Vista detalle de almacén — movimientos del día, cuadres anteriores, alertas activas | Juan |
| 2.9 | Formulario de carga manual de cuadre en Settings | Juan |
| 2.10 | Actualizar `Risks.tsx` con datos reales del motor | Juan |

**Entregable:** Panel de cuadre de caja operativo. Inventario integrado. 7 reglas activas.

---

### Sprint 3 · Scoring y automatización
**12 may → 23 may**

**Meta:** El sistema corre solo cada día y genera un score de riesgo por almacén para la gerencia.

| # | Tarea | Quién |
|---|---|---|
| 3.1 | Motor de scoring 0–100 por almacén (anomalías + cuadres + tendencia) | Daniel |
| 3.2 | Endpoints: `GET /api/joz/scoring/`, `/scoring/historico/`, `/scoring/<almacen>/` | Daniel |
| 3.3 | Modelo `ConfiguracionAlmacen` — tope de efectivo y parámetros por almacén | Daniel |
| 3.4 | Scheduler diario en Docker: ETL 06:00 → anomalías → scoring | Daniel |
| 3.5 | Endpoint `GET /api/joz/health/` — estado del sistema | Daniel |
| 3.6 | Rediseñar `Dashboard.tsx` como panel ejecutivo — KPIs, heatmap de almacenes, top alertas | Juan |
| 3.7 | Página `Scoring.tsx` — ranking de almacenes por riesgo con tendencia semanal | Juan |
| 3.8 | Pestaña "Almacenes" en Settings — topes editables por almacén | Juan |
| 3.9 | Botón "Exportar CSV" en Alertas, Cuadre y Scoring | Juan |

**Entregable:** Sistema autónomo. Score de riesgo por almacén actualizado diariamente.

---

### Sprint 4 · Calibración y entrega
**26 may → 6 jun**

**Meta:** Sistema calibrado con datos reales, probado con el cliente y listo para operación autónoma.

| # | Tarea | Quién |
|---|---|---|
| 4.1 | Calibrar umbrales de las 7 reglas con datos reales de la API | Daniel |
| 4.2 | Optimizar queries del motor (EXPLAIN ANALYZE) | Daniel |
| 4.3 | Reintentos con backoff en el ETL ante fallos de la API | Daniel |
| 4.4 | Configurar variables de entorno de producción y verificar conexión | Daniel |
| 4.5 | Script de backup automático de la BD `joz` | Daniel |
| 4.6 | Walkthrough con Daniel Zuleta — validar que el dashboard responde las preguntas del negocio | Juan |
| 4.7 | Adaptar layouts para móvil — los administradores consultan desde el celular | Juan |
| 4.8 | Estados vacíos para cada página (sin datos, sin anomalías, error de conexión) | Juan |
| 4.9 | Guía rápida de usuario: dashboard, alertas, cuadre de caja, ETL manual | Juan |

**Entregable:** Sistema en producción operado de forma autónoma por el equipo de SuperEfectivo.

---

## Dependencias del cliente

Estos ítems los debe entregar SuperEfectivo. Bloquean el avance si no llegan a tiempo.

| Ítem | Responsable | Necesario en |
|---|---|---|
| Credenciales API (URL · usuario · password · token) | Daniel Zuleta | Sprint 1 |
| Topes de efectivo por almacén | Daniel Zuleta | Sprint 1 |
| Tabla de prefijos de documentos del sistema Vitrina | RØiner K-rrillØ | Sprint 1 |
| Whitelist de IP del servidor en el firewall | RØiner K-rrillØ | Sprint 1 |
| Tabla de movimientos de inventario | RØiner K-rrillØ | Sprint 2 |
| Tabla de cuadres de caja del administrador | RØiner K-rrillØ | Sprint 2 |

> Mientras no lleguen las credenciales, el equipo trabaja sobre dumps recientes del subdata real del ERP (el proyecto opera bajo el principio de datos reales exclusivos — ver §11.5 del documento técnico v2.1; no hay seed sintético en el repo).

---

## Criterios de aceptación

- [ ] ETL corre automáticamente cada día sin intervención manual
- [ ] El motor detecta las 7 reglas de anomalía acordadas
- [ ] Las alertas tienen score, severidad y flujo de estados gestionable
- [ ] El dashboard muestra datos reales en menos de 3 segundos
- [ ] El cuadre de caja calcula y persiste la diferencia entre reportado e IA
- [ ] El scoring por almacén se actualiza diariamente
- [ ] El equipo de SuperEfectivo opera el sistema de forma autónoma

---

*Basado en reuniones de Discovery (dic 2025), Ajuste de prototipo (4 feb) y Levantamiento Funcional (11 y 20 feb 2026).*
