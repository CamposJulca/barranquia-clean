# Arquitectura de Software — BarranquIA Hub

**Versión:** 1.0  
**Fecha:** 2026-04-12  
**Proyecto:** BarranquIA Hub — Plataforma Centralizada de Servicios IA  
**Programa:** Ruta IA — Barranquilla, Colombia  

---

## 1. Visión General

BarranquIA Hub sigue una **arquitectura de microservicios organizados en monorepo**. Cada microservicio es una unidad independiente con su propio backend, frontend, base de datos y contenedor Docker. Un servicio Hub centraliza la autenticación y actúa como portal de acceso al ecosistema.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USUARIO FINAL                                │
│                      (Navegador Web)                                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NGINX GATEWAY (puerto 9005)                      │
│              Reverse proxy — Host Bare-Metal                        │
└────────┬────────────┬─────────────────┬────────────────┬────────────┘
         │            │                 │                │
         ▼            ▼                 ▼                ▼
    ┌─────────┐ ┌───────────┐   ┌────────────┐   ┌─────────┐
    │   HUB   │ │SERVIPARAMO│   │  AVANTIKA  │   │   JOZ   │
    │Frontend │ │ Frontend  │   │  Frontend  │   │Frontend │
    │ :5174   │ │  :9021    │   │   :9022    │   │  :9023  │
    └────┬────┘ └─────┬─────┘   └─────┬──────┘   └────┬────┘
         │            │               │               │
         ▼            ▼               ▼               ▼
    ┌─────────┐ ┌───────────┐   ┌────────────┐   ┌─────────┐
    │   HUB   │ │SERVIPARAMO│   │  AVANTIKA  │   │   JOZ   │
    │Backend  │ │  Backend  │   │  Backend   │   │ Backend │
    │  :8006  │ │   :8001   │   │   :8012    │   │  :8003  │
    └────┬────┘ └─────┬─────┘   └─────┬──────┘   └────┬────┘
         │            │               │               │
         ▼            ▼               ▼               ▼
    ┌────────────────────────────────────────────────────────┐
    │            PostgreSQL 16 (puerto 5432 interno)         │
    │   DB: barranquia_hub | serviparamo | avantika | joz    │
    └────────────────────────────────────────────────────────┘
                       │                   │
              ┌────────┘                   └──────────┐
              ▼                                       ▼
    ┌──────────────────┐                   ┌──────────────────────┐
    │  SQL Server ERP  │                   │  API SuperEfectivo   │
    │  ts1.serviparamo │                   │  ia.elpenon.pa       │
    │  (pyodbc/ODBC)   │                   │  (REST/Bearer token) │
    └──────────────────┘                   └──────────────────────┘
```

---

## 2. Patrón Arquitectónico por Servicio

Cada microservicio implementa el patrón **BFF (Backend for Frontend)**: el backend expone exactamente los endpoints que su propio frontend necesita, sin capa de API genérica compartida.

```
┌──────────────────────────────────────────────────────┐
│                  MICROSERVICIO (x4)                  │
│                                                      │
│  ┌─────────────────┐      ┌──────────────────────┐  │
│  │    Frontend      │ ───► │      Backend         │  │
│  │  React 19 SPA    │      │  Django 4.2 + DRF    │  │
│  │  Vite + TS       │      │  REST API endpoints  │  │
│  │  Tailwind CSS    │      │  Token Auth          │  │
│  │  Zustand         │      │  Gunicorn WSGI       │  │
│  └─────────────────┘      └──────────┬───────────┘  │
│                                       │              │
│                            ┌──────────▼───────────┐  │
│                            │   PostgreSQL (DB      │  │
│                            │   dedicada por        │  │
│                            │   servicio)           │  │
│                            └──────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## 3. Arquitectura del Hub (Autenticación Centralizada)

```
┌─────────────────────────────────────────────────────┐
│                       HUB                           │
│                                                     │
│  Frontend (React 18)         Backend (Django)       │
│  ┌──────────────────┐       ┌─────────────────────┐ │
│  │ Login Form       │ HTTP  │ POST /api/login/     │ │
│  │ ─────────────    │ ────► │ authenticate()       │ │
│  │ [usuario]        │       │ Token.get_or_create  │ │
│  │ [contraseña]     │ ◄──── │ ─────────────────    │ │
│  │                  │ token │ return {token, user} │ │
│  └────────┬─────────┘       └─────────────────────┘ │
│           │                                         │
│           ▼ token en localStorage                   │
│  ┌──────────────────┐       ┌─────────────────────┐ │
│  │ Service Cards    │ HTTP  │ GET /api/services/   │ │
│  │ ─────────────    │ ────► │ @IsAuthenticated     │ │
│  │ [ServiPáramo]    │       │ return SERVICES_DATA │ │
│  │ [Avantika]       │ ◄──── │                     │ │
│  │ [Joz]            │ JSON  └─────────────────────┘ │
│  └──────────────────┘                               │
└─────────────────────────────────────────────────────┘
```

