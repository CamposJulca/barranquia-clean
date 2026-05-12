# JOZ Monitoring Platform — Documento Técnico y Funcional

**Cliente:** J.O.Z. S.A. (cadena de casas de empeño, sistema fuente *SuperEfectivo*)
**Proveedor:** BarranquIA
**Versión:** 2.0 — consolida documento técnico + funcional
**Fecha:** 2026-05-12

---

## 1. Resumen ejecutivo

JOZ Monitoring es una plataforma de vigilancia operativa y financiera construida a la medida para **J.O.Z. S.A.**, conectada al sistema transaccional **SuperEfectivo**. La plataforma ingiere automáticamente los movimientos financieros de los **30 almacenes**, aplica un motor de detección de anomalías basado en reglas estadísticas configurables, complementado por un modelo de Machine Learning (Isolation Forest), y presenta los resultados en un dashboard ejecutivo que permite a la gerencia identificar, priorizar y gestionar riesgos operativos.

### Cifras clave del sistema (al 2026-05-12)

| Indicador | Valor |
|-----------|-------|
| Transacciones procesadas | 31,820 |
| Almacenes monitoreados | 30 |
| Cajeros identificados | 127 |
| Alertas generadas | 197 (78 media · 48 alta · 71 crítica) |
| Riesgos por almacén | 30 (20 bajo · 10 medio) |
| Ejecuciones ETL registradas | 482 |
| Último ETL exitoso | 2026-05-07 15:09 |
| Rango de datos disponibles | 2026-04-20 → 2026-05-06 |
| Frecuencia de sincronización | Cada hora (scheduler) + ejecución manual |

> **Nota operativa:** desde 2026-05-04 el worker ETL automático está detenido a la espera de la siguiente fase (incorporación de IA/embeddings). La data permanece estática; las ejecuciones recientes han sido manuales.

---

## 2. Contexto funcional

### 2.1 Negocio del cliente

J.O.Z. S.A. opera una red de **30 casas de empeño** registradas en SuperEfectivo, cada una con su propio cajero y operación independiente. El día a día genera cuatro grandes tipos de movimientos:

- **Empeño** — cliente entrega un artículo (joyas en oro 10KT/18KT, electrónicos, relojería) y recibe dinero.
- **Retiro de empeño** — cliente recupera artículo o retira efectivo.
- **Abono / interés** — cliente paga para extender plazo de un empeño.
- **Apertura / cierre de caja** — movimientos operativos del cajero.

### 2.2 Problema que resuelve la plataforma

Antes de JOZ Monitoring, la auditoría sobre estos movimientos era manual, dependía de reportes esporádicos y no había detección proactiva de patrones sospechosos (montos atípicos, operaciones fuera de horario, cajeros con concentración inusual de transacciones). JOZ Monitoring ofrece:

- **Visibilidad consolidada** de los 30 almacenes en un solo tablero.
- **Detección automática 24/7** de anomalías a partir de reglas estadísticas configurables.
- **Priorización por riesgo** — ranking de almacenes según gravedad de las alertas.
- **Trazabilidad** completa de cada transacción y cada alerta (flujo abierta → revisión → resuelta / descartada).
- **Configuración auto-servicio** — los umbrales se ajustan desde la interfaz sin intervención del proveedor.

### 2.3 Roles

| Rol | Responsabilidad |
|-----|-----------------|
| Gerencia JOZ | Vigilar KPIs y ranking de riesgos por almacén. |
| Operaciones / supervisión | Gestionar el flujo de alertas (revisar, resolver, descartar). |
| Auditoría | Consultar historial, ejecutar SQL ad-hoc, revisar log de ETL. |
| Administrador BarranquIA | Mantener integración, ajustar reglas, gestionar usuarios. |

---

## 3. Arquitectura del sistema

### 3.1 Diagrama lógico

