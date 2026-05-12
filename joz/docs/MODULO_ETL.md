# Módulo: Monitor ETL — Pipeline de Datos

**Ruta:** `/etl`
**Acceso:** Requiere autenticación (token)
**URL:** https://joz-ccb.ngrok.io/etl

---

## 1. Descripción General

Panel de control del pipeline ETL (Extract-Transform-Load) que importa transacciones desde la API REST de SuperEfectivo hacia la base PostgreSQL local. Muestra el estado del scheduler, permite ejecuciones manuales y registra el historial de cada ejecución. Actualmente acumula 6,230 transacciones de 30 almacenes y 114 cajeros.

---

## 2. Estructura Visual

### 2.1 Header

- Estado en tiempo real: badge "ETL en ejecución" (amber, pulsante) o "En reposo" (verde)
- Botón de refresh manual

### 2.2 Tareas Programadas (4 KPIs + grid de próximas ejecuciones)

| KPI | Campo | Descripción |
|-----|-------|-------------|
| Estado | `scheduler.activo` | Activo / Inactivo |
| Frecuencia | `scheduler.horarios.length` | "Cada hora" — 24 ejecuciones/día |
| Ejecuciones prog. | `resumen_programado.total_ejecuciones` | Total ejecutadas por el scheduler |
| Total acumulado | `acumulado_global.total_insertadas` | Registros totales en BD (6,230) |

Grid de próximas ejecuciones con nombre, hora y zona horaria (America/Bogota).

### 2.3 KPIs de ejecución (4 tarjetas)

| Tarjeta | Descripción |
|---------|-------------|
| Ejecuciones registradas | Total de entradas en `joz_etl_log` |
| Insertadas (25h) | Filas insertadas en las últimas 25 horas |
| Última ejecución OK | Fecha/hora de la última ejecución sin errores |
| Errores recientes | Ejecuciones con errores en las últimas 25 horas |

### 2.4 Ejecutar ETL Manual

Formulario con 3 campos:

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| Fecha inicio | date | ayer | Fecha inicial de los movimientos a consultar |
| Fecha fin | date | hoy | Fecha final |
| Almacén | select | Todos (0) | 0=todos, 1-30=almacén específico |

Botón "Ejecutar ETL" dispara `POST /api/joz/etl/run/` en segundo plano.

### 2.5 Historial de Ejecuciones (tabla)

| Columna | Descripción |
|---------|-------------|
| Estado | Icono verde (OK) o rojo (errores) |
| Origen | Badge "Auto" (programado) o "Manual" |
| Fecha consulta | Fecha de los movimientos consultados |
| Almacén | "Todos" o "Almacén XX" |
| Recibidas | Filas recibidas de la API |
| Insertadas | Filas nuevas insertadas en BD |
| Errores | Cantidad de errores |
| Duración | Tiempo de ejecución (ms/s/m) |
| Finalizado | Fecha/hora de fin |
| Mensaje | Texto del resultado |

---

## 3. Flujo del ETL

```
API SuperEfectivo ──GET──> Backend Django ──INSERT──> PostgreSQL local
  (ia.elpenon.pa)         (joz_backend)              (joz_postgres)
                                │
                                ├── joz_etl_log (auditoría)
                                ├── POST /api/joz/ia/entrenar/ (entrena modelo IA)
                                └── POST /api/joz/ia/anomalias/ (detección de anomalías)
```

1. El backend llama a `https://ia.elpenon.pa` con credenciales (token `7fA9Kx2QmL8zR4p`)
2. Recibe transacciones como JSON
3. Parsea y guarda en tabla `joz_transacciones` (deduplicación por `id_externo`)
4. Registra resultado en tabla `joz_etl_log`
5. Opcionalmente se invoca `ia/entrenar` para actualizar el modelo y `ia/anomalias` para detectar anomalías sobre los datos nuevos

---

## 4. Endpoints consumidos

| Endpoint | Método | Uso |
|----------|--------|-----|
| `GET /api/joz/etl/status/` | GET | Estado actual + historial de ejecuciones |
| `GET /api/joz/etl/schedule/` | GET | Scheduler, horarios, próximas ejecuciones, acumulados |
| `POST /api/joz/etl/run/` | POST | Disparar ETL manual |
| `POST /api/joz/ia/entrenar/` | POST | Entrenar modelo de detección con datos actuales |
| `POST /api/joz/ia/anomalias/` | POST | Ejecutar detección de anomalías |

### `POST /api/joz/etl/run/`

**Body:**
```json
{
  "fecha_inicio": "2026-04-20",
  "fecha_fin": "2026-04-21",
  "almacen": 0
}
```

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "corriendo": true,
    "mensaje": "ETL iniciado en segundo plano."
  }
}
```

---

## 5. Scheduler (APScheduler)

- **Motor:** APScheduler `BackgroundScheduler` integrado en Django
- **Frecuencia:** Cada hora (24 ejecuciones/día a las XX:00)
- **Zona horaria:** America/Bogota (UTC-5)
- **Inicio:** Se activa al arrancar el proceso Django (Gunicorn)
- **Configuración:** Definida en `joz/backend/joz/scheduler.py`

---

## 6. Auto-refresh

| Estado | Intervalo |
|--------|-----------|
| ETL corriendo | Cada 5 segundos |
| ETL en reposo | Cada 30 segundos |

---

## 7. Modelo de Datos

### Tabla: `joz_etl_log`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int (PK) | Auto-incremental |
| `endpoint` | varchar(200) | URL de la API consultada |
| `fecha_consulta` | date | Fecha de los movimientos |
| `almacen` | int | 0=todos, 1-30=específico |
| `filas_recibidas` | int | Cantidad recibida de la API |
| `filas_insertadas` | int | Nuevas filas insertadas |
| `filas_error` | int | Filas con error |
| `iniciado_en` | datetime | Inicio de la ejecución |
| `finalizado_en` | datetime | Fin de la ejecución |
| `mensaje` | text | Resultado descriptivo |
| `origen` | varchar(20) | `manual` o `programado` |

---

## 8. Notas Técnicas

- **Archivo frontend:** `joz/frontend/src/pages/ETLMonitor.tsx`
- **Archivo backend:** `joz/backend/joz/views.py` (funciones `etl_run`, `etl_status`, `etl_schedule`)
- **ETL core:** `joz/backend/joz/etl.py`
- **Scheduler:** `joz/backend/joz/scheduler.py`
- **Total transacciones acumuladas:** 6,230