El token generado en el Hub se reutiliza en los demás microservicios: cada frontend lo lee de `localStorage` y lo inyecta como header `Authorization: Token <token>` en cada petición HTTP.

---

## 4. Flujo de Autenticación Cross-Service

```
Usuario          Hub Frontend       Hub Backend      Microservicio
   │                  │                  │               Frontend
   │  Ingresar        │                  │                  │
   │─────────────────►│                  │                  │
   │                  │ POST /api/login/ │                  │
   │                  │─────────────────►│                  │
   │                  │                  │ authenticate()   │
   │                  │   {token, user}  │                  │
   │                  │◄─────────────────│                  │
   │                  │                  │                  │
   │ Clic en servicio │ localStorage:    │                  │
   │◄─────────────────│ token=xxx        │                  │
   │                  │                  │                  │
   │──────────────────────────────────────────────────────►│
   │                  │    Token se inyecta via interceptor  │
   │                  │    Authorization: Token xxx         │
   │                  │                  │                  │
   │◄──────────────────────────────────────────────────────│
   │   Acceso concedido al microservicio                    │
```

---

## 5. Arquitectura de Datos

### 5.1 Base de datos por servicio (aislamiento)

Cada microservicio tiene su propia base de datos PostgreSQL, usuario y contraseña dedicados. No hay acceso cruzado entre bases de datos.

```
PostgreSQL 16
├── barranquia_hub     (usuario: barranquia)
│   └── authtoken_token, auth_user
├── serviparamo        (usuario: serviparamo)
│   ├── catalogo_skus
│   ├── catalogo_embeddings
│   ├── raw_categorias, raw_familias
│   ├── raw_ordenes_*, raw_pedidos_*
│   └── etl_log
├── avantika           (usuario: avantika)
│   ├── skus
│   ├── pronosticos_demanda
│   └── sugerencias_reposicion
└── joz                (usuario: joz)
    ├── transacciones
    ├── alertas
    ├── riesgos
    └── etl_log
```

### 5.2 Flujo ETL — ServiPáramo

```
SQL Server ERP (ts1.serviparamo.com.co)
        │
        │ pyodbc (ODBC Driver 18)
        ▼
┌──────────────────────────────────────┐
│         Extracción (Extract)         │
│  SELECT * FROM categorias            │
│  SELECT * FROM familias              │
│  SELECT * FROM skus                  │
│  SELECT * FROM ordenes               │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│       Carga en Raw Tables (Load)     │
│  INSERT INTO raw_categorias          │
│  INSERT INTO raw_familias            │
│  INSERT INTO raw_ordenes_*           │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│    Transformación + Embeddings       │
│  Normalización de familias           │
│  sentence-transformers.encode(desc)  │
│  INSERT INTO catalogo_embeddings     │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│         Catálogo normalizado         │
│  CatalogoSKU con embeddings listos   │
│  para búsqueda semántica             │
└──────────────────────────────────────┘
```

### 5.3 Flujo ETL — Joz

```
API SuperEfectivo (ia.elpenon.pa)
        │
        │ HTTP REST (Bearer Token)
        ▼
┌──────────────────────────────────────┐
│    Extracción de transacciones       │
│  GET /transacciones?periodo=...      │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│    Detección de anomalías            │
│  Comparación con patrones históricos │
│  Umbral de desviación configurable   │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│    Generación de alertas y riesgos   │
│  INSERT INTO alertas (si anomalía)   │
│  UPDATE riesgos (por sucursal)       │
└──────────────────────────────────────┘
```

---

## 6. Arquitectura Frontend

Todos los frontends siguen el mismo patrón estructural:

