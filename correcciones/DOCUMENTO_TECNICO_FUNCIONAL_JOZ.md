# JOZ Monitoring Platform — Documento Técnico y Funcional

**Cliente:** J.O.Z. S.A. (cadena de casas de empeño, sistema fuente *SuperEfectivo*)
**Proveedor:** BarranquIA
**Versión:** 2.1
**Fecha:** 2026-05-12

### Cambios respecto a v2.0

- **Fórmula de riesgo unificada** en un único módulo (`backend/joz/riesgos.py`); ambos motores (`detectar_anomalias` y `calcular_riesgos`) delegan ahí. Se publica vía nuevo endpoint `GET /api/joz/riesgos/config/`.
- **Eliminada la configuración singleton `ConfigDeteccion`.** Toda la configuración del motor vive ahora en `ReglaDeteccion.parametros` (JSONField). Endpoint `/api/joz/config/deteccion/` retirado.
- **Z-score segmentado.** El motor de "Monto inusual" calcula μ y σ por `(almacen, tipo, categoría)` en lugar de solo por `almacen`. Corrige promedios mezclados que mencionó el cliente en la reunión del 7 de mayo.
- **Parámetro transversal `tipos_aplicables`** en todas las reglas. Permite restringir el motor a un subconjunto de tipos (default `['Aporte','Retiro']`).
- **Nueva regla #4 "Transacciones sin contrapartida"** con motor `contrapartida` — centinela de integridad del ETL.
- **Tipos de transacción y almacenes reales** documentados con precisión: `tipo` ∈ {Aporte, Retiro}; 31 almacenes operativos (1–27, 29, 30, 70, 71); categorías derivadas por regex de `descripcion`.
- **Rutas del frontend corregidas** (`/sql`, `/ia`).
- **Snapshot de cifras actualizado** tras la regeneración del Bloque E (1,612 alertas, 23,247 transacciones).

---

## 1. Resumen ejecutivo

JOZ Monitoring es una plataforma de vigilancia operativa y financiera construida a la medida para **J.O.Z. S.A.**, conectada al sistema transaccional **SuperEfectivo**. La plataforma ingiere automáticamente los movimientos financieros de los **31 almacenes operativos** de la red, aplica un motor de detección de anomalías basado en reglas estadísticas configurables, complementado por un modelo de Machine Learning (Isolation Forest), y presenta los resultados en un dashboard ejecutivo que permite a la gerencia identificar, priorizar y gestionar riesgos operativos.

### Cifras clave del sistema (al 2026-05-12, tras la regeneración del Bloque E)

| Indicador | Valor |
|-----------|-------|
| Transacciones procesadas | 23,247 (14,662 Aporte · 8,585 Retiro) |
| Almacenes monitoreados | 31 (códigos 1–27, 29, 30, 70, 71) |
| Alertas vigentes | 1,612 (968 media · 398 alta · 246 crítica · 0 baja) |
| Riesgos por almacén | 31 (27 alto · 2 medio · 2 bajo) |
| Reglas de detección activas | 4 (zscore, conteo, ratio, contrapartida) |
| Rango de datos disponibles | 2026-04-20 → 2026-05-06 |
| Frecuencia de sincronización (objetivo) | Cada hora (scheduler) + ejecución manual |

> **Nota operativa:** desde 2026-05-04 el ETL automático está detenido a la espera de la siguiente fase (incorporación de IA/embeddings). La data permanece estática y el endpoint `POST /api/joz/etl/run/` responde explícitamente con `"ETL deshabilitado: la conexión a la API externa está suspendida"`. No es un fallo, es un estado intencional.

---

## 2. Contexto funcional

### 2.1 Negocio del cliente

J.O.Z. S.A. opera una red de **31 casas de empeño** registradas en SuperEfectivo, cada una con su propio cajero y operación independiente. Los códigos de almacén no son contiguos: corresponden a las sucursales **1 a 27**, más **29, 30, 70 y 71**. El código 28 no existe en la red (sucursal histórica dada de baja); 70 y 71 son cajas administrativas centrales que registran transacciones operativas con bajo volumen.

#### Tipos de transacción en BD

