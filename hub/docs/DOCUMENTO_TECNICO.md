# Documento Técnico — BarranquIA Hub

**Versión:** 3.0
**Fecha:** 2026-04-05
**Estado:** Arquitectura multi-microservicio operativa

---

## 1. Descripción General

BarranquIA Hub es una plataforma de servicios de inteligencia artificial con arquitectura de **microservicios independientes**, cada uno con su propio backend Django, frontend React, base de datos PostgreSQL y contenedor Docker.

Un Nginx en el servidor físico actúa como API Gateway y enruta las peticiones a los contenedores correspondientes según el prefijo de URL. Un túnel ngrok expone el gateway al internet público con HTTPS.

**URL pública:** `https://barranquia-hub.ngrok.io`

---

## 2. Stack Tecnológico

### 2.1 Backend (todos los microservicios)

| Componente | Tecnología | Versión |
|------------|-----------|---------|
| Framework web | Django | 4.2 |
| API REST | Django REST Framework | 3.14 |
| Servidor WSGI | Gunicorn | 21.2 |
| Base de datos | PostgreSQL + psycopg2-binary | 16 / 2.9 |
| Archivos estáticos | WhiteNoise | 6.6 |
| CORS | django-cors-headers | 4.3 |
| Configuración | python-decouple | 3.8 |
| Lenguaje | Python | 3.11 |

**Dependencias adicionales del hub-backend (ServiPáramo):**

| Dependencia | Propósito |
|-------------|-----------|
| `pyodbc` + `msodbcsql18` | Conexión al ERP SQL Server de ServiPáramo |
| `sentence-transformers` (`all-MiniLM-L6-v2`) | Embeddings semánticos para normalización |
| `scikit-learn` (K-Means, cosine_similarity) | Clustering y similitud para deduplicación |
| `numpy` | Operaciones vectoriales |

### 2.2 Frontend (todos los módulos)

| Componente | Hub | ServiPáramo | Avantika | Joz |
|------------|-----|-------------|----------|-----|
| Framework | React 18 | React 19 | React 19 | React 19 |
| Bundler | Vite 5 | Vite 8 | Vite 8 | Vite 8 |
| Routing | react-router-dom 6 | react-router-dom 7 | react-router-dom 7 | react-router-dom 7 |
| Estilos | CSS | Tailwind 4 | Tailwind 3 | Tailwind 3 |
| Estado | — | Zustand 5 | Zustand 5 | Zustand 5 |
| Gráficas | — | Recharts 3.8 | Recharts 3.8 | Recharts 3.8 |
| Componentes | — | Radix UI | Radix UI | — |
| HTTP | Axios 1.6 | Axios 1.13 | Axios | Axios |
| Iconos | — | Lucide React | Lucide React | — |

### 2.3 Infraestructura

| Componente | Tecnología | Propósito |
|------------|-----------|-----------|
| Contenedores | Docker Compose | Orquestación de 8 contenedores |
| Red interna | Docker bridge (`ruta-ia-net`) | Comunicación entre contenedores |
| Gateway | Nginx (bare-metal, :9005) | Enrutamiento por prefijo de URL |
| Túnel HTTPS | ngrok | Acceso público `barranquia-hub.ngrok.io` |
| Base de datos | PostgreSQL 16 Alpine | Almacenamiento central (4 BDs) |

---

## 3. Estructura del Repositorio

