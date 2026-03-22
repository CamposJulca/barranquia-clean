# Documento Técnico — Módulo ServiPáramo
## Normalización Inteligente de Catálogo de SKUs

**Versión:** 1.2
**Fecha:** 2026-03-18
**Proyecto:** BarranquIA Hub
**Módulo:** ServiPáramo
**Responsable:** Daniel
**URL:** https://barranquia-hub.ngrok.io/serviparamo

---

## 1. Objetivo técnico

Construir el backend de procesamiento y la API REST del módulo de normalización de catálogo de ServiPáramo, integrando extracción de datos desde SQL Server, vectorización semántica con modelos de lenguaje y clustering para unificación de familias y detección de duplicados.

---

## 2. Estructura de archivos

```
hub/backend/serviparamo/
├── __init__.py
├── apps.py
├── models.py          ← CatalogoSKU + CatalogoEmbedding
├── serializers.py     ← SKUSerializer + SKUResumenSerializer
├── views.py           ← 6 endpoints REST
├── urls.py            ← Rutas del módulo
├── router.py          ← DB router (SQLite dev / PG prod)
├── etl.py             ← Extracción SQL Server → SQLite
├── embeddings.py      ← Vectorización all-MiniLM-L6-v2
├── normalizer.py      ← K-Means + similitud coseno
├── admin.py
├── tests.py
└── migrations/
    ├── 0001_initial.py
    └── 0002_campos_reales.py

hub/frontend/src/
├── ServiParamo.jsx    ← 4 vistas + router /serviparamo/*
└── ServiParamo.css

serviparamo/docs/
├── DOCUMENTO_TECNICO.md
├── DOCUMENTO_FUNCIONAL.md
└── ARQUITECTURA.md
```

---

## 3. Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Backend API | Django + Django REST Framework | 4.2 / 3.16 |
| ORM / DB (dev) | SQLite | built-in |
| ORM / DB (prod) | PostgreSQL + psycopg2-binary | 16 / 2.9 |
| Fuente de datos | SQL Server vía pyodbc + ODBC Driver 18 | 5.3 |
| Modelo NLP | Sentence Transformers `all-MiniLM-L6-v2` | 5.3 |
| Clustering | scikit-learn `MiniBatchKMeans` | 1.8 |
| Álgebra lineal | numpy | 2.4 |
| Frontend | React 18 + React Router v6 | 18 / 6.21 |
| Servidor | Gunicorn + Nginx | 25 / 1.24 |

---

## 4. Fuente de datos — SQL Server

| Parámetro | Valor |
|---|---|
| Servidor | `ts1.serviparamo.com.co:1433` |
| Base de datos | `PRUEBA` |
| Tabla principal | `inv_ina01` |
| Total registros | 127,090 |
| Driver | ODBC Driver 18 for SQL Server |
| Encrypt | Yes / TrustServerCertificate Yes |

### Columnas extraídas de `inv_ina01`

| Columna SQL | Campo modelo Django | Descripción |
|---|---|---|
| `codigo` | `codigo` | Código del SKU (indexado) |
| `familia` | `familia` | Familia de producto (raw) |
| `categoria` | `categoria` | Categoría / subfamilia |
| `nombre` | `nombre` | Descripción principal |
| `nombre1` | `nombre1` | Descripción secundaria |
| `unidad` | `unidad` | Unidad de medida |

---

## 5. Modelos de datos

### `CatalogoSKU` — tabla `serviparamo_catalogo_skus`

| Campo | Tipo Django | Descripción |
|---|---|---|
| `id` | BigAutoField (PK) | ID interno |
| `codigo` | CharField(50) | Código SKU — `db_index=True` |
| `familia` | CharField(150) | Familia original de SQL Server |
| `familia_normalizada` | CharField(150) | Familia asignada por clustering |
| `categoria` | CharField(150) | Categoría del producto |
| `nombre` | CharField(500) | Descripción principal |
| `nombre1` | CharField(500) | Descripción secundaria |
| `unidad` | CharField(20) | Unidad de medida |
| `cluster_id` | IntegerField (null) | ID del cluster K-Means |
| `es_duplicado` | BooleanField | `True` si similitud coseno ≥ 0.92 |
| `grupo_duplicado` | IntegerField (null) | ID de grupo de duplicados |
| `aprobado` | BooleanField | `True` si aprobado manualmente |
| `cargado_en` | DateTimeField (auto) | Timestamp de ETL |
| `actualizado_en` | DateTimeField (auto) | Timestamp de última modificación |