El campo `Transaccion.tipo` toma exclusivamente **dos valores** en la BD viva (al 2026-05-12): `Aporte` (14,662 registros) y `Retiro` (8,585). Esto refleja la convención del API de SuperEfectivo que clasifica todo movimiento financiero como entrada (Aporte) o salida (Retiro) de caja.

#### Categorías operativas (derivadas, no son valores de `tipo`)

La granularidad funcional —empeño, retiro de empeño, pago de intereses, etc.— **no vive en el campo `tipo`**. Se obtiene aplicando regex sobre `Transaccion.descripcion`. El motor de detección y el endpoint `GET /api/joz/stats/` comparten la misma tabla de patrones (`_CATEGORIA_PATTERNS` en `detectar_anomalias.py`):

| Patrón (case-insensitive)        | Categoría derivada       |
|----------------------------------|--------------------------|
| `^RETIRA POR VALOR`              | Retiro empeño            |
| `^ABONA A CAPITAL`               | Abono a capital          |
| `^PAGA \d+ MES.*INTERÉS`         | Pago intereses           |
| `^Empeño de:`                    | Empeño                   |
| `^APERTURA DE CAJA ENTRADA`      | Apertura caja entrada    |
| `^APERTURA DE CAJA SALIDA`       | Apertura caja salida     |
| `^CIERRE DE CAJA ENTRADA`        | Cierre caja entrada      |
| `^CIERRE DE CAJA SALIDA`         | Cierre caja salida       |
| `ENVIO DE WESTERN`               | Envío Western Union      |
| `PAGO DE WESTERN`                | Pago Western Union       |
| `^RENOVACI[OÓ]N`                 | Renovación               |
| `^VENTA`                         | Venta                    |
| (cualquier descripción restante) | Otro                     |

La segmentación estadística del motor combina **`(almacen, tipo, categoría)`** como triple agrupador (ver §5.2 y §6).

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
                       │   ETL (Django)  │  ← APScheduler (objetivo)
                       │   DESHABILITADO │  ← estado actual:
                       │   (suspendido)  │     etl/run/ responde
                       └────────┬────────┘     "ETL deshabilitado…"
                                │
                       PostgreSQL 16 (joz_db)
                       · joz_transacciones (23,247)
                       · joz_alertas (1,612)
                       · joz_riesgos (31)
                       · joz_etl_log (auditoría)
                       · joz_reglas_deteccion (4)
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
        Motor de reglas                  Isolation Forest
        (zscore / conteo /               (9 features, sklearn)
         ratio / contrapartida)
              │                                   │
              └─────────────────┬─────────────────┘
                                │
                       Django REST API (22 rutas)
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
| `barranquia_postgres` | PostgreSQL 16 (compartido entre módulos del Hub) | interno |
| `barranquia_joz_backend` | Django + Gunicorn | 8003 → 8003 |
| `barranquia_joz_frontend` | nginx sirviendo build React + proxy `/api/*` | 9023 → 80 |
| `joz_etl_worker` | Worker dedicado al ETL programado (detenido) | n/a |

> El frontend se publica también desde el Hub BarranquIA bajo `/joz/` y el backend bajo `/api/joz/`.

> **Stack productivo vs. standalone.** El cliente accede al stack levantado desde `shared/docker-compose.yml` (contenedores con prefijo `barranquia_*` y PostgreSQL compartido). Existe adicionalmente `joz/docker-compose.yml` con un stack standalone (`joz_backend`, `joz_postgres` propio) destinado a desarrollo local; ese stack tiene su propia base de datos y no debe confundirse con producción.

### 3.4 Estructura de directorios