```
barranquIA-clean/
├── hub/
│   ├── backend/                     # Proyecto Django
│   │   ├── api/                     # App Hub Core
│   │   │   ├── views.py             # login, logout, health, services
│   │   │   └── urls.py
│   │   ├── barranquia/              # Config Django
│   │   │   ├── settings.py
│   │   │   ├── urls.py
│   │   │   └── wsgi.py
│   │   ├── staticfiles/
│   │   │   └── frontend/            # Build React compilado (assets)
│   │   ├── frontend-dist/           # index.html + assets (fuera de STATIC_ROOT)
│   │   ├── manage.py
│   │   └── requirements.txt
│   ├── frontend/                    # React 18
│   │   ├── src/
│   │   │   ├── App.jsx              # Panel de servicios
│   │   │   ├── Login.jsx            # Formulario de login
│   │   │   └── main.jsx
│   │   ├── index.html
│   │   └── vite.config.js
│   ├── infra/
│   │   ├── docker/
│   │   │   ├── Dockerfile.backend
│   │   │   └── entrypoint.sh
│   │   └── server/nginx/
│   │       └── barranquia-hub.conf  # Config Nginx gateway
│   └── docs/                        # Esta documentación
│
├── serviparamo/
│   ├── backend/
│   │   ├── core/                    # Config Django ServiPáramo
│   │   │   ├── settings.py
│   │   │   └── urls.py
│   │   ├── serviparamo/             # App principal
│   │   │   ├── models.py            # 12 modelos
│   │   │   ├── views.py             # 13 endpoints REST
│   │   │   ├── serializers.py
│   │   │   ├── urls.py
│   │   │   ├── etl.py               # ETL SQL Server → PostgreSQL
│   │   │   ├── embeddings.py        # Vectorización NLP
│   │   │   └── normalizer.py        # K-Means + similitud coseno
│   │   └── requirements.txt
│   ├── frontend/                    # React 19 + Tailwind + TypeScript
│   │   └── src/
│   │       ├── pages/               # Dashboard, Catalog, Duplicates...
│   │       ├── components/          # Loader, Table, Chart
│   │       ├── layouts/             # DashboardLayout, Header
│   │       ├── router/              # 7 rutas
│   │       ├── services/            # api.js, serviparamoService.js
│   │       └── store/               # Zustand (useSessionStore)
│   └── infra/
│       ├── Dockerfile.backend
│       ├── Dockerfile.frontend      # Multi-stage: Node → Nginx
│       └── nginx.conf
│
├── avantika/
│   ├── backend/
│   │   ├── core/                    # Config Django Avantika
│   │   └── avantika/                # App principal
│   │       ├── models.py            # SKU, PronosticoDemanda, SugerenciaReposicion
│   │       ├── views.py             # 6 endpoints REST
│   │       └── urls.py
│   ├── frontend/                    # React 19 + Radix UI
│   │   └── src/
│   │       ├── pages/avantika/      # VistaGeneral, Skus, Forecast
│   │       ├── components/          # Chart, Table, Sidebar
│   │       └── services/
│   └── infra/
│       ├── Dockerfile.backend
│       └── Dockerfile.frontend
│
├── joz/
│   ├── backend/
│   │   ├── core/                    # Config Django Joz
│   │   └── joz/                     # App principal
│   │       ├── models.py            # Transaccion, Alerta, Riesgo
│   │       ├── views.py             # 6 endpoints REST
│   │       └── urls.py
│   ├── frontend/                    # React 19 + Recharts
│   │   └── src/
│   │       ├── pages/               # Dashboard, Alerts, Risks, History
│   │       ├── components/          # Chart, Table, Sidebar
│   │       └── services/
│   └── infra/
│       ├── Dockerfile.backend
│       └── Dockerfile.frontend
│
├── shared/
│   ├── docker-compose.yml           # Orquestación de 8 contenedores
│   ├── postgres/
│   │   └── init.sql                 # Crea 4 roles y 4 bases de datos
│   └── scripts/
│       ├── deploy-nginx.sh
│       └── deploy-ngrok.sh
│
├── Makefile
├── .env
└── .env.example
```

---

## 4. Convención de Puertos

| Puerto (host) | Puerto (container) | Servicio | Descripción |
|---------------|--------------------|----------|-------------|
| `9005` | — | Nginx (bare-metal) | API Gateway entrada pública |
| `8006` | `8005` | hub-backend | Django Hub + Gunicorn |
| `8001` | `8001` | serviparamo-backend | Django ServiPáramo + Gunicorn |
| `9021` | `80` | serviparamo-frontend | Nginx + React SPA |
| `8012` | `8002` | avantika-backend | Django Avantika + Gunicorn |
| `9022` | `80` | avantika-frontend | Nginx + React SPA |
| `8003` | `8003` | joz-backend | Django Joz + Gunicorn |
| `9023` | `80` | joz-frontend | Nginx + React SPA |
| `5432` | `5432` | postgres | PostgreSQL 16 (interno) |