**Índices adicionales:** `familia`, `familia_normalizada`, `es_duplicado`

### `CatalogoEmbedding` — tabla `serviparamo_catalogo_embeddings`

| Campo | Tipo Django | Descripción |
|---|---|---|
| `id` | BigAutoField (PK) | ID interno |
| `sku` | OneToOneField → CatalogoSKU | Relación 1:1 |
| `vector` | JSONField | Lista de 384 floats (L2-normalizado) |
| `texto_fuente` | TextField | Texto concatenado: familia+categoria+nombre+nombre1 |
| `generado_en` | DateTimeField (auto) | Timestamp de generación |

---

## 6. Pipeline de procesamiento

### Fase 1 — ETL (`etl.py`)

```
SQL Server (inv_ina01, 127K filas)
    ↓ pyodbc — ODBC Driver 18
    ↓ SELECT con LTRIM/RTRIM/ISNULL
    ↓ Normalización: familia.title() | '' → 'SIN FAMILIA'
    ↓ Detección duplicados exactos por código (Counter)
    ↓ bulk_create en lotes de 2,000
SQLite (serviparamo_catalogo_skus)
```

**Resultado:** 127,090 registros · 87,249 duplicados por código (68.7%) · 1,671 sin familia

### Fase 2 — Embeddings (`embeddings.py`)

```
CatalogoSKU (127K registros)
    ↓ Texto: familia + categoria + nombre + nombre1
    ↓ SentenceTransformer('all-MiniLM-L6-v2')
    ↓ encode(batch_size=512, normalize_embeddings=True)
    ↓ Vectores: numpy array (N, 384) — float32 L2-normalizado
    ↓ bulk_create en lotes de 500
CatalogoEmbedding (JSON field)
```

- Modelo descargado automáticamente en primera ejecución (~90MB)
- Soporta modo incremental (`--todos` para regenerar)
- Tiempo estimado: 6–20 min según carga del servidor

### Fase 3 — Normalización (`normalizer.py`)

```
CatalogoEmbedding (N vectores, 384 dims)
    ↓ numpy array (N, 384)
    ↓ MiniBatchKMeans(k=auto, batch_size=min(10K, N))
    │   k = max(50, familias_únicas × 3)
    ↓ labels → familia normalizada por votación mayoritaria
    ↓ cosine_similarity por bloques de 1,000
    │   umbral: ≥ 0.92 → es_duplicado = True
    ↓ bulk_update(cluster_id, familia_normalizada, es_duplicado, grupo_duplicado)
CatalogoSKU (actualizado)
```

---

## 7. API REST — `/api/serviparamo/`

### Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/familias/` | Familias normalizadas con conteo |
| GET | `/buscar/?q=&limit=` | Búsqueda semántica o textual |
| GET | `/duplicados/?familia=&page=&page_size=` | Grupos de duplicados paginados |
| POST | `/aprobar/` | Aprobar ítem o grupo |
| POST | `/fusionar-familias/` | Fusionar variantes de familia |
| GET | `/stats/` | Resumen general del catálogo |

### Detalle de payloads

#### `POST /aprobar/`
```json
// Por ítem:
{ "sku_id": 1234 }

// Por grupo con reasignación de familia:
{ "grupo_id": 5, "familia_normalizada": "Filtros De Aceite" }
```

#### `POST /fusionar-familias/`
```json
{ "familia_origen": "ELECTRICO", "familia_destino": "Eléctrico" }
```