```
src/
├── main.jsx              # Entry point — monta RouterProvider
├── router/
│   └── router.jsx        # createBrowserRouter con rutas anidadas
├── layouts/
│   └── DashboardLayout   # Shell: sidebar + header + outlet
├── pages/                # Un componente por ruta
├── features/             # Componentes específicos de dominio
│   └── [feature]/
│       └── components/
├── components/           # Componentes UI reutilizables
│   └── ui/               # Primitivos Radix UI wrapeados
├── services/
│   ├── api.js            # Axios instance con interceptors
│   └── *Service.js       # Métodos por recurso de API
├── store/
│   └── useSessionStore.js # Zustand: token de sesión
├── hooks/                # Custom React hooks
├── types/                # TypeScript interfaces/types
└── styles/
    └── globals.css       # Tailwind base + variables CSS
```

### 6.1 Capa de servicios (frontend)

```
Componente React
      │
      │ useEffect / click handler
      ▼
Service Method (serviparamoService.js)
      │
      │ api.get('/api/serviparamo/skus/', { params })
      ▼
Axios Instance (api.js)
      │
      │ + Header: Authorization: Token xxx (interceptor)
      ▼
Backend REST API (Django)
      │
      │ Response JSON
      ▼
Componente React (setState / Zustand)
```

### 6.2 Gestión de estado

El estado se mantiene principalmente a nivel de componente con `useState`. Zustand se usa exclusivamente para el token de sesión global:

```
┌─────────────────────────────────────────┐
│         useSessionStore (Zustand)        │
│         token: string | null             │
│         setToken: (token) => void        │
└─────────────────────────────────────────┘
         ▲               ▲
         │               │
   Login.jsx        api.js interceptor
   (setToken)       (lee token)
```

---

## 7. Infraestructura y Contenedores

### 7.1 Diagrama Docker Compose

```
docker network: ruta-ia-net (bridge)
┌────────────────────────────────────────────────────────────────┐
│                      Docker Compose                            │
│                                                                │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  postgres   │◄───│hub-backend   │    │serviparamo-      │  │
│  │  :5432      │◄───│:8006←:8005   │    │backend  :8001    │  │
│  │ (alpine 16) │◄───│              │    │(msodbcsql18)     │  │
│  │             │◄───│avantika-     │    └──────────┬───────┘  │
│  │  4 databases│    │backend       │               │          │
│  │             │    │:8012←:8002   │    ┌──────────▼───────┐  │
│  │             │◄───│              │    │serviparamo-      │  │
│  │ Volume:     │    │joz-backend   │    │frontend :9021    │  │
│  │ postgres_   │    │:8003         │    │(nginx)           │  │
│  │ data        │    └──────────────┘    └──────────────────┘  │
│  └─────────────┘                                              │
│                    ┌──────────────┐    ┌──────────────────┐   │
│                    │avantika-     │    │joz-frontend      │   │
│                    │frontend      │    │:9023 (nginx)     │   │
│                    │:9022 (nginx) │    └──────────────────┘   │
│                    └──────────────┘                           │
│                                                               │
│  Volume: huggingface_cache (modelos de embeddings)            │
└────────────────────────────────────────────────────────────────┘
```

### 7.2 Nginx Gateway (bare-metal)

El Nginx del host actúa como reverse proxy que unifica todos los servicios bajo un único punto de acceso:

```
Puerto 9005 (host)
├── /                   → Hub Frontend
├── /api/               → Hub Backend
├── /serviparamo        → ServiPáramo Frontend
├── /api/serviparamo/   → ServiPáramo Backend
├── /avantika           → Avantika Frontend
├── /api/avantika/      → Avantika Backend
├── /joz                → Joz Frontend
└── /api/joz/           → Joz Backend
```

### 7.3 Build Docker Frontend (multi-stage)

```dockerfile
Stage 1 (builder): node:20-alpine
   npm ci
   npm run build
   → dist/

Stage 2 (runtime): nginx:alpine
   COPY dist/ → /usr/share/nginx/html/
   Expone puerto 80
```

### 7.4 Build Docker Backend

```dockerfile
python:3.11-slim
   pip install -r requirements.txt
   (ServiPáramo: + msodbcsql18 via apt)
   entrypoint.sh:
     python manage.py migrate
     gunicorn wsgi:application --workers 2
```

---

## 8. Diagrama de Secuencia — Búsqueda Semántica (ServiPáramo)