```
joz/
├── backend/
│   ├── core/                     # Configuración Django
│   ├── joz/
│   │   ├── models.py             # 5 modelos (Transaccion, Alerta, Riesgo,
│   │   │                         #   ReglaDeteccion, ETLLog)
│   │   ├── views.py              # Vistas REST (22 rutas en urls.py)
│   │   ├── urls.py
│   │   ├── serializers.py
│   │   ├── riesgos.py            # Fórmula de Riesgo unificada (fuente única)
│   │   ├── ml.py                 # Isolation Forest
│   │   ├── etl.py                # Pipeline ETL hacia SuperEfectivo
│   │   ├── scheduler.py          # APScheduler (cron hora)
│   │   ├── apps.py               # Hook de arranque del scheduler
│   │   └── management/commands/
│   │       ├── detectar_anomalias.py
│   │       └── calcular_riesgos.py
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
| `joz_transacciones` | Movimientos extraídos de SuperEfectivo | 23,247 |
| `joz_alertas` | Anomalías detectadas por el motor de reglas | 1,612 |
| `joz_riesgos` | Score de riesgo agregado por almacén | 31 |
| `joz_reglas_deteccion` | Catálogo administrable de reglas (motor + parámetros) | 4 |
| `joz_etl_log` | Auditoría de ejecuciones ETL | variable |
| `auth_user`, `authtoken_token` | Usuarios y tokens (Django auth + DRF) | variable |

> A partir de v2.1, **`joz_config_deteccion` ya no existe**: fue eliminada con la migración `0011_drop_configdeteccion`. La configuración del motor vive ahora exclusivamente en `ReglaDeteccion.parametros` (ver §4.5).

### 4.2 Modelo `Transaccion`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id_externo` | integer (único) | ID del movimiento en SuperEfectivo (`id`). |
| `referencia` | varchar(100) | `nrodocumento` (ej. `EM405972`, `RE84336`, `AE124948`). |
| `almacen` | integer | Código de sucursal (1–27, 29, 30, 70, 71). |
| `numero_identificacion` | varchar(50) | Cédula/NIT del cliente. |
| `cliente` | varchar(300) | Nombre completo. |
| `tipo` | varchar(100) | `Aporte` o `Retiro` (sólo dos valores en BD). |
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

### 4.5 Modelo `ReglaDeteccion`

Catálogo administrable que persiste la definición editable de cada regla. Reemplaza al antiguo singleton `ConfigDeteccion` (retirado en v2.1).

- `tipo_motor` ∈ {`zscore`, `conteo`, `ratio`, `contrapartida`}.
- `habilitada` (bool), `orden` (int), `es_sistema` (impide eliminación).
- `parametros` (JSONField) — bolsa de configuración por motor. **Todos los motores aceptan el parámetro transversal `tipos_aplicables`** (lista de strings; default `['Aporte','Retiro']`) que restringe la regla a un subconjunto del campo `tipo`. Validación de rangos vive en `views.py:_validar_regla`.
- `severidad_reglas` JSON (`level`, `condition`, `color`).
- Documentación visible al usuario: `descripcion_simple`, `descripcion_tecnica`, `formula`, `variables`.

**Reglas vigentes en BD (4, todas habilitadas):**

| Orden | Nombre                              | Motor          | Parámetros relevantes                                          |
|-------|-------------------------------------|----------------|----------------------------------------------------------------|
| 1     | Monto inusual                       | `zscore`       | `zscore_media`, `zscore_alta`, `zscore_critica`, `ventana_dias`, `tipos_aplicables` |
| 2     | Fraccionamiento de operaciones      | `conteo`       | `min_txns`, `min_txns_alta`, `min_txns_critica`, `tipos_aplicables` |
| 3     | Concentración de cajero             | `ratio`        | `ratio`, `ratio_alta`, `tipos_aplicables`                      |
| 4     | Transacciones sin contrapartida     | `contrapartida`| `ventana_dias` (1-30), `tolerancia_monto_pct` (0-50), `tipos_aplicables` |

### 4.6 Modelo `ETLLog`

`endpoint`, `fecha_consulta`, `almacen` (0 = todos), `filas_recibidas`, `filas_insertadas`, `filas_error`, `iniciado_en`, `finalizado_en`, `mensaje`, `origen` (`manual`/`programado`).

---

## 5. Flujo de datos: de SuperEfectivo al dashboard

### 5.1 Extracción (ETL)

**Disparadores:**

1. **Automático** — APScheduler (`BackgroundScheduler`) dispararía la extracción cada hora en zona `America/Bogota`. Hoy está apagado vía `ETL_SCHEDULER_DISABLED=true` en el contenedor productivo.
2. **Manual** — desde *Monitor ETL* el usuario indica rango de fechas y almacén (0 = todos).

