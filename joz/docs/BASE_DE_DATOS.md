# Joz — Base de Datos y Fuente de Datos

> Microservicio de análisis de anomalías financieras para **Joyerías Joz**.
> Fuente de datos: **API REST de SuperEfectivo** (software de gestión de aportes/retiros).

---

## 1. Fuente de Datos

### API SuperEfectivo

| Parámetro | Valor |
|-----------|-------|
| Protocolo | HTTPS + JSON |
| Autenticación | `pSWacceso` (objeto JSON en el body del POST) |
| Endpoint principal | `POST /api/AportesRetiros/Movimientos/porfecha` |

**Payload de autenticación:**
```json
{
  "pSWacceso": {
    "pUsuario":  "...",
    "pPassword": "...",
    "pToken":    "..."
  }
}
```

**Query params del endpoint:**
| Parámetro | Descripción |
|-----------|-------------|
| `Codalmacen` | Código de almacén (0 = todos) |
| `fechaInicio` | Fecha inicio `YYYY-MM-DD` |
| `fechaFin` | Fecha fin `YYYY-MM-DD` |

**Respuesta:**
```json
{
  "codigo": 200,
  "msj": "OK",
  "list": [
    {
      "id": 12345,
      "nrodocumento": "A-00123",
      "almorigen": 3,
      "numeroidentificacion": "1234567890",
      "nombre": "Juan Pérez",
      "tipo": "Aporte",
      "descripcion": "Empeño de cadena de oro",
      "valor": 500000,
      "entrada": 500000,
      "salida": 0,
      "fecha": "2026-04-01T00:00:00",
      "hora": { "hours": 9, "minutes": 30, "seconds": 0 },
      "usuario": "cajero01"
    }
  ]
}
```

### Variables de Entorno Requeridas

```env
JOZ_API_URL=https://superefectivo.com   # Base URL de la API
JOZ_API_USUARIO=usuario_asignado
JOZ_API_PASSWORD=contraseña
JOZ_API_TOKEN=token_de_sesion
```

Estas variables se configuran en `shared/.env` (ver `shared/.env.example`).

---

## 2. Tablas PostgreSQL

Base de datos: **`joz`**
Schema: **`public`**

### 2.1 `joz_transacciones`

Espejo de los movimientos recibidos desde la API de SuperEfectivo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | serial PK | ID interno |
| `id_externo` | integer | ID del movimiento en SuperEfectivo (`id` de la API) |
| `referencia` | varchar(100) | Número de documento (`nrodocumento`) |
| `almacen` | integer | Código de almacén (`almorigen`) |
| `numero_identificacion` | varchar(50) | Cédula/NIT del cliente (`numeroidentificacion`) |
| `cliente` | varchar(300) | Nombre del cliente (`nombre`) |
| `tipo` | varchar(100) | `Aporte` o `Retiro` (`tipo`) |
| `descripcion` | text | Detalle del empeño (`descripcion`) |
| `monto` | decimal(18,2) | Valor total del movimiento (`valor`) |
| `entrada` | decimal(18,2) | Monto de entrada (`entrada`) |
| `salida` | decimal(18,2) | Monto de salida (`salida`) |
| `fecha` | date | Fecha del movimiento (`fecha`) |
| `hora_minutos` | integer | Minutos desde medianoche (`hora.hours*60 + hora.minutes`) |
| `usuario_cajero` | varchar(100) | Usuario que registró (`usuario`) |
| `estado` | varchar(100) | `cargado` (default) |
| `raw_data` | jsonb | JSON completo del registro recibido |
| `cargado_en` | timestamptz | Fecha/hora de carga en BD |

**Índices:**
- `(fecha, almacen)` — Filtrado por período y tienda
- `(tipo, fecha)` — Análisis por tipo de movimiento
- `id_externo` — Deduplicación en ETL

### 2.2 `joz_alertas`

Alertas de anomalías detectadas por el motor de IA.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | serial PK | ID interno |
| `transaccion_id` | FK → `joz_transacciones` | Transacción que generó la alerta |
| `tipo` | varchar(200) | Tipo de anomalía detectada |
| `descripcion` | text | Descripción de la anomalía |
| `severidad` | varchar(20) | `baja`, `media`, `alta`, `critica` |
| `estado` | varchar(20) | `abierta`, `en_revision`, `resuelta`, `descartada` |
| `score_anomalia` | float | Puntuación del modelo (0–1) |
| `generado_en` | timestamptz | Fecha/hora de generación |
| `actualizado_en` | timestamptz | Última actualización |

### 2.3 `joz_riesgos`

Riesgos operativos o financieros calculados.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | serial PK | ID interno |
| `categoria` | varchar(200) | Categoría del riesgo |
| `descripcion` | text | Descripción detallada |
| `nivel` | varchar(20) | `bajo`, `medio`, `alto` |
| `probabilidad` | float | Probabilidad estimada (0–1) |
| `impacto_estimado` | decimal(18,2) | Impacto económico estimado (COP) |
| `calculado_en` | timestamptz | Fecha de cálculo |

### 2.4 `joz_etl_log`