```
                    SuperEfectivo API (ia.elpenon.pa)
                                │
                       ┌────────┴────────┐
                       │   ETL (Django)  │  ← APScheduler
                       │  cada hora 24/7 │  ← ejecución manual UI
                       └────────┬────────┘
                                │
                       PostgreSQL 16 (joz_db)
                       · joz_transacciones (31,820)
                       · joz_alertas (197)
                       · joz_riesgos (30)
                       · joz_etl_log (482)
                       · joz_reglas_deteccion (4)
                       · joz_config_deteccion (1)
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
        Motor de reglas                  Isolation Forest
        (zscore / conteo / ratio)        (9 features, sklearn)
              │                                   │
              └─────────────────┬─────────────────┘
                                │
                       Django REST API (23 endpoints)
                                │
                       Frontend React 19 + Vite
                       (servido por nginx, 11 rutas)
                                │
                  Hub BarranquIA / acceso vía ngrok HTTPS
```

### 3.2 Stack tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| Lenguaje backend | Python | 3.11 |
| Framework backend | Django + Django REST Framework | 4.2 / 3.15 |
| Scheduler ETL | APScheduler (BackgroundScheduler) | 3.10 |
| Base de datos | PostgreSQL | 16 |
| Servidor WSGI | Gunicorn | 22 |
| Framework frontend | React + TypeScript | 19 / 5.x |
| Bundler | Vite | 8 |
| CSS / iconos | TailwindCSS, Lucide React | 3.x |
| Gráficos | Recharts | 2.x |
| Estado global | Zustand | 4.x |
| ML | scikit-learn (Isolation Forest) | — |
| Contenedores | Docker Compose | — |
| Proxy / frontend | nginx:alpine | — |
| Acceso externo | ngrok (dominio reservado) | — |

### 3.3 Topología de despliegue (Docker Compose)

| Contenedor | Imagen / rol | Puerto host → contenedor |
|------------|--------------|--------------------------|
| `joz_postgres` (a.k.a. `barranquia_joz_postgres`) | PostgreSQL 16 | 5433 → 5432 |
| `joz_backend` (a.k.a. `barranquia_joz_backend`) | Django + Gunicorn | 8003 → 8000 |
| `joz_frontend` (a.k.a. `barranquia_joz_frontend`) | nginx sirviendo build React + proxy `/api/*` | 9006/9023 → 80 |
| `joz_etl_worker` | Worker dedicado al ETL programado (actualmente detenido) | n/a |

> El frontend se publica también desde el Hub BarranquIA bajo `/joz/` y el backend bajo `/api/joz/`.

### 3.4 Estructura de directorios

```
joz/
├── backend/
│   ├── core/                     # Configuración Django
│   ├── joz/
│   │   ├── models.py             # 6 modelos (Transaccion, Alerta, Riesgo,
│   │   │                         #   ConfigDeteccion, ReglaDeteccion, ETLLog)
│   │   ├── views.py              # 23 endpoints REST
│   │   ├── urls.py
│   │   ├── serializers.py
│   │   ├── ml.py                 # Isolation Forest
│   │   ├── etl.py                # Pipeline ETL hacia SuperEfectivo
│   │   ├── scheduler.py          # APScheduler (cron hora)
│   │   ├── apps.py               # Hook de arranque del scheduler
│   │   └── management/commands/
│   │       ├── detectar_anomalias.py
│   │       ├── calcular_riesgos.py
│   │       └── seed_joz.py
│   └── ml_models/                # Modelos serializados (.joblib)
├── frontend/src/
│   ├── pages/                    # Dashboard, Alerts, Risks, History,
│   │                             #   ETLMonitor, StoreDetail, Settings,
│   │                             #   SqlConsole, AIModule, Home, Login, NotFound
│   ├── components/               # AlertsTable, AnomalyChart, RiskCard,
│   │                             #   RiskDetailModal, StatCard, ERDiagram
│   ├── layouts/                  # DashboardLayout, Header, Sidebar
│   ├── router/router.jsx         # 11 rutas
│   ├── services/api.js           # Cliente REST + AuthGuard
│   └── styles/globals.css
├── infra/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── nginx.conf
│   └── entrypoint.sh
├── docker-compose.yml
└── docs/                         # Documentación técnica y funcional
```