---

## 5. Base de Datos

### 5.1 PostgreSQL — Inicialización

**Archivo:** `shared/postgres/init.sql`

```sql
-- 4 roles con contraseñas específicas
CREATE ROLE barranquia  SUPERUSER LOGIN PASSWORD 'Barranquia2024Hub';
CREATE ROLE serviparamo LOGIN PASSWORD 'serviparamo2024';
CREATE ROLE avantika    LOGIN PASSWORD 'avantika2024';
CREATE ROLE joz         LOGIN PASSWORD 'joz2024';

-- 4 bases de datos, una por microservicio
CREATE DATABASE barranquia_hub OWNER barranquia;
CREATE DATABASE serviparamo    OWNER serviparamo;
CREATE DATABASE avantika       OWNER avantika;
CREATE DATABASE joz            OWNER joz;
```

### 5.2 Modelos por microservicio

**Hub** (`barranquia_hub`): Solo tablas estándar de Django Auth y DRF Token
- `auth_user`, `authtoken_token`, tablas de sesiones y permisos

**ServiPáramo** (`serviparamo`): 12 modelos

| Modelo | Descripción |
|--------|-------------|
| `CatalogoSKU` | SKU normalizado con código, descripción, familia, categoría, estado de aprobación |
| `CatalogoEmbedding` | Vector semántico (384 dims) asociado a cada SKU |
| `RawCategoria` | Categorías extraídas del ERP |
| `RawFamilia` | Familias extraídas del ERP |
| `RawOrdenEncabezado` | Cabecera de órdenes de compra del ERP |
| `RawOrdenDetalle` | Líneas de órdenes de compra |
| `RawPedidoEncabezado` | Cabecera de solicitudes de pedido |
| `RawPedidoDetalle` | Líneas de solicitudes de pedido |
| `RawPresupuestoDetalle` | Líneas de presupuesto |
| `RawPresupuestoResumen` | Resúmenes de presupuesto |
| `RawKardex` | Movimientos de inventario |
| `ETLLog` | Registro de ejecuciones del ETL |

**Avantika** (`avantika`): 3 modelos

| Modelo | Campos clave |
|--------|-------------|
| `SKU` | codigo, nombre, categoria, clasificacion_abc (A/B/C), stock_actual, nivel_reorden, precio_unitario, proveedor |
| `PronosticoDemanda` | fk→SKU, fecha, demanda_pronosticada, limite_superior, limite_inferior, modelo_version |
| `SugerenciaReposicion` | fk→SKU, cantidad_sugerida, fecha_generacion, estado |

**Joz** (`joz`): 3 modelos

| Modelo | Campos clave |
|--------|-------------|
| `Transaccion` | monto, tipo, fecha, descripcion, es_anomalia |
| `Alerta` | descripcion, severidad (baja/media/alta/critica), estado (pendiente/en_revision/resuelta), fk→Transaccion |
| `Riesgo` | descripcion, nivel, impacto, estado |

---

## 6. API REST

### 6.1 Hub — Endpoints Core

**URL base:** `https://barranquia-hub.ngrok.io/api/`
**Autenticación:** Token DRF — `Authorization: Token <token>`
**Formato:** JSON
**Locale:** `es-co` / `America/Bogota`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/health/` | No | Estado del servicio |
| `POST` | `/api/login/` | No | Autenticación, retorna token |
| `POST` | `/api/logout/` | Token | Invalida token actual |
| `GET` | `/api/services/` | Token | Catálogo de módulos disponibles |

**POST /api/login/**
```json
// Request
{ "username": "admin", "password": "admin2026" }

// Response 200
{ "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b", "username": "admin" }