```
Usuario        Frontend        Backend          PostgreSQL       Modelo IA
   │               │               │                 │              │
   │  Escribe      │               │                 │              │
   │  "tornillo M5"│               │                 │              │
   │──────────────►│               │                 │              │
   │               │ GET /buscar/  │                 │              │
   │               │ ?q=tornillo M5│                 │              │
   │               │──────────────►│                 │              │
   │               │               │ encode("tornillo│              │
   │               │               │  M5")           │              │
   │               │               │────────────────────────────────►
   │               │               │               vector[768]      │
   │               │               │◄────────────────────────────────
   │               │               │                 │              │
   │               │               │  cosine_similarity(vector,     │
   │               │               │  catalogo_embeddings)          │
   │               │               │─────────────────►│             │
   │               │               │  TOP 10 SKUs más │             │
   │               │               │  similares       │             │
   │               │               │◄─────────────────│             │
   │               │  [{sku, sim}] │                 │              │
   │               │◄──────────────│                 │              │
   │  Resultados   │               │                 │              │
   │◄──────────────│               │                 │              │
```

---

## 9. Diagrama de Secuencia — Detección de Anomalías (Joz)

```
Cron/Manual     Joz Backend     SuperEfectivo API    PostgreSQL
     │               │                 │                 │
     │  POST         │                 │                 │
     │  /etl/run/    │                 │                 │
     │──────────────►│                 │                 │
     │               │ GET /transacc.. │                 │
     │               │─────────────────►                 │
     │               │  [{transacc..}] │                 │
     │               │◄────────────────                  │
     │               │                 │                 │
     │               │ Para cada transacción:            │
     │               │  calcular z-score vs histórico   │
     │               │  si z > umbral → es anomalía     │
     │               │                 │                 │
     │               │  INSERT transacciones             │
     │               │─────────────────────────────────►│
     │               │  INSERT alertas (si anomalía)     │
     │               │─────────────────────────────────►│
     │               │  UPDATE riesgos (por sucursal)    │
     │               │─────────────────────────────────►│
     │               │  INSERT etl_log                   │
     │               │─────────────────────────────────►│
     │  {status: ok} │                 │                 │
     │◄──────────────│                 │                 │
```

---

## 10. Consideraciones de Seguridad Arquitectónicas

| Aspecto | Estado actual | Mejora recomendada |
|---|---|---|
| Token storage | `localStorage` (vulnerable a XSS) | `httpOnly` cookies |
| Token expiration | Sin expiración (indefinido) | JWT con expiración + refresh token |
| RBAC | No implementado | Roles: admin, analista_catalogo, analista_riesgo |
| HTTPS | Solo via ngrok (desarrollo) | Certificado SSL en Nginx (producción) |
| Secrets management | Variables de entorno en `.env` | Vault o gestor de secretos |
| CORS | Configurado en Django | Restringir a dominios específicos |
| Rate limiting | No implementado | Nginx rate limiting en gateway |
| DB credentials | Un usuario por servicio | Correcto — principio de mínimo privilegio |

---

## 11. Escalabilidad y Despliegue

### Configuración actual (desarrollo/staging)
- Monolito Docker Compose en un único servidor
- 2 workers Gunicorn por backend
- Sin balanceo de carga
- Sin caché de API

### Ruta hacia producción recomendada
```
Actual                          Producción recomendada
──────                          ──────────────────────
Docker Compose (1 host)    →    Kubernetes o Docker Swarm
Gunicorn 2 workers         →    Gunicorn 4+ workers + autoscaling
Sin caché                  →    Redis para caché de respuestas frecuentes
Nginx bare-metal           →    Load balancer + SSL termination
Sin monitoreo              →    Prometheus + Grafana
ETL manual                 →    Celery + Redis Beat para ETL programado
localStorage tokens        →    httpOnly cookies + refresh tokens
```

---

## 12. Resumen de Decisiones Arquitectónicas

| Decisión | Justificación |
|---|---|
| Monorepo con microservicios independientes | Permite desarrollo paralelo por empresa, deploy independiente y aislamiento de datos |
| Django + DRF para todos los backends | Consistencia tecnológica, ORM robusto, auth built-in |
| React + Vite para todos los frontends | Hot reload rápido, ecosistema moderno, TypeScript opcional |
| PostgreSQL por servicio (aislado) | Principio de mínimo privilegio, evita acoplamiento de datos |
| Token DRF (no JWT) | Simplicidad, invalidación síncrona en servidor |
| Tailwind + Radix UI | Velocidad de desarrollo, accesibilidad out-of-the-box |
| Zustand para estado global | Mínima superficie, sin boilerplate de Redux |
| Docker multi-stage para frontends | Imágenes de producción livianas (solo Nginx + assets) |
| Nginx como API Gateway | Centraliza routing, facilita futuro SSL, sin código adicional |