---

## 4. Modelo de datos

### 4.1 Tablas

| Tabla | Propósito | Registros (2026-05-12) |
|-------|-----------|------------------------|
| `joz_transacciones` | Movimientos extraídos de SuperEfectivo | 31,820 |
| `joz_alertas` | Anomalías detectadas por el motor de reglas | 197 |
| `joz_riesgos` | Score de riesgo agregado por almacén | 30 |
| `joz_config_deteccion` | Configuración singleton de los umbrales | 1 |
| `joz_reglas_deteccion` | Catálogo administrable de reglas (motor + parámetros) | 4 |
| `joz_etl_log` | Auditoría de ejecuciones ETL | 482 |
| `auth_user`, `authtoken_token` | Usuarios y tokens (Django auth + DRF) | variable |

### 4.2 Modelo `Transaccion`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id_externo` | integer (único) | ID del movimiento en SuperEfectivo (`id`). |
| `referencia` | varchar(100) | `nrodocumento` (ej. `EM405972`, `RE84336`, `AE124948`). |
| `almacen` | integer | Código de sucursal 1–30. |
| `numero_identificacion` | varchar(50) | Cédula/NIT del cliente. |
| `cliente` | varchar(300) | Nombre completo. |
| `tipo` | varchar(100) | Aporte / Retiro. |
| `descripcion` | text | Detalle del movimiento (artículo empeñado, etc.). |
| `monto` | decimal(18,2) | Valor total. |
| `entrada` / `salida` | decimal(18,2) | Flujo de dinero. |
| `fecha` | date | Fecha del movimiento. |
| `hora_minutos` | integer | Minutos desde medianoche. |
| `usuario_cajero` | varchar(100) | Usuario cajero que registró. |
| `estado` | varchar(100) | Estado lógico (`cargado` por defecto). |
| `raw_data` | jsonb | Payload original del API (auditable). |
| `cargado_en` | timestamp | Auditoría de ingreso. |

Índices: `(fecha, almacen)`, `(tipo, fecha)`, `id_externo` único.

### 4.3 Modelo `Alerta`

Campos clave: `transaccion_id` (FK), `tipo` (regla), `descripcion`, `severidad` (`baja`/`media`/`alta`/`critica`), `estado` (`abierta`/`en_revision`/`resuelta`/`descartada`), `score_anomalia` (0-100), `generado_en`, `actualizado_en`.

### 4.4 Modelo `Riesgo`

`categoria` (nombre del almacén), `nivel` (`bajo`/`medio`/`alto`), `probabilidad` (0-1), `impacto_estimado` (decimal), `calculado_en`.

### 4.5 Modelo `ConfigDeteccion` (singleton, pk=1)

Tres bloques de parámetros sincronizados con las reglas:

```
Monto inusual            : enabled_desviacion_monto, zscore_media,
                           zscore_alta, zscore_critica
Fraccionamiento          : enabled_fraccionamiento, fraccionamiento_min_txns,
                           _min_txns_alta, _min_txns_critica
Concentración de cajero  : enabled_concentracion_cajero, cajero_ratio,
                           cajero_ratio_alta
```

**Configuración vigente (2026-05-12):**

| Regla | Habilitada | Parámetros |
|-------|-----------|------------|
| Monto inusual (Z-score) | ✅ | media=3.5, alta=5.0, crítica=6.5 |
| Fraccionamiento | ✅ | min_txns=5, alta=10, crítica=20 |
| Concentración cajero | ✅ | ratio=3.0, alta=4.0 |

### 4.6 Modelo `ReglaDeteccion`