Registro de auditoría de cada ejecución del ETL.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | serial PK | ID interno |
| `endpoint` | varchar(200) | Endpoint de la API consultado |
| `fecha_consulta` | date | Fecha de los movimientos consultados |
| `almacen` | integer | Almacén consultado (0 = todos) |
| `filas_recibidas` | integer | Total de registros recibidos de la API |
| `filas_insertadas` | integer | Registros nuevos cargados en BD |
| `filas_error` | integer | Registros con error en transformación |
| `iniciado_en` | timestamptz | Inicio de la ejecución |
| `finalizado_en` | timestamptz | Fin de la ejecución |
| `mensaje` | text | Mensaje de resultado o error |

---

## 3. Pipeline ETL

```
SuperEfectivo API
       │
       ▼  POST /api/AportesRetiros/Movimientos/porfecha
  joz/backend/joz/etl.py
       │
       ├── _fetch_movimientos()   → HTTP request con pSWacceso
       ├── _cargar_movimientos()  → Deduplicación + bulk_create
       └── ETLLog.save()          → Auditoría de la ejecución
       │
       ▼
  joz_transacciones (PostgreSQL)
       │
       ▼  (futuro: motor de detección de anomalías)
  joz_alertas + joz_riesgos
```

**Deduplicación:** Por `(fecha, id_externo)` — no se insertan registros duplicados si el ETL se ejecuta dos veces sobre el mismo rango de fechas.

**Ejecución en background:** `run_en_background()` lanza un `threading.Thread` daemon, lo que permite que la API responda inmediatamente mientras el ETL corre en segundo plano.

**Control de concurrencia:** `_etl_lock` (threading.Lock) garantiza que solo un ETL corra a la vez.

---

## 4. API REST del Backend

Base URL: `http://localhost:8003/api/joz/`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/stats/` | Resumen general: alertas, riesgos, tiendas |
| GET | `/anomalias-por-dia/` | Anomalías por día (últimos 30 días) |
| GET | `/alertas/` | Listado paginado de alertas |
| PATCH | `/alertas/{id}/` | Cambiar estado de una alerta |
| GET | `/riesgos/` | Listado de riesgos y tiendas |
| GET | `/historial/` | Historial de transacciones paginado |
| POST | `/etl/run/` | Disparar ETL en segundo plano |
| GET | `/etl/status/` | Estado del ETL y últimas ejecuciones |

### Parámetros de `/historial/`

| Param | Descripción |
|-------|-------------|
| `fecha_desde` | Filtro desde (YYYY-MM-DD) |
| `fecha_hasta` | Filtro hasta (YYYY-MM-DD) |
| `tipo` | Filtro por tipo (`Aporte`/`Retiro`) |
| `almacen` | Código de almacén |
| `q` | Búsqueda libre (cliente, referencia, identificación, descripción) |
| `page` | Número de página (default: 1) |
| `page_size` | Tamaño de página (default: 50, max: 200) |

### Parámetros de `/etl/run/` (POST body)

```json
{
  "fecha_inicio": "2026-04-01",
  "fecha_fin":    "2026-04-05",
  "almacen":      0
}
```

---

## 5. Frontend (React)

Ubicación: `joz/frontend/src/`

| Página | Archivo | Datos que consume |
|--------|---------|-------------------|
| Dashboard | `pages/Dashboard.tsx` | `/stats/`, `/anomalias-por-dia/` |
| Alertas | `pages/Alerts.tsx` | `/alertas/` |
| Riesgos | `pages/Risks.tsx` | `/riesgos/` |
| Historial | `pages/History.tsx` | `/historial/` |
| Configuración → Datos | `pages/Settings.tsx` | `/etl/status/`, `/etl/run/` |

Los servicios de API se centralizan en `services/api.js`.

---

## 6. Levantar Localmente

### Con datos vacíos (nuevo entorno):
```bash
docker compose -f shared/docker-compose.yml up -d
```

### Cargar datos desde SuperEfectivo (requiere acceso a la API):
1. Configurar variables de entorno en `shared/.env`
2. Abrir el frontend en `http://localhost:3003`
3. Ir a **Configuración → Datos**
4. Seleccionar rango de fechas y almacén
5. Pulsar **Ejecutar ETL**

O via curl:
```bash
curl -X POST http://localhost:8003/api/joz/etl/run/ \
  -H "Content-Type: application/json" \
  -d '{"fecha_inicio":"2026-04-01","fecha_fin":"2026-04-05","almacen":0}'
```

### Reconstruir imágenes (después de cambios en código):
```bash
docker compose -f shared/docker-compose.yml build joz-backend joz-frontend
docker compose -f shared/docker-compose.yml up -d joz-backend joz-frontend
```

---

## 7. Migraciones

```bash
# Dentro del contenedor backend
docker exec barranquia_joz_backend python manage.py migrate

# Ver estado de migraciones
docker exec barranquia_joz_backend python manage.py showmigrations joz
```

Migraciones actuales:
- `0001_initial` — Modelos base: Transaccion, Alerta, Riesgo
- `0002_etllog_alter_transaccion` — Añade ETLLog y campos extendidos a Transaccion
