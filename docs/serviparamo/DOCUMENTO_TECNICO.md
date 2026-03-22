# Documento Técnico — Módulo ServiPáramo
## Normalización Inteligente de Catálogo de SKUs

**Versión:** 2.0
**Fecha:** 2026-03-22
**Proyecto:** BarranquIA Hub
**Módulo:** ServiPáramo
**URL:** https://barranquia-hub.ngrok.io/serviparamo

---

## 1. Objetivo Técnico

Construir el backend de procesamiento y la API REST del módulo de normalización de catálogo de ServiPáramo, integrando:

- Extracción y limpieza de datos desde el ERP (SQL Server)
- Almacenamiento y sincronización en PostgreSQL
- Vectorización semántica con modelos de lenguaje (`all-MiniLM-L6-v2`)
- Clustering K-Means para unificación de familias
- Detección de duplicados por similitud coseno
- API REST con 13 endpoints para consulta, aprobación y control del pipeline
- SPA React 19 + TypeScript con 9 vistas funcionales

**Estado Sprint 1 (completado 2026-03-22):**
- 127,090 SKUs cargados desde ERP
- 127,090 embeddings generados (100%)
- 848 clusters K-Means
- 114,647 duplicados detectados (90.2%)
- 16,454 grupos de duplicados identificados

---

## 2. Estructura de Archivos

### Backend

```
backend/hub/serviparamo/
├── __init__.py
├── apps.py                  # AppConfig: 'serviparamo'
├── models.py                # 11 modelos Django
├── serializers.py           # SKUSerializer, SKUResumenSerializer, ...
├── views.py                 # 13 endpoints REST
├── urls.py                  # Rutas: /api/serviparamo/...
├── router.py                # DB router (opcional para BD separada)
├── etl.py                   # Pipeline ETL: SQL Server → PostgreSQL
├── embeddings.py            # Vectorización: sentence-transformers
├── normalizer.py            # K-Means + similitud coseno
├── admin.py                 # Registro en Django Admin
├── tests.py                 # Suite de pruebas
└── migrations/
    ├── 0001_initial.py      # Esquema inicial (CatalogoSKU, CatalogoEmbedding)
    ├── 0002_campos_reales.py
    └── 0003_staging_tables.py  # Tablas Raw* para ERP
```

### Frontend

```
frontend/serviparamo/
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx         # KPIs del catálogo
│   │   ├── CatalogManager.tsx    # Navegación del catálogo paginado
│   │   ├── DuplicateDetection.tsx # Vista de grupos de duplicados
│   │   ├── Normalization.tsx     # Familias normalizadas
│   │   ├── SemanticSearch.tsx    # Búsqueda semántica
│   │   ├── PurchasesAnalytics.tsx # Analítica de compras
│   │   ├── Purchases.tsx         # Órdenes y pedidos
│   │   ├── Settings.tsx          # Control ETL
│   │   └── NotFound.jsx
│   ├── features/
│   │   ├── catalog/CatalogTable.tsx
│   │   ├── duplicates/DuplicateComparison.tsx
│   │   ├── normalization/NormalizationTable.tsx
│   │   ├── semantic-search/SemanticSearchInput.tsx
│   │   ├── analytics/PurchasesCharts.tsx
│   │   └── settings/SettingsPanel.tsx
│   ├── components/
│   │   ├── Loader.jsx
│   │   ├── StatCard.tsx
│   │   ├── StatusBadge.tsx
│   │   └── ui/                   # 14 primitivos Radix UI
│   ├── layouts/
│   │   ├── DashboardLayout.jsx
│   │   ├── Header.jsx
│   │   └── Sidebar.tsx
│   ├── router/router.jsx          # React Router v7
│   ├── guards/AuthGuard.jsx       # Validación de sesión
│   ├── hooks/useFetch.js
│   ├── services/
│   │   ├── api.js                 # Axios (base URL, interceptors)
│   │   ├── healthService.js
│   │   └── serviparamoService.js  # Llamadas al API ServiPáramo
│   ├── store/useSessionStore.js   # Zustand: sesión de usuario
│   └── utils/formatters.js
├── vite.config.js                 # base: '/serviparamo/'
├── tailwind.config.js
└── package.json
```