Catálogo administrable que persiste la definición editable de cada regla:

- `tipo_motor` ∈ {`zscore`, `conteo`, `ratio`}
- `parametros` JSON flexible según motor
- `severidad_reglas` JSON (`level`, `condition`, `color`)
- Documentación visible al usuario: `descripcion_simple`, `descripcion_tecnica`, `formula`, `variables`
- `es_sistema` impide eliminación de reglas predefinidas

Reglas vigentes en BD: *Monto inusual* (`zscore`, on), *Vlr Alto* (`ratio`, off), *Fraccionamiento de operaciones* (`conteo`, off), *Concentración de cajero* (`ratio`, off).

### 4.7 Modelo `ETLLog`

`endpoint`, `fecha_consulta`, `almacen` (0 = todos), `filas_recibidas`, `filas_insertadas`, `filas_error`, `iniciado_en`, `finalizado_en`, `mensaje`, `origen` (`manual`/`programado`).

---

## 5. Flujo de datos: de SuperEfectivo al dashboard

### 5.1 Extracción (ETL)

**Disparadores:**

1. **Automático** — APScheduler (`BackgroundScheduler`) dispara la extracción cada hora en zona `America/Bogota` (variable `ETL_SCHEDULER_DISABLED` puede desactivarlo).
2. **Manual** — desde *Monitor ETL* el usuario indica rango de fechas y almacén (0 = todos).

**Pasos:**

1. Llamada a `POST /api/AportesRetiros/Movimientos/porfecha` de SuperEfectivo con `pSWacceso` y filtros `Codalmacen / fechaInicio / fechaFin`.
2. Normalización al modelo interno (campos, tipos, fecha, `hora.totalMinutes`).
3. *Upsert* por `id_externo` (constraint único parcial — evita duplicados sin bloquear nulos).
4. Persistencia de `raw_data` para auditoría.
5. Registro en `joz_etl_log` con filas recibidas / insertadas / errores y duración.

**Especificación del endpoint upstream (SuperEfectivo):**

```http
POST /api/AportesRetiros/Movimientos/porfecha
?Codalmacen={0|1..30}&fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD
Body: { "pSWacceso": { "pUsuario": "...", "pPassword": "...", "pToken": "..." } }
```

Respuesta:

```json
{
  "codigo": 200,
  "estado": "OK",
  "msj": "Se encontraron 'NNN' registros!",
  "list": [
    { "id": 25304, "almorigen": 2, "almdestino": 2,
      "nrodocumento": "EM405972", "numeroidentificacion": "83107",
      "nombre": "LUIS CARLOS …", "descripcion": "Empeño de: ANILLO …",
      "valor": 140, "entrada": 0, "salida": 140,
      "fecha": "2026-03-27T00:00:00",
      "hora": { "hours": 0, "minutes": 8, "totalMinutes": 8 },
      "tipo": "Retiro", "usuario": "KVALDES" }
  ]
}
```

### 5.2 Detección de anomalías (motor de reglas)

Tras cada ETL, el motor recorre las transacciones cargadas y produce alertas según las reglas habilitadas. Cada regla evalúa un motor (`zscore`/`conteo`/`ratio`) sobre una agrupación y compara contra umbrales.

### 5.3 Cálculo de riesgos por almacén

El comando `calcular_riesgos` recorre los 30 almacenes y compone un score que combina:

- **Tasa de anomalía** (40 %) — alertas / transacciones.
- **Score promedio de alertas** (30 %) — gravedad media.
- **Tasa de alertas críticas/altas** (30 %).

Clasificación: **Alto** ≥ 0.55 o tasa crítica ≥ 3 %, **Medio** ≥ 0.30 o crítica ≥ 1 %, **Bajo** en otro caso. Los resultados se persisten en `joz_riesgos` y alimentan el módulo *Riesgos*.

### 5.4 Modelo IA complementario