> **Estado actual del ETL.** El endpoint `POST /api/joz/etl/run/` responde explícitamente con `"ETL deshabilitado: la conexión a la API externa está suspendida"` mientras J.O.Z. termina de definir whitelisting y refresh del `pToken`. El stack queda servido sobre la última carga (rango disponible 2026-04-20 → 2026-05-06). No es un fallo; es un estado intencional documentado, alineado con la fase próxima de IA + embeddings.

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

Tras cada ETL, el motor (`management/commands/detectar_anomalias.py`) recorre las transacciones cargadas y produce alertas según las reglas habilitadas. Cuatro motores intercambiables (`zscore`, `conteo`, `ratio`, `contrapartida`) leen su configuración desde `ReglaDeteccion.parametros`.

**Segmentación estadística.** Las reglas estadísticas (`zscore`, `conteo`, `ratio`) calculan μ, σ y promedios **por la tupla `(almacen, tipo, categoría)`**, donde `categoría` es la derivada por regex de `descripcion` (ver §2.1). Antes de v2.1 el cálculo se hacía solo por `almacen`, lo que mezclaba aportes con retiros y empeños con cierres de caja; la nueva segmentación corrige esto.

**Filtro `tipos_aplicables`.** Cada regla puede restringir su universo de transacciones a un subconjunto de tipos vía `parametros['tipos_aplicables']` (default `['Aporte','Retiro']`). En la práctica, esto excluye operaciones internas como traslados o cierres de caja que no deberían medirse contra montos de cliente.

### 5.3 Cálculo de riesgos por almacén

El cálculo del Riesgo por tienda vive en un **único módulo, fuente única de verdad**: `backend/joz/riesgos.py`, función `actualizar_riesgo_tiendas`. Tanto `detectar_anomalias` (al final de cada corrida) como el comando independiente `calcular_riesgos` delegan en ese módulo. **No existen fórmulas paralelas.**

**Fórmula del score** (suma ponderada normalizada en [0, 1]):

```
score = min(tasa_anomalia · 10,  1) · 0.40       # tasa de anomalía
      + (avg_score / 100)         · 0.30         # score promedio de alertas
      + min(tasa_crit     · 20,  1) · 0.30       # tasa de alertas altas/críticas
```

La saturación `min(·, 1)` evita que almacenes con bajo volumen y pocas alertas dominen el score.

**Clasificación de nivel** (ver `clasificar_nivel` en `riesgos.py`):

| Nivel  | Condición                                                            |
|--------|----------------------------------------------------------------------|
| Alto   | `score ≥ 0.55` **o** `tasa_critica ≥ 0.03`                           |
| Medio  | `score ≥ 0.30` **o** `tasa_critica ≥ 0.01`                           |
| Bajo   | (en otro caso)                                                       |

Los resultados se persisten en `joz_riesgos` (`update_or_create` por `categoria`) y se sirven al frontend desde el endpoint `GET /api/joz/riesgos/`. Los pesos, umbrales y la fórmula también se exponen en `GET /api/joz/riesgos/config/` para que la Card de leyenda en `Risks.tsx` los muestre sin duplicarlos.

### 5.4 Modelo IA complementario

Isolation Forest entrenado sobre 9 features (`monto`, `entrada`, `salida`, `hora`, `almacen`, `tipo` codificado, día de semana, indicador cruzado entre almacenes, ratio `entrada/monto`), normalizadas con `StandardScaler`. Parámetro de contaminación configurable (5 % por defecto). Sirve para detectar patrones multidimensionales que las reglas individuales no capturan.

---

## 6. Motor de detección de anomalías — Detalle

Las cuatro reglas comparten:

- Lectura de configuración desde `ReglaDeteccion.parametros` (JSONField).
- Filtro de universo por `tipos_aplicables` (default `['Aporte','Retiro']`).
- Persistencia de alertas en `joz_alertas` con `transaccion_id`, `tipo` (nombre de la regla), `severidad`, `score_anomalia`, `descripcion`.

### 6.1 Regla 1 · Monto inusual (Z-score segmentado)

**Objetivo.** Detectar montos que se desvían del comportamiento histórico de su propio almacén, para su mismo tipo de operación y categoría.

**Cálculo.**

```
Para cada grupo g = (almacen, tipo, categoría):
    μ_g, σ_g = media y desviación de monto en g
Para cada transacción t en g:
    Z_t = (monto_t - μ_g) / σ_g
```