---

## 3. Stack Tecnológico

### Backend

| Capa | Tecnología | Versión |
|---|---|---|
| Framework API | Django + DRF | 4.2 / 3.14+ |
| Base de datos | PostgreSQL + psycopg2-binary | 16 / 2.9+ |
| Fuente de datos ERP | SQL Server vía pyodbc + ODBC Driver 18 | 5.0+ |
| Modelo NLP | `sentence-transformers` `all-MiniLM-L6-v2` | 2.7+ |
| Clustering | scikit-learn `KMeans` | 1.4+ |
| Álgebra lineal | numpy | 1.26+ |
| Servidor WSGI | Gunicorn | 21.2+ |

### Frontend

| Capa | Tecnología | Versión |
|---|---|---|
| Framework UI | React | 19.2.4 |
| Lenguaje | TypeScript | 5 |
| Bundler | Vite | 8 |
| Estilos | Tailwind CSS | 4 |
| Estado | Zustand | 5.0.11 |
| Gráficas | Recharts | 3.8.0 |
| Enrutamiento | react-router-dom | 7.13.1 |
| HTTP | Axios | 1.13.6 |
| Componentes accesibles | Radix UI | 2.1+ |

---

## 4. Fuente de Datos — SQL Server ERP

| Parámetro | Valor |
|---|---|
| Servidor | `ts1.serviparamo.com.co:1433` |
| Base de datos | `PRUEBA` |
| Driver | ODBC Driver 18 for SQL Server |
| Encrypt | Yes / TrustServerCertificate Yes |

### Tablas ERP extraídas

| Tabla SQL | Modelo Django | Descripción | Filas aprox. |
|---|---|---|---|
| `inv_ina01` | `CatalogoSKU` | Catálogo maestro de SKUs | 127,090 |
| `inv_ina01` (categorías) | `RawCategoria` | Categorías de productos | — |
| `inv_ina01` (familias) | `RawFamilia` | Familias de productos | — |
| `cot_ped01/02` | `RawPedidoEncabezado/Detalle` | Solicitudes de pedido | — |
| `cot_odc01/02` | `RawOrdenEncabezado/Detalle` | Órdenes de compra | — |
| `pre_prs01` | `RawPresupuestoResumen` | Presupuestos resumen | — |
| `pre_prd01` | `RawPresupuestoDetalle` | Presupuestos detalle | — |
| `inv_kar01` | `RawKardex` | Movimientos de inventario | — |

### Columnas extraídas de `inv_ina01`

| Columna SQL | Campo modelo | Descripción |
|---|---|---|
| `codigo` | `codigo` | Código SKU (indexado) |
| `familia` | `familia` | Familia de producto (raw ERP) |
| `categoria` | `categoria` | Categoría / subfamilia |
| `nombre` | `nombre` | Descripción principal |
| `nombre1` | `nombre1` | Descripción secundaria |
| `unidad` | `unidad` | Unidad de medida |

---

## 5. Modelos de Datos

### `CatalogoSKU` — tabla `serviparamo_catalogo_skus`

| Campo | Tipo Django | Descripción |
|---|---|---|
| `id` | BigAutoField (PK) | ID interno |
| `codigo` | CharField(50) | Código SKU — `db_index=True` |
| `familia` | CharField(150) | Familia raw del ERP |
| `familia_normalizada` | CharField(150) | Familia asignada por clustering |
| `categoria` | CharField(150) | Categoría del producto |
| `nombre` | CharField(500) | Descripción principal |
| `nombre1` | CharField(500) | Descripción secundaria |
| `unidad` | CharField(20) | Unidad de medida |
| `cluster_id` | IntegerField (null) | ID del cluster K-Means |
| `es_duplicado` | BooleanField | `True` si similitud coseno ≥ 0.92 |
| `grupo_duplicado` | IntegerField (null) | ID de grupo de duplicados |
| `aprobado` | BooleanField | `True` si aprobado manualmente como maestro |
| `cargado_en` | DateTimeField (auto_now_add) | Timestamp de inserción ETL |
| `actualizado_en` | DateTimeField (auto_now) | Timestamp de última modificación |