// Response 400
{ "error": "Credenciales inválidas" }
```

**GET /api/services/**
```json
// Response 200
[
  { "id": "serviparamo", "name": "ServiPáramo", "description": "Normalización inteligente de catálogo de SKUs", "icon": "🏔️", "color": "#1a3a5c", "path": "/serviparamo", "active": true },
  { "id": "avantika",    "name": "Avantika",    "description": "Gestión de inventario y pronóstico de demanda", "icon": "📦", "color": "#2d6a4f", "path": "/avantika",    "active": true },
  { "id": "joz",         "name": "Joz",         "description": "Análisis de anomalías y alertas operativas", "icon": "🔔", "color": "#6b2d6b", "path": "/joz",         "active": true }
]
```

---

### 6.2 ServiPáramo — Endpoints (prefijo `/api/serviparamo/`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/stats/` | KPIs generales: total SKUs, normalizados, duplicados, familias |
| `GET` | `/skus/` | Catálogo paginado; filtros: `familia`, `categoria`, `q` (búsqueda texto) |
| `GET` | `/skus/<codigo>/` | Detalle de un SKU |
| `GET` | `/familias/` | Lista de familias normalizadas |
| `GET` | `/categorias/` | Lista de categorías |
| `GET` | `/ordenes/` | Órdenes de compra del ERP |
| `GET` | `/pedidos/` | Solicitudes de pedido del ERP |
| `GET` | `/duplicados/` | Grupos de duplicados paginados |
| `POST` | `/aprobar/` | Aprobar SKU como maestro `{ "codigo": "SKU001" }` |
| `POST` | `/fusionar-familias/` | Fusionar dos familias `{ "origen": "F1", "destino": "F2" }` |
| `GET` | `/etl/status/` | Estado y log del último ETL |
| `POST` | `/etl/run/` | Disparar ETL en hilo background |
| `GET` | `/buscar/?q=<texto>` | Búsqueda semántica por embedding |

---

### 6.3 Avantika — Endpoints (prefijo `/api/avantika/`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/stats/` | Resumen: total SKUs, clasificación ABC, alertas activas |
| `GET` | `/clasificacion-abc/` | SKUs con su clasificación A/B/C y métricas |
| `POST` | `/predecir-demanda/` | Genera pronóstico para SKU `{ "codigo": "SKU001" }` |
| `GET` | `/sugerencias-reposicion/` | Sugerencias pendientes de reposición |
| `POST` | `/parametros/` | Actualiza parámetros del modelo (placeholder) |
| `POST` | `/log-feedback/` | Registra feedback del usuario (placeholder) |

---

### 6.4 Joz — Endpoints (prefijo `/api/joz/`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/stats/` | Resumen: alertas activas, transacciones, riesgos |
| `GET` | `/anomalias-por-dia/` | Conteo de anomalías por día (últimos 30 días) |
| `GET` | `/alertas/` | Listado paginado de alertas; filtros: `severidad`, `estado` |
| `PATCH` | `/alertas/<pk>/` | Actualizar estado de alerta `{ "estado": "resuelta" }` |
| `GET` | `/riesgos/` | Listado de riesgos activos |
| `GET` | `/historial/` | Historial de transacciones paginado |

---

## 7. Configuración Django

### 7.1 Hub Backend

```python
# hub/backend/barranquia/settings.py

DEBUG = False
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='*').split(',')
LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Bogota'
CORS_ALLOW_ALL_ORIGINS = True

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='barranquia_hub'),
        'USER': config('DB_USER', default='barranquia'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

STATIC_ROOT = BASE_DIR / 'staticfiles'
WHITENOISE_ROOT = BASE_DIR / 'frontend-dist'  # Sirve /assets/... en raíz

TEMPLATES = [{ 'DIRS': [BASE_DIR / 'frontend-dist'] }]  # index.html Hub

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.TokenAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
}

INSTALLED_APPS = [..., 'rest_framework', 'rest_framework.authtoken', 'corsheaders', 'api']
```