Isolation Forest entrenado sobre 9 features (`monto`, `entrada`, `salida`, `hora`, `almacen`, `tipo` codificado, día de semana, indicador cruzado entre almacenes, ratio `entrada/monto`), normalizadas con `StandardScaler`. Parámetro de contaminación configurable (5 % por defecto). Sirve para detectar patrones multidimensionales que las reglas individuales no capturan.

---

## 6. Motor de detección de anomalías — Detalle

### 6.1 Regla 1 · Monto inusual (Z-score por almacén)

**Objetivo.** Detectar montos que se desvían del comportamiento histórico de su propio almacén.

**Cálculo.**

```
Para cada almacén a:  μ_a, σ_a = media y desviación de monto en a
Para cada transacción t en a:  Z_t = (monto_t - μ_a) / σ_a
```

**Severidad (configuración vigente):**

| Umbral | Valor | Severidad |
|--------|-------|-----------|
| `zscore_media` | 3.5 | media |
| `zscore_alta` | 5.0 | alta |
| `zscore_critica` | 6.5 | crítica |

Z=3.5 implica que solo ~0.02 % de las transacciones de cada almacén deberían superarlo en condiciones normales (alerta de muy alta confianza).

### 6.2 Regla 2 · Fraccionamiento de operaciones

**Objetivo.** Detectar clientes que dividen su operación en muchas transacciones pequeñas en un mismo día.

**Cálculo.** Conteo de transacciones por (`cliente`, `fecha`).

| Umbral | Valor | Severidad |
|--------|-------|-----------|
| `fraccionamiento_min_txns` | 5 | media |
| `fraccionamiento_min_txns_alta` | 10 | alta |
| `fraccionamiento_min_txns_critica` | 20 | crítica |

### 6.3 Regla 3 · Concentración de cajero

**Objetivo.** Identificar cajeros que concentran un volumen anómalo de transacciones diarias.

**Cálculo.**

```
prom_dia = promedio global de transacciones por cajero por día
ratio_c  = transacciones del cajero c en el día / prom_dia
```

| Umbral | Valor | Severidad |
|--------|-------|-----------|
| `cajero_ratio` | 3.0× | media |
| `cajero_ratio_alta` | 4.0× | alta |

### 6.4 Reglas administrables (`joz_reglas_deteccion`)

Además de la configuración singleton anterior, existe un catálogo (4 reglas a la fecha) que permite habilitar/deshabilitar, ajustar parámetros y agregar documentación legible. Cada regla apunta a uno de los tres motores (`zscore`/`conteo`/`ratio`).

### 6.5 Snapshot vigente

| Indicador | Valor (2026-05-12) |
|-----------|--------------------|
| Alertas totales | 197 |
| Severidad crítica | 71 |
| Severidad alta | 48 |
| Severidad media | 78 |
| Estado | 197 abiertas (sin clasificar aún por revisión) |
| Tasa de anomalía global | 0.62 % (197 / 31,820) |

---

## 7. Modelo de riesgos por almacén

### 7.1 Distribución actual

| Nivel | Almacenes |
|-------|-----------|
| Alto | 0 |
| Medio | 10 |
| Bajo | 20 |

### 7.2 Top 5 por probabilidad

| Almacén | Nivel | Probabilidad | Impacto estimado |
|---------|-------|--------------|------------------|
| ALMACEN 30 | medio | 0.376 | $261,001 |
| ALMACEN 23 | medio | 0.348 | $272,086 |
| ALMACEN 02 | medio | 0.334 | $1,670,058 |
| ALMACEN 15 | medio | 0.329 | $591,502 |
| ALMACEN 16 | medio | 0.329 | $620,155 |

### 7.3 Top 5 por volumen de transacciones