La triple segmentación es clave: comparar un Aporte con la media de Retiros, o un Empeño con la media de cierres de caja, generaba alertas espurias en la versión anterior.

**Severidad (parámetros vigentes en `parametros`):**

| Umbral | Valor | Severidad |
|--------|-------|-----------|
| `zscore_media` | 3.5 | media |
| `zscore_alta` | 5.0 | alta |
| `zscore_critica` | 6.5 | crítica |

Z=3.5 implica que solo ~0.02 % de las transacciones de cada grupo deberían superarlo en condiciones normales (alerta de muy alta confianza). Adicionalmente, la regla acepta `ventana_dias` para restringir el histórico (default = todos).

### 6.2 Regla 2 · Fraccionamiento de operaciones

**Objetivo.** Detectar clientes que dividen su operación en muchas transacciones pequeñas en un mismo día.

**Cálculo.** Conteo de transacciones por (`cliente`, `fecha`) dentro del filtro `tipos_aplicables`, segmentado por `(tipo, categoría)`.

| Umbral | Valor | Severidad |
|--------|-------|-----------|
| `min_txns` | 5 | media |
| `min_txns_alta` | 10 | alta |
| `min_txns_critica` | 20 | crítica |

### 6.3 Regla 3 · Concentración de cajero

**Objetivo.** Identificar cajeros que concentran un volumen anómalo de transacciones diarias.

**Cálculo.** Ratio del volumen del cajero contra el promedio del grupo `(tipo, categoría)`:

```
prom_g = promedio de transacciones por cajero por día en el grupo g
ratio_c  = transacciones del cajero c en el día (en g) / prom_g
```

| Umbral | Valor | Severidad |
|--------|-------|-----------|
| `ratio` | 2.0× | media |
| `ratio_alta` | 4.0× | alta |

### 6.4 Regla 4 · Transacciones sin contrapartida (centinela del ETL)

**Objetivo.** Detectar salidas por traslado o gasto cruzado entre almacenes que **no tienen entrada-pareja** registrada en el almacén destino — un síntoma de fallo parcial en la ingesta del ETL.

**Universo del motor.** Aplica solo a transacciones de salida cuya descripción matchea alguno de los patrones de traslado/gasto cruzado:

| Patrón                  | Tipo de operación reconocida          |
|-------------------------|---------------------------------------|
| `TRASLADO`              | Traslado de fondos                    |
| `MOVIMIENTO ENTRE`      | Movimiento entre almacenes            |
| `GASTOS X ALMACEN`      | Gasto pagado por otro almacén         |
| `SUPER PAGO ALM`        | Pago a través de almacén              |

**Determinación del destino.** Prioriza `raw_data['almdestino']` (campo estructurado del API). Si falta, hace fallback a regex sobre `descripcion` (`ALM DEST: N` / `DEST: N`).

**Filtro intra-almacén.** Las salidas donde origen == destino se descartan **antes** de evaluar pareja: corresponden a operaciones internas (cierre de turno del cajero al supervisor, gastos locales) que no son traslados reales.

**Matching de contrapartida.** Para cada salida candidata busca una entrada que satisfaga:

- `almacen == almacen_destino_esperado`
- `monto` dentro de `±tolerancia_monto_pct` del monto de la salida
- `fecha` dentro de `ventana_dias` días alrededor de la fecha de salida
- Emparejado **1-a-1** (una entrada solo puede ser pareja de una salida)

**Severidad.** `alta` fija con `score_anomalia=75.0`. La naturaleza binaria del hallazgo (hay pareja / no la hay) no justifica gradación. Si en el futuro se quiere escalar por monto (>$10k = crítica), basta con leerlo de `parametros`.

**Parámetros:**

| Nombre                  | Rango      | Default | Significado                                  |
|-------------------------|------------|---------|----------------------------------------------|
| `ventana_dias`          | 1–30       | 3       | Ventana de búsqueda de la entrada-pareja.    |
| `tolerancia_monto_pct`  | 0–50       | 0.0     | % de tolerancia sobre el monto de la salida. |
| `tipos_aplicables`      | lista      | `['Aporte','Retiro']` | Filtro de tipos.                  |