**Índices:** `codigo` (único), `familia`, `familia_normalizada`, `es_duplicado`

---

### `CatalogoEmbedding` — tabla `serviparamo_catalogo_embeddings`

| Campo | Tipo Django | Descripción |
|---|---|---|
| `id` | BigAutoField (PK) | ID interno |
| `sku` | OneToOneField → CatalogoSKU | Relación 1:1 |
| `vector` | JSONField | Lista de 384 floats (L2-normalizado) |
| `texto_fuente` | TextField | Texto concatenado: `familia+categoria+nombre+nombre1` |
| `generado_en` | DateTimeField (auto_now_add) | Timestamp de generación |

---

### Tablas Staging (Raw*) — esquema simplificado

Todas las tablas `Raw*` almacenan datos crudos del ERP sin transformar, para auditabilidad y re-procesamiento.

| Modelo | Campos clave |
|---|---|
| `RawCategoria` | `codigo`, `descripcion`, `cargado_en` |
| `RawFamilia` | `codigo`, `descripcion`, `cargado_en` |
| `RawOrdenEncabezado` | `numero`, `fecha`, `proveedor`, `total` |
| `RawOrdenDetalle` | `orden`, `codigo_sku`, `cantidad`, `precio_unitario` |
| `RawPedidoEncabezado` | `numero`, `fecha`, `solicitante` |
| `RawPedidoDetalle` | `pedido`, `codigo_sku`, `cantidad` |
| `RawPresupuestoResumen` | `numero`, `fecha`, `proveedor`, `total` |
| `RawPresupuestoDetalle` | `presupuesto`, `codigo_sku`, `cantidad`, `precio` |
| `RawKardex` | `fecha`, `codigo_sku`, `tipo_movimiento`, `cantidad` |
| `ETLLog` | `tabla`, `inicio`, `fin`, `registros`, `estado`, `error` |

---

## 6. Pipeline de Procesamiento

### Fase 1 — ETL (`etl.py`)

```
SQL Server (inv_ina01, 127,090 filas)
    │
    │  pyodbc — ODBC Driver 18
    │  SELECT codigo, familia, categoria, nombre, nombre1, unidad
    │  LTRIM(RTRIM(ISNULL(campo, '')))
    │
    ▼
Limpieza:
    • familia.title()
    • '' → 'SIN FAMILIA'
    • Detección de duplicados exactos por código (Counter)
    │
    │  CatalogoSKU.objects.bulk_create(lotes de 2,000)
    ▼
PostgreSQL: serviparamo_catalogo_skus (127,090 filas)
    │
    │  ETLLog registra: inicio, fin, registros, estado
    ▼
Tablas Raw* (misma estrategia por tabla adicional del ERP)
```

**ETL ejecutado en hilo de fondo** (threading.Thread) para no bloquear Gunicorn.

---

### Fase 2 — Embeddings (`embeddings.py`)

```
CatalogoSKU (127,090 registros sin embedding)
    │
    │  texto = f"{familia} {categoria} {nombre} {nombre1}".strip()
    │  SentenceTransformer('all-MiniLM-L6-v2')  # ~90MB, carga en primera ejecución
    │  encode(textos, batch_size=512, normalize_embeddings=True)
    │  → numpy array (N, 384), float32, L2-normalizado
    │
    │  CatalogoEmbedding.objects.bulk_create(lotes de 500)
    ▼
PostgreSQL: serviparamo_catalogo_embeddings (127,090 vectores)

Modo incremental: procesa solo SKUs sin embedding (default)
Modo completo:    --todos → regenera todos los vectores
Tiempo estimado:  6–20 min para 127K registros
```

---

### Fase 3 — Normalización y Clustering (`normalizer.py`)