| Almacén | Transacciones | Monto total |
|---------|---------------|-------------|
| ALMACEN 02 | 2,640 | $1,670,058 |
| ALMACEN 12 | 2,419 | $1,129,786 |
| ALMACEN 15 | 2,033 | $591,502 |
| ALMACEN 06 | 1,866 | $1,162,947 |
| ALMACEN 17 | 1,794 | $1,034,525 |

---

## 8. Módulos del dashboard

### 8.1 Inicio / Dashboard (`/dashboard`)

KPIs ejecutivos: transacciones totales, aportes vs retiros, anomalías abiertas/críticas/del día, desglose por tipo de operación, tendencia diaria (últimos 15 días), tarjetas por almacén, resumen financiero (Entradas / Salidas / Balance), filtros de fecha (por defecto últimos 30 días).

### 8.2 Alertas (`/alerts`)

Centro de gestión con auto-actualización cada 30 segundos. Filtros por búsqueda libre, nivel, almacén y rango de fechas. Detalle por modal (fecha, almacén, tipo, monto, score con barra visual, descripción del motor). Flujo de estados: *Abierta → En revisión → Resuelta / Descartada*. Acción de batch desde la API (`PATCH /alertas/`).

### 8.3 Riesgos (`/risks`)

Gráfico de torta Alto/Medio/Bajo, ranking Top 5 por anomalías, análisis narrativo automático del almacén más expuesto, tabla completa de riesgos calculados, tarjetas por almacén y botón *Recalcular riesgos* (dispara `calcular_riesgos`).

### 8.4 Historial (`/history`)

Explorador completo de transacciones: búsqueda por cliente, referencia, identificación o descripción; filtros de origen (reales vs prueba) y fecha; paginación de 50 registros; badges de color por tipo de operación; indicador de transacciones con valor $0.

### 8.5 Detalle por Almacén (`/store/:codigo`)

KPIs propios del almacén (transacciones, ingresos, retiros, balance) más tabla filtrada y filtros de fecha.

### 8.6 Monitor ETL (`/etl`)

Estado del scheduler (activo/inactivo, frecuencia, próximas ejecuciones), estadísticas (ejecuciones totales, registros insertados, último éxito, errores recientes), ejecución manual con rango de fechas + almacén, historial de ejecuciones con origen, filas, errores y duración.

### 8.7 Consola SQL (`/sql-console`)

Editor con autocompletado de tablas/columnas. Restricciones de seguridad: **solo SELECT**, timeout 10 s, límite 2,000 registros por consulta.

### 8.8 Inteligencia Artificial (`/ai`)

Estado del modelo (entrenado, fecha, métricas), entrenamiento con un clic, distribución de anomalías detectadas por IA, parámetro de contaminación configurable.

### 8.9 Configuración (`/settings`)

- **Pestaña Usuario** — datos de la cuenta y cambio de contraseña.
- **Pestaña Detección** — 3 tarjetas de reglas con switch on/off, fórmula visible, reglas de severidad y parámetros editables. Botón *Guardar configuración* persiste cambios; *Ejecutar detección ahora* dispara el motor.

### 8.10 Otras vistas

`Home.tsx` actúa como hub local del módulo. `Login.jsx` y `NotFound.jsx` cubren autenticación y rutas inválidas.

---

## 9. API REST

Base path: `/api/joz/`. Autenticación obligatoria (Token DRF) salvo `login/`.