### 7.2 ServiPáramo, Avantika, Joz (patrón común)

```python
# core/settings.py (cada microservicio)

DJANGO_SETTINGS_MODULE = 'core.settings'
DEBUG = False
ALLOWED_HOSTS = ['*']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', 'postgres'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.TokenAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
}
```

---

## 8. Infraestructura Docker

### 8.1 Docker Compose (`shared/docker-compose.yml`)

```
Servicios y puertos (host → container):
┌────────────────────────────────────────────────────────┐
│  postgres             (sin port expose — solo red interna)│
│  hub-backend          :8006 → :8005                     │
│  serviparamo-backend  :8001 → :8001                     │
│  serviparamo-frontend :9021 → :80                       │
│  avantika-backend     :8012 → :8002                     │
│  avantika-frontend    :9022 → :80                       │
│  joz-backend          :8003 → :8003                     │
│  joz-frontend         :9023 → :80                       │
└────────────────────────────────────────────────────────┘
Red: ruta-ia-net (bridge)
Volúmenes: postgres_data, huggingface_cache
```

Todos los puertos están vinculados a `127.0.0.1` (no expuestos directamente a internet). El acceso externo va siempre a través de Nginx en `:9005`.

### 8.2 Dockerfiles — Hub Backend

**`hub/infra/docker/Dockerfile.backend`:**
```dockerfile
FROM python:3.11-slim

# Instala dependencias sistema: gcc, libpq-dev, unixodbc-dev, msodbcsql18
RUN apt-get install -y ... msodbcsql18

COPY hub/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY hub/backend/ .

# Frontend dist en directorio separado (no lo borra collectstatic)
RUN mkdir -p /app/frontend-dist && cp -r /app/staticfiles/frontend/. /app/frontend-dist/

EXPOSE 8005
ENTRYPOINT ["/entrypoint.sh"]
```

**`hub/infra/docker/entrypoint.sh`:**
```bash
# 1. Esperar PostgreSQL (health check con psycopg2)
# 2. python manage.py migrate --noinput
# 3. python manage.py collectstatic --noinput --clear
# 4. gunicorn barranquia.wsgi:application --bind 0.0.0.0:8005 --workers 3
```

### 8.3 Dockerfiles — Frontends (patrón multi-stage)

```dockerfile
# Etapa 1: Build React
FROM node:20-alpine AS builder
COPY <modulo>/frontend/ .
ARG VITE_API_URL=""
RUN npm install && npm run build

# Etapa 2: Serve con Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY <modulo>/infra/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**`nginx.conf` de cada frontend:**
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    location / {
        try_files $uri $uri/ /index.html;  # SPA routing
    }
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    gzip on;
}
```

---

## 9. Nginx Gateway (bare-metal)

**Archivo:** `hub/infra/server/nginx/barranquia-hub.conf`
**Instalación:** `sudo cp ... /etc/nginx/sites-enabled/barranquia-hub`

```nginx
server {
    listen 9005;
    server_name barranquia-hub.ngrok.io 192.168.0.101 localhost;
    client_max_body_size 20M;

    # APIs de microservicios (orden importante: específico antes que general)
    location /api/serviparamo/ { proxy_pass http://127.0.0.1:8001; ... }
    location /api/avantika/    { proxy_pass http://127.0.0.1:8012; ... }
    location /api/joz/         { proxy_pass http://127.0.0.1:8003; ... }
    location /api/             { proxy_pass http://127.0.0.1:8006; ... }

    # Frontends de microservicios
    location /serviparamo/ { proxy_pass http://127.0.0.1:9021/; }
    location /avantika/    { proxy_pass http://127.0.0.1:9022/; }
    location /joz/         { proxy_pass http://127.0.0.1:9023/; }

    # Hub
    location /admin/  { proxy_pass http://127.0.0.1:8006; }
    location /static/ { proxy_pass http://127.0.0.1:8006/static/; expires 30d; }
    location /        { proxy_pass http://127.0.0.1:8006; }  # Hub React SPA
}
```

