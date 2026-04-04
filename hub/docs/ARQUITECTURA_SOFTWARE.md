# Arquitectura de Software — BarranquIA Hub

**Versión:** 2.0
**Fecha:** 2026-03-22
**Estado:** Sprint 1 completado

---

## 1. Estilo Arquitectónico

BarranquIA Hub adopta un estilo de **Micro-Frontend + Django Monolito Modular**, con un hub de autenticación centralizado y módulos de negocio como SPAs independientes.

Cada módulo (ServiPáramo, Avantika, Joz) es una aplicación React independiente que se integra al ecosistema mediante:

1. **Autenticación compartida** vía Token DRF (Hub como Identity Provider único)
2. **Enrutamiento por prefijo de URL** (Nginx como API Gateway)
3. **Backend modular** en Django (`INSTALLED_APPS`), extraíble como microservicio cuando escale
4. **Despliegue containerizado** con Docker Compose

Este patrón permite que equipos independientes desarrollen e iteren cada módulo sin afectar a los demás, con mínima fricción operativa en las fases tempranas del proyecto.

---

## 2. Vista de Contexto (C4 — Nivel 1)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET / LAN                               │
│                                                                      │
│   Analistas y operadores de negocio                                  │
│            │                                                         │
│            │  HTTPS (ngrok) / HTTP (LAN :9005)                      │
│            ▼                                                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    BarranquIA Hub                            │   │
│   │          Plataforma centralizada de servicios IA             │   │
│   │                                                              │   │
│   │  • Autenticación unificada (Token DRF)                       │   │
│   │  • Catálogo de módulos de negocio                            │   │
│   │  • Enrutamiento hacia módulos especializados                 │   │
│   └─────────────────────────────────────────────────────────────┘   │
│         │                │                │               │          │
│    ServiPáramo        Avantika           Joz           Power BI     │
│   (Catálogo IA)    (Inventario)       (Alertas)          (BI)       │
│                                                                      │
│                                             SQL Server (ERP externo)│
│                                             ts1.serviparamo.com.co  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Vista de Contenedores (C4 — Nivel 2)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  BarranquIA Hub — Sistema completo (red Docker: ruta-ia-net)                    │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  nginx  :9005  (API Gateway + Proxy Inverso)                             │   │
│  │                                                                          │   │
│  │  /api/*              → http://hub-backend:8005/api/                      │   │
│  │  /admin/*            → http://hub-backend:8005/admin/                    │   │
│  │  /static/*           → http://hub-backend:8005/static/                   │   │
│  │  /serviparamo/*      → http://serviparamo-frontend:80/                   │   │
│  │  /                   → http://hub-backend:8005  (Hub React SPA)          │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│          │                                    │                                  │
│          ▼                                    ▼                                  │
│  ┌───────────────────────────┐   ┌────────────────────────────────────────────┐ │
│  │  serviparamo-frontend     │   │  hub-backend  :8005                        │ │
│  │  Nginx (alpine)           │   │  Python 3.11 + Django 4.2 + Gunicorn       │ │
│  │  React 19 + TypeScript    │   │                                            │ │
│  │  Vite build (dist/)       │   │  Apps Django:                              │ │
│  │  Base: /serviparamo/      │   │  ├── api/         (Hub Core)               │ │
│  │                           │   │  └── serviparamo/ (Módulo SKUs)            │ │
│  │  Páginas:                 │   │                                            │ │
│  │  /serviparamo/            │   │  Endpoints Hub:                            │ │
│  │  /serviparamo/catalog     │   │  • POST /api/login/                        │ │
│  │  /serviparamo/duplicate   │   │  • POST /api/logout/                       │ │
│  │  /serviparamo/normalization│  │  • GET  /api/health/                       │ │
│  │  /serviparamo/semantic-*  │   │  • GET  /api/services/                     │ │
│  │  /serviparamo/purchases   │   │  • GET  /api/verify-token/                 │ │
│  │  /serviparamo/settings    │   │                                            │ │
│  └───────────────────────────┘   │  Endpoints ServiPáramo (13):               │ │
│                                  │  • GET  /api/serviparamo/stats/            │ │
│                                  │  • GET  /api/serviparamo/skus/             │ │
│                                  │  • GET  /api/serviparamo/duplicados/       │ │
│                                  │  • GET  /api/serviparamo/buscar/           │ │
│                                  │  • POST /api/serviparamo/etl/run/          │ │
│                                  │  • ... (ver doc ServiPáramo)               │ │
│                                  │                                            │ │
│                                  │  ORM: Django ORM                           │ │
│                                  │  Auth: DRF Token Authentication            │ │
│                                  │  Caché modelos HF: /root/.cache/hf/        │ │
│                                  └────────────────────┬───────────────────────┘ │
│                                                       │                          │
│                                                       ▼                          │
│                                          ┌─────────────────────┐                │
│                                          │  postgres  :5432     │                │
│                                          │  PostgreSQL 16       │                │
│                                          │                      │                │
│                                          │  Tablas Hub:         │                │
│                                          │  • auth_user         │                │
│                                          │  • authtoken_token   │                │
│                                          │                      │                │
│                                          │  Tablas ServiPáramo: │                │
│                                          │  • sp_catalogo_skus  │                │
│                                          │  • sp_embeddings     │                │
│                                          │  • sp_raw_*  (9)     │                │
│                                          │  • sp_etl_log        │                │
│                                          └─────────────────────┘                │
│                                                                                 │
│  Volumes:                                                                       │
│  • postgres_data        → datos persistentes PostgreSQL                         │
│  • huggingface_cache    → modelos NLP descargados (~90MB)                       │
└─────────────────────────────────────────────────────────────────────────────────┘

Sistema Externo:
┌──────────────────────────────────┐
│  SQL Server ERP ServiPáramo      │
│  ts1.serviparamo.com.co:1433     │
│  Base: PRUEBA                    │
│  Tabla: inv_ina01 (127K filas)   │
│  Conexión: pyodbc + ODBC Driver  │
└──────────────────────────────────┘
         ↑
         │ ETL on-demand (via API o Makefile)
         │
   hub-backend (etl.py)
```

---

## 4. Topología de Despliegue

### 4.1 Despliegue con Docker (modo desarrollo / demo)

```
Servidor físico: 192.168.0.101
├── Docker Engine
│   └── docker-compose.yml (red: ruta-ia-net)
│       ├── postgres          :5432  → volumen postgres_data
│       ├── hub-backend       :8005  → volumen huggingface_cache
│       ├── serviparamo-frontend :80
│       └── nginx             :9005  (expuesto al host)
│
└── ngrok → barranquia-hub.ngrok.io → localhost:9005
```

### 4.2 Despliegue Bare-Metal (modo producción)

```
Servidor físico: 192.168.0.101 (Linux Ubuntu)
│
├── PostgreSQL :5432 (servicio local)
│
├── Gunicorn :8005  (gestionado por SystemD)
│   └── barranquia-hub.service
│       └── 3 workers → barranquia.wsgi:application
│
├── Nginx :9005  (configuración: barranquia-hub.conf)
│   ├── /api/           → proxy 127.0.0.1:8005
│   ├── /serviparamo/   → dist/ compilado (archivos estáticos)
│   └── /               → Hub React SPA (staticfiles)
│
└── ngrok  (barranquia-ngrok.service)
    └── barranquia-hub.ngrok.io → localhost:9005
```

### 4.3 Acceso

| Entorno | URL |
|---|---|
| Red local (LAN) | `http://192.168.0.101:9005` |
| Externo (ngrok) | `https://barranquia-hub.ngrok.io` |

---

## 5. Flujo de Red y Autenticación

```
Usuario
  │
  │  1. GET https://barranquia-hub.ngrok.io
  ▼
ngrok
  │  → localhost:9005
  ▼
Nginx :9005
  │
  ├── /                        → Hub React SPA (index.html)
  │     └── React carga, ejecuta AuthGuard
  │           │── GET /api/verify-token/ ──────────────────────► Django
  │           │◄── 200 (token válido) ────────────────────────── Django
  │           └── renderiza panel de servicios
  │
  ├── /api/login/              → Django :8005
  │     │── POST { username, password }
  │     │◄── { token, username }
  │     └── cliente guarda token en localStorage
  │
  ├── /serviparamo/*           → serviparamo-frontend :80
  │     └── React SPA ServiPáramo
  │           │── GET /api/verify-token/ (Auth Guard)
  │           └── (si válido) renderiza módulo
  │
  └── /api/serviparamo/*       → Django :8005
        └── lógica de negocio ServiPáramo
```

### Flujo de autenticación detallado (Hub → Módulo)

```
[Hub React]       [Nginx :9005]    [Django :8005]    [ServiPáramo React]
     │                  │                │                    │
     │─ POST /login/ ──►│──────────────► │                    │
     │                  │                │ valida credentials │
     │◄─ { token } ─────│◄────────────── │                    │
     │                  │                │                    │
     │  localStorage.setItem('token', token)                  │
     │                  │                │                    │
     │  [usuario navega a /serviparamo/] │                    │
     │                  │                │                    │
     │                  │                │  ─ GET /serviparamo/ → SPA carga
     │                  │                │                    │
     │                  │                │◄ GET /api/verify-token/ ──────
     │                  │                │  200: token válido            │
     │                  │                │──────────────────────────────►│
     │                  │                │                    │ renderiza módulo
```

---

## 6. Vista de Componentes — ServiPáramo Frontend (C4 — Nivel 3)

```
main.jsx (Vite entry point)
  └── RouterProvider (React Router v7)
        └── AuthGuard
              │── GET /api/verify-token/ → válido: renderiza
              │                          → inválido: redirect Hub
              └── DashboardLayout
                    ├── Header (branding ServiPáramo, usuario, logout)
                    ├── Sidebar (8 rutas de navegación)
                    └── <Outlet>
                          │
                          ├── /serviparamo/          → Dashboard
                          │     └── StatCard ×N (KPIs del catálogo)
                          │
                          ├── /serviparamo/catalog   → CatalogManager
                          │     └── CatalogTable (paginada, filtros)
                          │
                          ├── /serviparamo/duplicate → DuplicateDetection
                          │     └── DuplicateComparison
                          │
                          ├── /serviparamo/normalization → Normalization
                          │     └── NormalizationTable
                          │
                          ├── /serviparamo/semantic-search → SemanticSearch
                          │     └── SemanticSearchInput
                          │
                          ├── /serviparamo/purchases → PurchasesAnalytics
                          │     └── PurchasesCharts (Recharts)
                          │
                          └── /serviparamo/settings  → Settings
                                └── SettingsPanel (ETL controls)
```

---

## 7. Vista de Capas — Hub Backend

```
┌────────────────────────────────────────┐
│           Cliente HTTP                 │  (React SPA, curl)
└───────────────────┬────────────────────┘
                    │ HTTP/JSON
┌───────────────────▼────────────────────┐
│          Nginx :9005 (Proxy)           │
└───────────────────┬────────────────────┘
                    │ HTTP interno
┌───────────────────▼────────────────────┐
│      Capa de Presentación              │  Django REST Framework
│      api/views.py                      │  login, logout, health,
│      serviparamo/views.py              │  services, verify-token,
│                                        │  + 13 endpoints ServiPáramo
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│      Capa de Serialización             │  serializers.py
│                                        │  Validación entrada/salida
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│      Capa de Negocio                   │  DRF Token Auth
│                                        │  ETL (etl.py)
│                                        │  Embeddings (embeddings.py)
│                                        │  Clustering (normalizer.py)
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│      Capa de Datos                     │  Django ORM + PostgreSQL
│                                        │  Tablas Hub + ServiPáramo (11)
└───────────────────┬────────────────────┘
                    │
┌───────────────────▼────────────────────┐
│      Sistema Externo                   │  SQL Server ERP
│                                        │  pyodbc + ODBC Driver 18
└────────────────────────────────────────┘
```

---

## 8. Convención de Puertos

| Puerto | Servicio | Entorno |
|---|---|---|
| 9005 | Nginx (entrada pública) | Todos |
| 8005 | Django/Gunicorn (Hub API) | Todos |
| 5432 | PostgreSQL | Todos |
| 80 | Nginx interno (serviparamo-frontend) | Docker |
| 5176 | Vite dev — ServiPáramo Frontend | Desarrollo local |
| 3000 | Vite dev — Hub Frontend | Desarrollo local |

---

## 9. Decisiones Arquitectónicas

### DA-01: Hub como Identity Provider centralizado

**Decisión:** El hub Django gestiona todos los tokens. Los módulos hijos validan tokens contra `/api/verify-token/`.

**Razón:** Evitar duplicar lógica de autenticación. Un solo punto de invalidación de sesiones.

**Trade-off:** El hub es punto de falla único para autenticación. Mitigado: SystemD con reinicio automático; PostgreSQL como BD robusta.

---

### DA-02: Nginx como API Gateway único

**Decisión:** Nginx en `:9005` enruta por prefijo de URL a los servicios backend y frontends.

**Razón:** Un solo puerto expuesto al exterior. Oculta la topología interna (Docker container names, puertos locales). Centraliza SSL termination.

**Trade-off:** Nginx es un componente adicional a mantener. Justificado por la simplicidad que aporta al conjunto.

---

### DA-03: Micro-Frontend por módulo (SPA independiente)

**Decisión:** Cada módulo de negocio es una aplicación React compilada y servida de forma independiente bajo su propio prefijo de ruta.

**Razón:** Equipos distintos pueden desarrollar, iterar y desplegar cada módulo sin afectar a los demás. Stack actualizado (React 19 + TypeScript + Vite 8 + Tailwind 4) sin romper el Hub legacy.

**Trade-off:** Múltiples aplicaciones en desarrollo local. Posible inconsistencia visual si no se siguen las guías de estilo.

---

### DA-04: Django Modular (no microservicios en Sprint 1)

**Decisión:** Los módulos de negocio viven como Django apps dentro del mismo proyecto Hub (`INSTALLED_APPS`), no como servicios separados.

**Razón:** La complejidad operativa de microservicios (autenticación inter-servicios, service discovery, despliegue independiente) no justifica el beneficio en las fases iniciales. El código está diseñado para extraerse fácilmente.

**Trade-off:** Un bug grave en un módulo podría afectar al Hub. Mitigado con tests unitarios y manejo de excepciones.

**Evolución:** En Sprints avanzados, cada módulo puede dockerizarse como servicio independiente sin cambiar su código de negocio.

---

### DA-05: PostgreSQL como base de datos única

**Decisión:** Un solo contenedor PostgreSQL alberga tanto las tablas del Hub como las de todos los módulos.

**Razón:** Simplicidad operativa en etapas tempranas. Backup y mantenimiento unificado.

**Trade-off:** No hay aislamiento de datos entre módulos. Aceptable dado que el equipo es pequeño y los módulos son del mismo proyecto.

**Evolución:** Si un módulo requiere aislamiento, se puede mover a un PostgreSQL dedicado usando el database router de Django.

---

### DA-06: ETL on-demand (no programado en Sprint 1)

**Decisión:** El ETL de SQL Server se dispara manualmente vía API (`POST /api/serviparamo/etl/run/`) o Makefile.

**Razón:** Evita complejidad de Celery/cron en Sprint 1. Permite control explícito durante el desarrollo.

**Trade-off:** Los datos no se actualizan automáticamente.

**Evolución:** Sprint 2 → ETL programado con cron de Django o Celery Beat.

---

## 10. Principios de Diseño

| Principio | Aplicación |
|---|---|
| **Separación de responsabilidades** | Hub = autenticación y catálogo; módulos = lógica de negocio específica |
| **Bajo acoplamiento** | Módulos hijos solo dependen del endpoint `/api/verify-token/` del Hub |
| **Alta cohesión** | Cada módulo agrupa su propio frontend, backend app, modelos y rutas |
| **Convention over configuration** | Prefijos de ruta por nombre de módulo (`/serviparamo/`, `/avantika/`) |
| **Fail fast** | AuthGuard redirige inmediatamente al Hub si el token no es válido |
| **Stateless API** | Cada request incluye el token; no se mantiene estado de sesión en servidor |
| **Diseño evolutivo** | Módulos diseñados como apps Django extractibles sin cambiar código de negocio |

---

## 11. Riesgos Arquitectónicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Hub como SPOF (auth) | Media | Alto | SystemD con restart automático; timeout de token configurable |
| ETL bloquea el proceso Gunicorn | Baja | Medio | ETL corre en thread separado (background); timeout configurable |
| Embeddings en PostgreSQL (JSONField) sin índice vectorial | Alta | Medio | Búsqueda semántica limitada a subconjuntos; Sprint 3: pgvector + HNSW |
| SQL Server ERP no disponible | Media | Alto | ETL con manejo de errores; datos cacheados en PostgreSQL no se pierden |
| ngrok con URL dinámica | Alta | Bajo | Dominio fijo contratado (`barranquia-hub.ngrok.io`) |

---

## 12. Hoja de Ruta Técnica

### Sprint 2 (23–31 mar 2026)
- ETL incremental con flag `--keep-aprobados`
- Tests unitarios de la API ServiPáramo
- ETL programado (cron o Celery Beat)
- Dashboard Power BI conectado a la API

### Sprint 3 (abr 2026)
- pgvector + índice HNSW para búsqueda semántica O(log N)
- Módulo Avantika (backend FastAPI / Django app)
- CI/CD básico con GitHub Actions

### Producción (post-demo)
- Módulos como contenedores Docker independientes
- HTTPS con certificado propio (sin ngrok)
- Monitoreo con Grafana + Prometheus

---

*BarranquIA Hub — Ruta IA × Cámara de Comercio de Barranquilla × Boost Business Consulting*
*Última actualización: 22 de marzo de 2026*