| # | Método | Endpoint | Descripción |
|---|--------|----------|-------------|
| 1 | POST | `/login/` | Iniciar sesión y obtener token. |
| 2 | POST | `/change-password/` | Cambio de contraseña; invalida token previo. |
| 3 | GET | `/config/deteccion/` | Configuración vigente del motor (singleton). |
| 4 | PATCH | `/config/deteccion/` | Actualizar umbrales (zscore, fraccionamiento, cajero). |
| 5 | GET | `/stats/` | KPIs del dashboard. |
| 6 | GET | `/anomalias-por-dia/` | Conteo de anomalías por día. |
| 7 | GET | `/alertas/` | Listado paginado con filtros. |
| 8 | PATCH | `/alertas/` | Actualización en lote (marcar revisadas, etc.). |
| 9 | GET | `/alertas/{id}/` | Detalle de alerta. |
| 10 | PATCH | `/alertas/{id}/` | Cambiar estado individual. |
| 11 | GET | `/riesgos/` | Listado de riesgos por almacén. |
| 12 | GET | `/riesgos/{id}/` | Detalle de riesgo. |
| 13 | GET | `/historial/` | Historial con filtros avanzados. |
| 14 | POST | `/etl/run/` | Disparar ETL manual (rango + almacén). |
| 15 | GET | `/etl/status/` | Último log y estado de la última ejecución. |
| 16 | GET | `/etl/schedule/` | Estado del scheduler (activo/horario). |
| 17 | POST | `/sql/execute/` | Consulta SQL de solo lectura. |
| 18 | GET | `/sql/schema/` | Esquema de tablas y columnas. |
| 19 | GET | `/consulta/` | Consulta en tiempo real (proxy a SuperEfectivo). |
| 20 | GET | `/reglas/` | Catálogo administrable de reglas. |
| 21 | GET/PATCH | `/reglas/{id}/` | Detalle / actualización de regla. |
| 22 | POST | `/detectar/` | Ejecutar el motor de detección. |
| 23 | GET | `/ia/status/` | Estado del modelo IA. |
| 24 | POST | `/ia/entrenar/` | (Re)entrenar Isolation Forest. |
| 25 | GET | `/ia/anomalias/` | Anomalías detectadas por IA. |

---

## 10. Seguridad

| Aspecto | Implementación |
|---------|----------------|
| Autenticación | Token-based (DRF `TokenAuthentication`). |
| Sesión frontend | Token en `localStorage`, regenerado al cambiar contraseña. |
| Logout automático | Redirección a `/login` ante respuesta 401. |
| Protección de endpoints | Todos requieren token, salvo `login/`. |
| Consola SQL | Solo lectura, timeout 10 s, escrituras bloqueadas, límite 2 k registros. |
| Hashing de credenciales | PBKDF2 (Django default). |
| Variables sensibles | Archivo `.env` (no versionado). |
| Transporte | HTTPS vía ngrok (`barranquia-hub.ngrok.io/joz/` y subdominio reservado). |
| CORS | Habilitado en desarrollo (`CORS_ALLOW_ALL_ORIGINS`); restringible en producción. |
| Auditoría | `joz_etl_log` + `Transaccion.raw_data` + estados de alerta con `actualizado_en`. |

---

## 11. Configuración y operación

### 11.1 Variables de entorno (backend)

| Variable | Propósito |
|----------|-----------|
| `JOZ_API_URL` | URL base de SuperEfectivo (`https://ia.elpenon.pa`). |
| `JOZ_API_USUARIO` | Usuario para `pSWacceso`. |
| `JOZ_API_PASSWORD` | Contraseña para `pSWacceso`. |
| `JOZ_API_TOKEN` | Token de sesión activa. |
| `ETL_SCHEDULER_DISABLED` | `1` para apagar APScheduler (debug u operación manual). |
| `DATABASE_URL` | DSN PostgreSQL del contenedor `joz_postgres`. |
| `SECRET_KEY` / `DEBUG` / `ALLOWED_HOSTS` | Django estándar. |

### 11.2 Comandos de gestión

```bash
# Ejecutar ETL manual contra SuperEfectivo
docker exec joz_backend python manage.py shell -c "from joz.etl import run; run()"

# Disparar motor de detección
docker exec joz_backend python manage.py detectar_anomalias

# Recalcular riesgos
docker exec joz_backend python manage.py calcular_riesgos

# Sembrar datos de demostración
docker exec joz_backend python manage.py seed_joz
```

### 11.3 Operación recomendada (cliente)