---

## 10. Variables de Entorno

**Archivo:** `.env` (git-ignored) / `.env.example` (plantilla)

| Variable | Servicio | Descripción | Ejemplo |
|----------|---------|-------------|---------|
| `SECRET_KEY` | Hub | Clave secreta Django | `cambia-esta-clave-...` |
| `DEBUG` | Hub | Modo depuración | `False` |
| `ALLOWED_HOSTS` | Hub | Hosts permitidos | `localhost,127.0.0.1,barranquia-hub.ngrok.io,...` |
| `DB_NAME` | Hub | BD Hub | `barranquia_hub` |
| `DB_USER` | Hub | Usuario BD Hub | `barranquia` |
| `DB_PASSWORD` | Hub | Contraseña BD Hub | `Barranquia2024Hub` |
| `DB_HOST` | Hub | Host BD | `postgres` (Docker) |
| `SERVIPARAMO_DB_USER` | ServiPáramo | Usuario BD | `serviparamo` |
| `SERVIPARAMO_DB_PASSWORD` | ServiPáramo | Contraseña BD | `serviparamo2024` |
| `SERVIPARAMO_SECRET_KEY` | ServiPáramo | Clave Django | `serviparamo-secret-...` |
| `SERVIPARAMO_ERP_HOST` | ServiPáramo | Host SQL Server | `ts1.serviparamo.com.co` |
| `SERVIPARAMO_ERP_PORT` | ServiPáramo | Puerto SQL Server | `1433` |
| `SERVIPARAMO_ERP_DB` | ServiPáramo | BD ERP | `PRUEBA` |
| `SERVIPARAMO_ERP_PASS` | ServiPáramo | Contraseña ERP | `<confidencial>` |
| `AVANTIKA_DB_USER` | Avantika | Usuario BD | `avantika` |
| `AVANTIKA_DB_PASSWORD` | Avantika | Contraseña BD | `avantika2024` |
| `AVANTIKA_SECRET_KEY` | Avantika | Clave Django | `avantika-secret-...` |
| `JOZ_DB_USER` | Joz | Usuario BD | `joz` |
| `JOZ_DB_PASSWORD` | Joz | Contraseña BD | `joz2024` |
| `JOZ_SECRET_KEY` | Joz | Clave Django | `joz-secret-...` |
| `GUNICORN_WORKERS` | Todos | Workers Gunicorn | `3` |
| `GUNICORN_TIMEOUT` | Todos | Timeout (s) | `120` |

---

## 11. Proceso ETL — ServiPáramo

**Archivo:** `serviparamo/backend/serviparamo/etl.py` (426 líneas)

### Pipeline de ejecución

```
POST /api/serviparamo/etl/run/
  │
  └── Thread background (no bloquea Gunicorn)
        │
        ├── 1. Conectar SQL Server (pyodbc + ODBC Driver 18)
        │      Host: ts1.serviparamo.com.co:1433, DB: PRUEBA
        │      Tablas: inv_ina01 (127K filas), órdenes, pedidos, presupuestos
        │
        ├── 2. Extraer y limpiar datos
        │      Normalizar mayúsculas, quitar caracteres especiales
        │      Detectar campos vacíos o malformados
        │
        ├── 3. Insertar en tablas Raw (PostgreSQL)
        │      RawCategoria, RawFamilia, RawOrdenEncabezado/Detalle
        │      RawPedidoEncabezado/Detalle, RawPresupuestoDetalle/Resumen, RawKardex
        │
        ├── 4. Generar embeddings semánticos (sentence-transformers)
        │      Modelo: all-MiniLM-L6-v2 (384 dimensiones)
        │      Vectoriza descripciones de SKU → CatalogoEmbedding
        │      Cache: /root/.cache/huggingface (volumen Docker)
        │
        ├── 5. Detectar duplicados (cosine similarity)
        │      Umbral configurable (default: 0.85)
        │      Agrupa SKUs similares → CatalogoSKU.estado = 'duplicado'
        │
        └── 6. Registrar en ETLLog
               Fecha, registros procesados, errores, duración
```