```
CatalogoEmbedding (127,090 vectores 384-dim)
    │
    │  numpy array (N, 384)
    │
    ├── K-Means Clustering:
    │     k = max(50, n_familias_únicas × 3)   → 848 clusters
    │     KMeans(n_clusters=k, random_state=42)
    │     labels → familia_normalizada por votación mayoritaria del cluster
    │
    └── Detección de Duplicados:
          cosine_similarity por bloques de 1,000 filas
          umbral: similitud ≥ 0.92 → es_duplicado = True
          → grupo_duplicado = ID del grupo de similares
    │
    │  CatalogoSKU.objects.bulk_update(
    │    campos: cluster_id, familia_normalizada, es_duplicado, grupo_duplicado
    │    lotes de 1,000
    │  )
    ▼
PostgreSQL: serviparamo_catalogo_skus (actualizado)

Resultados Sprint 1:
  • 848 clusters K-Means
  • 114,647 SKUs marcados como duplicados (90.2%)
  • 16,454 grupos de duplicados
```

---

## 7. API REST — `/api/serviparamo/`

### Autenticación

Todos los endpoints requieren: `Authorization: Token <token>`

---

### `GET /api/serviparamo/stats/`

KPIs generales del catálogo.

**Respuesta 200:**
```json
{
  "total_skus": 127090,
  "con_embedding": 127090,
  "pct_embedding": 100.0,
  "duplicados": 114647,
  "pct_duplicados": 90.2,
  "grupos_duplicados": 16454,
  "aprobados": 0,
  "sin_familia": 1671,
  "clusters": 848
}
```

---

### `GET /api/serviparamo/skus/`

Catálogo de SKUs paginado.

**Query params:**
- `familia` — filtrar por familia
- `categoria` — filtrar por categoría
- `q` — búsqueda textual en nombre
- `page` — número de página (default: 1)
- `page_size` — tamaño de página (default: 50)

**Respuesta 200:**
```json
{
  "count": 127090,
  "next": "...",
  "previous": null,
  "results": [
    {
      "codigo": "00010",
      "familia": "Filtros De Aceite",
      "familia_normalizada": "Filtros De Aceite",
      "categoria": "Filtros",
      "nombre": "FILTRO DE ACEITE WIX 51358",
      "nombre1": "",
      "unidad": "UND",
      "cluster_id": 42,
      "es_duplicado": true,
      "grupo_duplicado": 1234,
      "aprobado": false
    }
  ]
}
```

---

### `GET /api/serviparamo/skus/<codigo>/`

Detalle de un SKU por código.

---

### `GET /api/serviparamo/categorias/`

Lista de categorías únicas con conteo de SKUs.

---

### `GET /api/serviparamo/familias/`

Lista de familias normalizadas con conteo de SKUs.

---

### `GET /api/serviparamo/ordenes/`

Órdenes de compra del ERP (tabla `RawOrdenEncabezado` + `RawOrdenDetalle`).

---

### `GET /api/serviparamo/pedidos/`

Solicitudes de pedido del ERP.

---

### `GET /api/serviparamo/duplicados/`

Grupos de duplicados paginados con los SKUs miembros de cada grupo.

**Query params:** `page`, `page_size`

**Respuesta 200:**
```json
{
  "count": 16454,
  "results": [
    {
      "grupo_id": 1234,
      "skus": [
        { "codigo": "00010", "nombre": "FILTRO WIX 51358", "aprobado": false },
        { "codigo": "00011", "nombre": "FILTRO WIX-51358", "aprobado": false }
      ]
    }
  ]
}
```

---

### `POST /api/serviparamo/aprobar/`

Marca un SKU como maestro aprobado dentro de su grupo de duplicados.

**Body:**
```json
{ "sku_id": 1234 }
```

---

### `POST /api/serviparamo/fusionar/`

Fusiona dos variantes de familia bajo un nombre canónico.

**Body:**
```json
{ "familia_origen": "ELECTRICO", "familia_destino": "Eléctrico" }
```

---

### `GET /api/serviparamo/etl/status/`

Estado y resultado del último ETL ejecutado.

**Respuesta 200:**
```json
{
  "tabla": "CatalogoSKU",
  "inicio": "2026-03-22T10:00:00",
  "fin": "2026-03-22T10:05:32",
  "registros": 127090,
  "estado": "ok",
  "error": null
}
```