**Nota operativa.** SuperEfectivo registra ambas patas del traslado en el mismo día contable. En operación normal, esta regla **produce 0 alertas**. Es el comportamiento esperado: funciona como **centinela de integridad** del ETL, disparando solo si una salida queda huérfana por timeout, error parcial o desconexión durante la carga. El dry-run del Bloque D confirmó 100 % de cobertura de las 45 salidas reales sin ninguna alerta espuria.

### 6.5 Reglas administrables (`joz_reglas_deteccion`)

El catálogo de 4 reglas se administra desde *Configuración → Detección* en el frontend. Cada tarjeta permite:

- Habilitar/deshabilitar la regla (`habilitada`).
- Editar `parametros` (incluyendo `tipos_aplicables`, con validación de rangos en el backend).
- Consultar la documentación legible: `descripcion_simple`, `descripcion_tecnica`, `formula`, `variables`.

Las reglas marcadas `es_sistema=true` no pueden ser eliminadas por el usuario; solo deshabilitadas.

### 6.6 Snapshot vigente

| Indicador                              | Valor (2026-05-12, post Bloque E) |
|----------------------------------------|-----------------------------------|
| Alertas totales (todas abiertas)       | 1,612                             |
| Severidad crítica                      | 246                               |
| Severidad alta                         | 398                               |
| Severidad media                        | 968                               |
| Severidad baja                         | 0                                 |
| Monto inusual                          | 1,029                             |
| Concentración de cajero                | 462                               |
| Fraccionamiento de operaciones         | 121                               |
| Transacciones sin contrapartida        | 0 (centinela; esperado)           |
| Tasa de anomalía global                | 6.93 % (1,612 / 23,247)           |

---

## 7. Modelo de riesgos por almacén

La tabla `joz_riesgos` se recalcula vía `actualizar_riesgo_tiendas` (módulo unificado `riesgos.py`, ver §5.3) y consume tanto las alertas como el conteo de transacciones por almacén.

### 7.1 Distribución actual (2026-05-12, post Bloque E)

| Nivel | Almacenes |
|-------|-----------|
| Alto  | 27 |
| Medio | 2 |
| Bajo  | 2 |
| **Total** | **31** |

La fórmula segmentada de v2.1 reclasificó la mayoría de almacenes hacia "Alto" porque la regla `Monto inusual` ahora alerta sobre desvíos dentro del mismo `(tipo, categoría)` —y todos los almacenes tienen algún Aporte/Retiro outlier en su histórico—. Es un comportamiento intencional: el dashboard debe reflejar dónde concentrar revisión, no un ranking estadísticamente "limpio".

### 7.2 Top 5 por probabilidad

| Almacén    | Nivel | Probabilidad | Impacto estimado |
|------------|-------|--------------|------------------|
| ALMACEN 17 | alto  | 0.813        | $828,736.55      |
| ALMACEN 03 | alto  | 0.739        | $513,474.67      |
| ALMACEN 05 | alto  | 0.738        | $643,152.95      |
| ALMACEN 23 | alto  | 0.737        | $187,235.82      |
| ALMACEN 16 | alto  | 0.732        | $429,942.72      |

### 7.3 Top 5 por volumen de transacciones

| Almacén    | Transacciones | Monto total    |
|------------|---------------|----------------|
| ALMACEN 02 | 1,877         | $1,125,690.68  |
| ALMACEN 12 | 1,711         | $799,688.55    |
| ALMACEN 06 | 1,443         | $868,069.51    |
| ALMACEN 15 | 1,403         | $430,653.18    |
| ALMACEN 17 | 1,312         | $828,736.55    |

---

## 8. Módulos del dashboard

### 8.1 Inicio / Dashboard (`/dashboard`)

KPIs ejecutivos: transacciones totales, aportes vs retiros, anomalías abiertas/críticas/del día, desglose por tipo de operación, tendencia diaria (últimos 15 días), tarjetas por almacén, resumen financiero (Entradas / Salidas / Balance), filtros de fecha (por defecto últimos 30 días).

### 8.2 Alertas (`/alerts`)

Centro de gestión con auto-actualización cada 30 segundos. Filtros por búsqueda libre, nivel, almacén y rango de fechas. Detalle por modal (fecha, almacén, tipo, monto, score con barra visual, descripción del motor). Flujo de estados: *Abierta → En revisión → Resuelta / Descartada*. Acción de batch desde la API (`PATCH /alertas/`).