1. Acceder a `https://barranquia-hub.ngrok.io/joz/`, iniciar sesión.
2. Revisar dashboard → consolidar lectura del día.
3. Pestaña **Alertas**: triage de las nuevas, mover a *En revisión* / *Resuelta* / *Descartada*.
4. Pestaña **Riesgos**: validar Top almacenes; ejecutar *Recalcular* si se ajustaron umbrales.
5. Pestaña **Monitor ETL**: confirmar que el último ciclo cerró sin errores; si está detenido, lanzar ETL manual.
6. Ajustes finos: **Configuración → Detección**, cambiar umbrales y dejar correr el motor.

### 11.4 Estado actual de la integración SuperEfectivo

Pendiente de confirmar / suministrar por J.O.Z. para producción 24/7:

- Vigencia y renovación del `pToken` (¿expira? ¿endpoint de refresh?).
- Whitelisting de IP pública del servidor BarranquIA.
- Frecuencia objetivo (cada hora vs cierre de día) y latencia entre POS y API.
- Ventana histórica disponible para carga inicial extendida.

---

## 12. Valor entregado

### 12.1 Gerencia

- Visibilidad consolidada de las 30 sucursales en un único tablero.
- Detección proactiva sin depender de auditorías manuales.
- Priorización automática del foco (ranking + clasificación de impacto).
- Trazabilidad punta a punta (transacción → alerta → estado → resolución).

### 12.2 Operaciones

- Monitoreo 24/7 automatizado, con ejecución manual disponible.
- Configuración auto-servicio de umbrales sin intervención técnica.
- Flujo de alertas accionable, con tasa controlada (≈ 0.6 % de las transacciones).
- Historial consultable y filtrable por cliente, referencia, fecha y almacén.

### 12.3 Auditoría / Compliance

- Log auditable de cada ETL (filas recibidas/insertadas/errores).
- Persistencia del payload original (`raw_data`) para trazabilidad granular.
- Consola SQL controlada para investigaciones ad-hoc sin riesgo de escritura.
- Modelo de riesgo con fórmulas transparentes y umbrales documentados.

---

## 13. Roadmap / próximas fases

| Iniciativa | Estado |
|------------|--------|
| ETL automático SuperEfectivo (whitelisting + token estable) | ⏳ Pendiente cliente |
| IA + embeddings sobre descripciones (categorización de empeños) | 🚧 En análisis |
| Reactivación del worker ETL automático tras estabilización IA | 🚧 Próxima fase |
| Multi-tenant / control de acceso por almacén | 🔲 Backlog |
| Notificaciones push / email para alertas críticas | 🔲 Backlog |
| Reentrenamiento programado del Isolation Forest | 🔲 Backlog |
| Exportación de reportes (PDF / Excel) | 🔲 Backlog |

---

## 14. Glosario

| Término | Definición |
|---------|------------|
| **ETL** | Extract-Transform-Load. Proceso de extraer datos de SuperEfectivo, normalizarlos y cargarlos. |
| **Z-score** | Número de desviaciones estándar que un valor se aleja del promedio. |
| **Isolation Forest** | Algoritmo ML que detecta anomalías aislando puntos "diferentes" del resto. |
| **Score de anomalía** | Valor 0-100; 100 = extremadamente anómalo. |
| **Tasa de anomalía** | % de transacciones de un almacén que generaron alerta. |
| **Severidad** | Gravedad de la alerta: media, alta o crítica. |
| **Almacén** | Sucursal / punto de venta J.O.Z. en SuperEfectivo. |
| **APScheduler** | Librería Python que ejecuta el ETL en background cada hora. |
| **Singleton `ConfigDeteccion`** | Fila única (pk=1) que centraliza los umbrales del motor. |
| **`raw_data`** | JSON original del API conservado para auditoría. |

---

*Documento actualizado el 2026-05-12. Sistema JOZ Monitoring v2.0 — Desarrollado por BarranquIA.*