---

### `POST /api/serviparamo/etl/run/`

Dispara el ETL manualmente en hilo de fondo.

**Body:**
```json
{ "tablas": ["CatalogoSKU", "RawOrdenEncabezado"] }
```

**Respuesta 202:**
```json
{ "status": "started", "mensaje": "ETL iniciado en background" }
```

---

### `GET /api/serviparamo/buscar/`

Búsqueda semántica de SKUs por similitud de embedding.

**Query params:**
- `q` — texto de consulta (requerido)
- `limit` — máximo de resultados (default: 20)

**Respuesta 200:**
```json
[
  {
    "codigo": "00010",
    "nombre": "FILTRO DE ACEITE WIX 51358",
    "similitud": 0.97,
    "familia_normalizada": "Filtros De Aceite"
  }
]
```

---

## 8. Frontend — Páginas y Rutas

| Ruta | Componente | Descripción |
|---|---|---|
| `/serviparamo/` | `Dashboard.tsx` | KPIs: total SKUs, duplicados, clusters, embeddings |
| `/serviparamo/catalog` | `CatalogManager.tsx` | Navegación paginada del catálogo con filtros |
| `/serviparamo/duplicate` | `DuplicateDetection.tsx` | Grupos de duplicados, aprobación de maestros |
| `/serviparamo/normalization` | `Normalization.tsx` | Familias normalizadas, fusión de variantes |
| `/serviparamo/semantic-search` | `SemanticSearch.tsx` | Búsqueda por similitud semántica |
| `/serviparamo/purchases` | `PurchasesAnalytics.tsx` | Analítica de órdenes y pedidos (Recharts) |
| `/serviparamo/purchases/list` | `Purchases.tsx` | Listado de órdenes y solicitudes |
| `/serviparamo/settings` | `Settings.tsx` | Disparar ETL, ver estado, configuración |

### Build Configuration

```javascript
// vite.config.js
export default {
  base: '/serviparamo/',   // Prefijo de ruta en producción
  build: { outDir: 'dist' }
}
```

El frontend compilado se sirve desde el contenedor `serviparamo-frontend` (Nginx) a través de Nginx principal vía proxy:

```nginx
location /serviparamo/ {
    proxy_pass http://serviparamo-frontend:80/;
}
```

---

## 9. Despliegue

### Docker (recomendado)

```yaml
# docker/docker-compose.yml
serviparamo-frontend:
  build:
    context: ..
    dockerfile: docker/serviparamo/Dockerfile.frontend
    args:
      VITE_API_URL: /api
      VITE_API_TIMEOUT: 30000
  networks: [ruta-ia-net]
```

**Dockerfile multi-stage:**
```dockerfile
# Etapa 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/serviparamo/package*.json ./
RUN npm ci
COPY frontend/serviparamo/ ./
RUN npm run build

# Etapa 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html/serviparamo
COPY docker/serviparamo/nginx.conf /etc/nginx/conf.d/default.conf
```

### Bare-Metal (producción)

```bash
# Build frontend
cd frontend/serviparamo
npm ci && npm run build

# Copiar dist/ al servidor de archivos estáticos
# o dejar que Nginx lo sirva directamente

# Rebuild backend (sin reiniciar)
make reload-backend
```

---

## 10. Comandos de Operación

```bash
# ─── Docker ───────────────────────────────────
make up                          # Levantar todo el stack
make logs                        # Ver logs en tiempo real
make build-serviparamo           # Rebuild frontend ServiPáramo
make reload-backend              # Gunicorn graceful reload (HUP)

# ─── ETL via Makefile ─────────────────────────
make etl                         # ETL completo (todas las tablas)
make etl-skus                    # Solo CatalogoSKU
make etl-catalogo                # Solo RawCategoria + RawFamilia

# ─── ETL via CLI (bare-metal) ─────────────────
cd backend/hub
source venv/bin/activate
python serviparamo/etl.py                       # Todas las tablas
python serviparamo/etl.py --tablas CatalogoSKU  # Solo SKUs
python serviparamo/embeddings.py                # Incremental
python serviparamo/embeddings.py --todos        # Regenerar todo
python serviparamo/normalizer.py                # K-Means + coseno
python serviparamo/normalizer.py --clusters 150 # K personalizado

# ─── Migraciones ──────────────────────────────
python manage.py makemigrations serviparamo
python manage.py migrate

# ─── Verificar API ────────────────────────────
curl -H "Authorization: Token <token>" \
     http://localhost:8005/api/serviparamo/stats/
```