### 8.3 Riesgos (`/risks`)

Gráfico de torta Alto/Medio/Bajo, ranking Top 5 por anomalías, análisis narrativo automático del almacén más expuesto, tabla completa de riesgos calculados, tarjetas por almacén y botón *Recalcular riesgos* (dispara `calcular_riesgos`). Incluye una **Card de leyenda** que consume `GET /api/joz/riesgos/config/` y muestra la fórmula, pesos y umbrales vigentes sin duplicar valores hardcodeados en el frontend.

### 8.4 Historial (`/history`)

Explorador completo de transacciones: búsqueda por cliente, referencia, identificación o descripción; filtros de origen (reales vs prueba) y fecha; paginación de 50 registros; badges de color por tipo de operación; indicador de transacciones con valor $0.

### 8.5 Detalle por Almacén (`/store/:codigo`)

KPIs propios del almacén (transacciones, ingresos, retiros, balance) más tabla filtrada y filtros de fecha.

### 8.6 Monitor ETL (`/etl`)

Estado del scheduler (activo/inactivo, frecuencia, próximas ejecuciones), estadísticas (ejecuciones totales, registros insertados, último éxito, errores recientes), ejecución manual con rango de fechas + almacén, historial de ejecuciones con origen, filas, errores y duración.

### 8.7 Consola SQL (`/sql`)

Editor con autocompletado de tablas/columnas. Restricciones de seguridad: **solo SELECT**, timeout 10 s, límite 2,000 registros por consulta.

### 8.8 Inteligencia Artificial (`/ia`)

Estado del modelo (entrenado, fecha, métricas), entrenamiento con un clic, distribución de anomalías detectadas por IA, parámetro de contaminación configurable.

### 8.9 Configuración (`/settings`)

- **Pestaña Usuario** — datos de la cuenta y cambio de contraseña.
- **Pestaña Detección** — 4 tarjetas de reglas (`Monto inusual`, `Fraccionamiento de operaciones`, `Concentración de cajero`, `Transacciones sin contrapartida`) con switch on/off, fórmula visible, reglas de severidad y parámetros editables (incluyendo el filtro `tipos_aplicables` como multi-select). Botón *Guardar configuración* persiste cambios en `ReglaDeteccion.parametros`; *Ejecutar detección ahora* dispara el motor.

### 8.10 Otras vistas

`Home.tsx` actúa como hub local del módulo. `Login.jsx` y `NotFound.jsx` cubren autenticación y rutas inválidas.

---

## 9. API REST

Base path: `/api/joz/`. Autenticación obligatoria (Token DRF) salvo `login/`.

22 rutas declaradas en `urls.py`. La columna "Método" lista los verbos que la vista atiende; algunas rutas exponen más de uno.

| # | Método(s) | Endpoint | Descripción |
|---|-----------|----------|-------------|
| 1 | POST | `/login/` | Iniciar sesión y obtener token. |
| 2 | POST | `/change-password/` | Cambio de contraseña; invalida token previo. |
| 3 | GET | `/stats/` | KPIs del dashboard. |
| 4 | GET | `/anomalias-por-dia/` | Conteo de anomalías por día. |
| 5 | GET/PATCH | `/alertas/` | Listado paginado con filtros / actualización en lote. |
| 6 | GET/PATCH | `/alertas/{id}/` | Detalle de alerta / cambiar estado individual. |
| 7 | GET | `/riesgos/` | Listado de riesgos por almacén. |
| 8 | GET | `/riesgos/config/` | **(v2.1)** Pesos, umbrales y fórmula del módulo `riesgos.py`. Lo consume la Card de leyenda en `Risks.tsx`. |
| 9 | GET | `/riesgos/{id}/` | Detalle de riesgo. |
| 10 | GET | `/historial/` | Historial con filtros avanzados. |
| 11 | POST | `/etl/run/` | Disparar ETL manual. Hoy responde `"ETL deshabilitado: la conexión a la API externa está suspendida"`. |
| 12 | GET | `/etl/status/` | Último log y estado de la última ejecución. |
| 13 | GET | `/etl/schedule/` | Estado del scheduler (activo/horario). |
| 14 | POST | `/sql/execute/` | Consulta SQL de solo lectura. |
| 15 | GET | `/sql/schema/` | Esquema de tablas y columnas. |
| 16 | GET | `/consulta/` | Consulta en tiempo real (proxy a SuperEfectivo). |
| 17 | GET | `/reglas/` | Catálogo administrable de reglas. |
| 18 | GET/PATCH | `/reglas/{id}/` | Detalle / actualización de regla (lee/escribe `parametros` JSON). |
| 19 | POST | `/detectar/` | Ejecutar el motor de detección. |
| 20 | GET | `/ia/status/` | Estado del modelo IA. |
| 21 | POST | `/ia/entrenar/` | (Re)entrenar Isolation Forest. |
| 22 | GET | `/ia/anomalias/` | Anomalías detectadas por IA. |