#### `GET /stats/` — respuesta
```json
{
  "total_items": 127090,
  "duplicados": 87249,
  "pct_duplicados": 68.7,
  "aprobados": 0,
  "sin_familia": 1671,
  "familias_normalizadas": 30,
  "grupos_duplicados": 848,
  "con_embedding": 0,
  "pct_embedding": 0.0
}
```

---

## 8. Frontend — rutas y vistas

### Rutas React Router v6

| URL | Componente | Descripción |
|---|---|---|
| `/serviparamo` | → redirect | Redirige a `/serviparamo/dashboard` |
| `/serviparamo/dashboard` | `<Dashboard>` | KPIs + barras de progreso |
| `/serviparamo/buscar` | `<Buscador>` | Input + resultados con similitud |
| `/serviparamo/duplicados` | `<Duplicados>` | Grupos paginados + aprobar |
| `/serviparamo/familias` | `<Familias>` | Lista + fusión de variantes |

### Componentes principales

```jsx
ServiParamo()        ← router raíz — define <Routes>
  Layout()           ← header + nav compartido
  Dashboard()        ← GET /stats/ → KPIs + ProgressBar
  Buscador()         ← GET /buscar/?q=
  Duplicados()       ← GET /duplicados/ + POST /aprobar/
  Familias()         ← GET /familias/ + POST /fusionar-familias/
```

---

## 9. Configuración y despliegue

### Variables de entorno — `.env`

```env
# PostgreSQL (producción)
SERVIPARAMO_DB_NAME=serviparamo_db
SERVIPARAMO_DB_USER=postgres
SERVIPARAMO_DB_PASSWORD=<contraseña>
SERVIPARAMO_DB_HOST=localhost
SERVIPARAMO_DB_PORT=5432
```

### Registro en Django — `settings.py`

```python
INSTALLED_APPS = [..., 'serviparamo']

# Producción: descomentar
# DATABASES['serviparamo'] = { 'ENGINE': 'django.db.backends.postgresql', ... }
# DATABASE_ROUTERS = ['serviparamo.router.ServiParamoRouter']
```

### Registro de URLs — `barranquia/urls.py`

```python
path('api/serviparamo/', include('serviparamo.urls')),
```

### Nginx — proxy frontend SPA

```nginx
location /serviparamo {
    root /home/desarrollo/barranquIA-hub/hub/backend/staticfiles/frontend;
    try_files $uri $uri/ /index.html;
}
```

*(El catch-all existente ya cubre esta ruta.)*

---

## 10. Comandos de operación

```bash
# Entorno
source /home/desarrollo/barranquIA-hub/hub/venv/bin/activate
cd /home/desarrollo/barranquIA-hub/hub/backend

# Migraciones
python manage.py makemigrations serviparamo
python manage.py migrate

# Pipeline completo
python serviparamo/etl.py
python serviparamo/embeddings.py          # incremental
python serviparamo/embeddings.py --todos  # regenerar todo
python serviparamo/normalizer.py
python serviparamo/normalizer.py --clusters 150

# Build frontend
cd ../frontend && npm run build

# Recargar Gunicorn
kill -HUP $(pgrep -f "gunicorn barranquia.wsgi" | head -1)

# Verificar API
curl http://localhost:8005/api/serviparamo/stats/
```

---

## 11. Estado del sprint (2026-03-18)

| Componente | Estado |
|---|---|
| ETL SQL Server → SQLite | ✅ 127,090 registros cargados |
| Modelos + migraciones | ✅ |
| API REST (6 endpoints) | ✅ |
| Rutas `/serviparamo/*` | ✅ |
| Dashboard KPIs + progreso | ✅ |
| Buscador texto/semántico | ✅ |
| Vista duplicados + aprobar | ✅ |
| Vista familias + fusión | ✅ |
| Embeddings semánticos | 🔄 En proceso |
| Clustering + normalización | ⏳ Tras embeddings |
| Migración PostgreSQL | ⏳ Credenciales pendientes |
| Frontend independiente (Juan) | ⏳ Sprint 2 |
| Dashboard Power BI (Andrés) | ⏳ Sprint 3 |