---

## 11. Estado del Sprint 1 (2026-03-22)

| Componente | Estado | Detalle |
|---|---|---|
| Modelos Django (11) | ✅ Completo | Migraciones 0001–0003 aplicadas |
| ETL SQL Server → PostgreSQL | ✅ Completo | 127,090 SKUs cargados |
| ETL tablas Raw* | ✅ Completo | Órdenes, pedidos, kardex, presupuestos |
| Embeddings semánticos | ✅ Completo | 127,090 vectores generados |
| Clustering K-Means | ✅ Completo | 848 clusters, 16,454 grupos de duplicados |
| API REST (13 endpoints) | ✅ Completo | Paginación, filtros, ETL trigger |
| Frontend independiente (React 19 + TS) | ✅ Completo | 9 páginas, branding ServiPáramo |
| Docker Compose integrado | ✅ Completo | Contenedor serviparamo-frontend |
| Búsqueda semántica | ✅ Funcional | O(N) sobre 127K vectores (~5-30s) |
| Tests unitarios | ⏳ Sprint 2 | Pendiente |
| ETL programado (cron) | ⏳ Sprint 2 | Pendiente |
| ETL incremental (`--keep-aprobados`) | ⏳ Sprint 2 | Pendiente |
| Dashboard Power BI | ⏳ Sprint 3 | Andrés — pendiente |
| pgvector + HNSW index | ⏳ Sprint 3 | Búsqueda semántica O(log N) |

---

## 12. Decisiones Técnicas Específicas

### DT-01: K-Means con k automático

**Decisión:** `k = max(50, n_familias_únicas × 3)`

**Razón:** Balancear granularidad de clusters con el número de familias reales del ERP. Multiplicar por 3 permite que cada familia tenga múltiples sub-clusters para variantes ortográficas.

---

### DT-02: Umbral de similitud coseno 0.92

**Decisión:** Dos SKUs son duplicados si su similitud coseno ≥ 0.92.

**Razón:** Empírico: 0.92 captura variantes de descripción ("FILTRO WIX 51358" vs "Filtro Wix-51358") sin generar falsos positivos entre categorías distintas.

**Ajuste:** Configurable por parámetro en `normalizer.py --umbral 0.95`.

---

### DT-03: Embeddings en JSONField (no pgvector en Sprint 1)

**Decisión:** Vectores almacenados como `JSONField` (lista de 384 floats).

**Razón:** Evita dependencias adicionales (`pgvector`, extensión PostgreSQL) en Sprint 1. Para 127K × 384 ≈ 195MB en JSON, manejable en PostgreSQL.

**Trade-off:** Búsqueda semántica O(N) en Python puro (5-30s). Aceptable para demo.

**Evolución Sprint 3:** Migrar a `pgvector` con índice HNSW → O(log N) < 100ms.

---

### DT-04: ETL en hilo de fondo

**Decisión:** `POST /api/serviparamo/etl/run/` dispara `threading.Thread` y responde 202 inmediatamente.

**Razón:** El ETL completo dura 5-20 minutos. Bloquear el worker de Gunicorn sería inaceptable.

**Trade-off:** Sin gestión de cola de tareas. Si se dispara dos veces simultáneamente puede haber race condition. Mitigado con flag de estado en `ETLLog`.

**Evolución:** Reemplazar con Celery + Redis para gestión robusta de tareas.

---

*Módulo ServiPáramo — BarranquIA Hub*
*Ruta IA — Cámara de Comercio de Barranquilla × Boost Business Consulting*
*Última actualización: 22 de marzo de 2026*