> **v2.1**: se retiró `/config/deteccion/` (GET/PATCH) — esa configuración se gestiona ahora vía `/reglas/` y `/reglas/{id}/`. Se añadió `/riesgos/config/`.

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
| `DB_HOST` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Conexión a PostgreSQL (contenedor `barranquia_postgres` en stack productivo). |
| `SECRET_KEY` / `DEBUG` / `ALLOWED_HOSTS` | Django estándar. |

### 11.2 Comandos de gestión

```bash
# Ejecutar ETL manual contra SuperEfectivo
docker exec barranquia_joz_backend python manage.py shell -c "from joz.etl import run; run()"

# Disparar motor de detección
docker exec barranquia_joz_backend python manage.py detectar_anomalias

# Recalcular riesgos
docker exec barranquia_joz_backend python manage.py calcular_riesgos
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

### 11.5 Principio operativo: datos reales

El sistema opera exclusivamente sobre el subdata real del ERP SuperEfectivo de J.O.Z. **No se usan datos sintéticos en ningún entorno** (desarrollo, staging ni producción). Las decisiones de producto, la calibración del motor de detección y las cifras presentadas al cliente se basan únicamente en transacciones reales.

Implicaciones:

- Los entornos de desarrollo local requieren acceso al subdata vía ETL manual o restauración de un dump reciente coordinado con el administrador.
- **No existe comando de seeding sintético en el repo.** El management command `seed_joz` fue retirado en 2026-05-12 para alinear el repositorio con este principio; el endpoint `POST /api/joz/etl/run/` deja de sugerirlo cuando el ETL está deshabilitado.
- Las pruebas funcionales del motor se ejecutan contra muestras de BD real, no contra fixtures.

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
| Filtro `tipos_aplicables` transversal en todas las reglas | ✅ Completado (v2.1) |
| Z-score segmentado por `(almacen, tipo, categoría)` | ✅ Completado (v2.1) |
| Fórmula de riesgo unificada en módulo único `riesgos.py` | ✅ Completado (v2.1) |
| Card de leyenda de Riesgos (`/riesgos/config/`) | ✅ Completado (v2.1) |
| Regla "Transacciones sin contrapartida" como centinela del ETL | ✅ Completado (v2.1) |
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
| **`raw_data`** | JSON original del API conservado para auditoría. |
| **Contrapartida** | Para cada salida de fondos entre almacenes, la entrada-pareja correspondiente en el almacén destino. La regla 4 verifica que cada salida tenga su contrapartida cargada. |
| **Centinela (de integridad)** | Regla cuyo propósito habitual es **no disparar** y que se activa solo cuando hay un fallo de carga en el ETL. La regla "Transacciones sin contrapartida" es el centinela vigente. |
| **`tipos_aplicables`** | Parámetro transversal en `ReglaDeteccion.parametros` (lista de strings) que restringe el universo de una regla a un subconjunto de valores del campo `Transaccion.tipo`. Default: `['Aporte','Retiro']`. |
| **Categoría operativa** | Etiqueta funcional (Empeño, Retiro empeño, Pago intereses, Western Union, etc.) **derivada por regex** de `Transaccion.descripcion`, no almacenada como columna. |

---

*Documento actualizado el 2026-05-12. Sistema JOZ Monitoring v2.1 — Desarrollado por BarranquIA.*