---

## 12. Autenticación — Flujo Técnico

```
[Usuario]
  │── POST /api/login/ { username, password }
  ▼
[Nginx :9005] → proxy → [hub-backend :8006 → :8005]
  │  django.contrib.auth.authenticate(username, password)
  │  Token.objects.get_or_create(user=user)   ← tabla authtoken_token
  ▼
[Cliente] ← { "token": "9944b09...", "username": "admin" }
  │  localStorage.setItem('token', ...)
  │
  ├── [Hub React] lee token → muestra panel de módulos
  │
  └── [Módulo React] carga → verifica token
        │── GET /api/health/ Authorization: Token 9944b09...
        │◄── 200 OK → renderiza módulo
        └── 401 Unauthorized → redirect a Hub login
```

---

## 13. Comandos de Gestión (Makefile)

```bash
# Ciclo de vida
make setup          # Primera vez: build + up
make up             # Levantar todos los servicios
make down           # Detener y eliminar contenedores
make restart        # Reiniciar todos
make build          # Construir imágenes
make rebuild        # Reconstruir sin cache
make ps             # Estado de contenedores

# Por microservicio
make up-hub         make down-hub         make logs-hub
make up-serviparamo make down-serviparamo make logs-serviparamo
make up-avantika    make down-avantika    make logs-avantika
make up-joz         make down-joz         make logs-joz

# Django
make shell-hub      # Django shell hub
make migrate-hub    # Migraciones hub
make shell-serviparamo
make migrate-serviparamo
# (idem para avantika y joz)

# ServiPáramo
make etl            # Dispara ETL completo
make etl-skus       # ETL solo SKUs

# Base de datos
make db-shell       # Shell PostgreSQL (BD hub)
make db-shell-serviparamo

# Despliegue
make deploy-nginx   # Copia y recarga config Nginx (sudo)
make deploy-ngrok   # Configura túnel ngrok (sudo)
make deploy         # Ambos
```

---

## 14. Desarrollo Local

```bash
# Levantar todo el stack con Docker
cd shared
docker compose up -d

# Ver logs
docker compose logs -f hub-backend

# Desarrollo frontend (con hot-reload)
cd hub/frontend && npm install && npm run dev      # :5173
cd serviparamo/frontend && npm run dev             # :5174
cd avantika/frontend && npm run dev                # :5175
cd joz/frontend && npm run dev                     # :5176

# Django shell (microservicio específico)
docker exec barranquia_hub_backend python manage.py shell
docker exec barranquia_serviparamo_backend python manage.py shell
docker exec barranquia_avantika_backend python manage.py shell
docker exec barranquia_joz_backend python manage.py shell
```

---

## 15. Estado de Implementación

| Componente | Estado | Notas |
|------------|--------|-------|
| Hub Backend | ✅ Operativo | Auth, servicios, health check |
| Hub Frontend | ✅ Operativo | Login, grid de módulos |
| ServiPáramo Backend | ✅ Operativo | 12 modelos, 13 endpoints, ETL, embeddings |
| ServiPáramo Frontend | 🔧 En desarrollo | Scaffolding completo, 7 rutas |
| Avantika Backend | ✅ Operativo | 3 modelos, 6 endpoints |
| Avantika Frontend | 🔧 En desarrollo | 3 páginas implementadas |
| Joz Backend | ✅ Operativo | 3 modelos, 6 endpoints |
| Joz Frontend | 🔧 En desarrollo | Dashboard parcial |
| Docker Compose | ✅ Operativo | 8 contenedores, red bridge |
| PostgreSQL | ✅ Operativo | 4 BDs independientes |
| Nginx Gateway | ✅ Operativo | Bare-metal :9005 |
| ngrok | ✅ Activo | barranquia-hub.ngrok.io |

---

*BarranquIA Hub — Ruta IA × Cámara de Comercio de Barranquilla × Boost Business Consulting*
*Última actualización: 5 de abril de 2026*
