# Arquitectura de Software — BarranquIA Hub

**Versión:** 3.0
**Fecha:** 2026-04-05
**Estado:** Arquitectura multi-microservicio operativa

---

## 1. Estilo Arquitectónico

BarranquIA Hub adopta un estilo de **microservicios + micro-frontends**, donde cada módulo de negocio es completamente autónomo: tiene su propio backend Django, frontend React, base de datos PostgreSQL y contenedor Docker.

Un Nginx en el servidor físico actúa como API Gateway y enruta las peticiones según el prefijo de URL. El Hub centraliza únicamente la autenticación.

**Principios guía:**
- **Autonomía:** cada microservicio puede desplegarse, escalar y fallar de forma independiente
- **Bajo acoplamiento:** los módulos solo dependen del Hub para autenticación; no se llaman entre sí
- **Alta cohesión:** cada módulo agrupa su frontend, backend, modelos y documentación en un directorio propio
- **Stateless API:** cada request incluye el token; no se mantiene estado de sesión en el servidor

---

## 2. Vista de Contexto (C4 — Nivel 1)

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        ENTORNO EXTERNO                                   ║
║                                                                          ║
║   Analistas · Operadores · Gerentes de empresa cliente                   ║
║             │                                                            ║
║             │  HTTPS  (barranquia-hub.ngrok.io)                         ║
║             │  HTTP   (192.168.0.101:9005 — red LAN)                    ║
║             ▼                                                            ║
║  ┌──────────────────────────────────────────────────────────────────┐   ║
║  │                        BarranquIA Hub                             │   ║
║  │                                                                   │   ║
║  │  Plataforma centralizada de servicios de inteligencia artificial  │   ║
║  │  para empresas en Barranquilla, Colombia                          │   ║
║  │                                                                   │   ║
║  │  • Autenticación unificada (Token DRF)                            │   ║
║  │  • Portal de acceso a módulos de negocio                          │   ║
║  │  • Enrutamiento hacia aplicaciones especializadas                 │   ║
║  └──────────────────────────────────────────────────────────────────┘   ║
║         │            │              │              │                      ║
║      ServiPáramo          Avantika              Joz                     ║
║    (Catálogo SKU)       (Inventario)         (Alertas)                  ║
║                                                                          ║
║                                           ERP SQL Server externo        ║
║                                           ts1.serviparamo.com.co:1433   ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 3. Vista de Contenedores (C4 — Nivel 2)

```
Servidor físico: 192.168.0.101 (Ubuntu Linux)
│
├── [ngrok] barranquia-hub.ngrok.io → localhost:9005
│
└── [Nginx :9005]  ← API Gateway (bare-metal, no Docker)
      │
      │ Enrutamiento por prefijo de URL
      │
      ├─────────────────────────────────────────────────────────────────────┐
      │  /api/serviparamo/*  →  127.0.0.1:8001                            │
      │  /api/avantika/*     →  127.0.0.1:8012                            │
      │  /api/joz/*          →  127.0.0.1:8003                            │
      │  /api/*              →  127.0.0.1:8006   (Hub API)                │
      │  /serviparamo/*      →  127.0.0.1:9021   (ServiPáramo SPA)       │
      │  /avantika/*         →  127.0.0.1:9022   (Avantika SPA)          │
      │  /joz/*              →  127.0.0.1:9023   (Joz SPA)               │
      │  /admin/*            →  127.0.0.1:8006   (Django Admin)          │
      │  /*                  →  127.0.0.1:8006   (Hub React SPA)          │
      └─────────────────────────────────────────────────────────────────────┘
             │
             ▼  Docker Compose (red: ruta-ia-net)
      ┌──────────────────────────────────────────────────────────────────────┐
      │                                                                      │
      │  ┌─────────────────┐     ┌─────────────────┐                        │
      │  │  hub-backend    │     │serviparamo-     │                        │
      │  │  :8006→:8005    │     │backend :8001    │                        │
      │  │                 │     │                 │                        │
      │  │ Django 4.2      │     │ Django 4.2      │                        │
      │  │ Gunicorn 3w     │     │ Gunicorn 3w     │                        │
      │  │                 │     │                 │                        │
      │  │ App: api/       │     │ App: serviparamo│                        │
      │  │ Auth DRF Token  │     │ 12 modelos      │                        │
      │  │ 4 endpoints     │     │ 13 endpoints    │                        │
      │  │ Hub React SPA   │     │ ETL + Embeddings│                        │
      │  │ (WhiteNoise)    │     │ (sentence-trf.) │                        │
      │  └────────┬────────┘     └────────┬────────┘                        │
      │           │                       │                                  │
      │  ┌─────────────────┐     ┌─────────────────┐                        │
      │  │serviparamo-     │     │ avantika-       │                        │
      │  │frontend :9021   │     │ backend :8012   │                        │
      │  │                 │     │                 │                        │
      │  │ Nginx Alpine    │     │ Django 4.2      │                        │
      │  │ React 19 + TS   │     │ Gunicorn 3w     │                        │
      │  │ Tailwind 4      │     │                 │                        │
      │  │ Zustand + Recharts    │ App: avantika   │                        │
      │  │ 7 páginas       │     │ 3 modelos       │                        │
      │  └─────────────────┘     │ 6 endpoints     │                        │
      │                          │ SKU + Forecast  │                        │
      │  ┌─────────────────┐     └────────┬────────┘                        │
      │  │ avantika-       │              │                                  │
      │  │ frontend :9022  │     ┌─────────────────┐                        │
      │  │                 │     │  joz-backend    │                        │
      │  │ Nginx Alpine    │     │  :8003          │                        │
      │  │ React 19        │     │                 │                        │
      │  │ Radix UI        │     │ Django 4.2      │                        │
      │  │ 3 páginas       │     │ Gunicorn 3w     │                        │
      │  └─────────────────┘     │                 │                        │
      │                          │ App: joz        │                        │
      │  ┌─────────────────┐     │ 3 modelos       │                        │
      │  │  joz-frontend   │     │ 6 endpoints     │                        │
      │  │  :9023          │     │ Alertas + Riesgos│                       │
      │  │                 │     └────────┬────────┘                        │
      │  │ Nginx Alpine    │              │                                  │
      │  │ React 19        │             ─┘                                  │
      │  │ Recharts        │    ┌──────────────────────────────────┐        │
      │  │ 4 páginas       │    │  postgres  :5432 (solo interno)  │        │
      │  └─────────────────┘    │  PostgreSQL 16 Alpine            │        │
      │                          │                                  │        │
      │                          │  BD: barranquia_hub (Hub)        │        │
      │                          │  BD: serviparamo  (ServiPáramo) │        │
      │                          │  BD: avantika     (Avantika)    │        │
      │                          │  BD: joz          (Joz)         │        │
      │                          └──────────────────────────────────┘        │
      │                                                                      │
      │  Volúmenes Docker:                                                   │
      │  • postgres_data        → persistencia de las 4 BDs                 │
      │  • huggingface_cache    → modelo NLP all-MiniLM-L6-v2 (~90MB)      │
      └──────────────────────────────────────────────────────────────────────┘

Sistema externo:
┌──────────────────────────────────────┐
│  ERP SQL Server ServiPáramo          │
│  ts1.serviparamo.com.co:1433         │
│  BD: PRUEBA                          │
│  Tablas: inv_ina01 (~127K filas)     │
│  Conexión: pyodbc + ODBC Driver 18   │
└──────────────────────────────────────┘
         ↑
         │ ETL on-demand (hilo background)
   serviparamo-backend (etl.py)
```

---

## 4. Vista de Componentes — Hub Backend (C4 — Nivel 3)

```
hub-backend [:8005 container]
│
├── barranquia/wsgi.py              ← Punto de entrada WSGI
│
├── barranquia/urls.py              ← Enrutador raíz
│     ├── /admin/        → Django Admin
│     ├── /api/          → api.urls
│     └── /(catch-all)   → TemplateView (index.html Hub React SPA)
│
├── api/urls.py
│     ├── POST /api/login/          → LoginView
│     ├── POST /api/logout/         → LogoutView
│     ├── GET  /api/health/         → HealthView
│     └── GET  /api/services/       → ServicesView
│
├── api/views.py
│     ├── LoginView      ← authenticate() + Token.get_or_create()
│     ├── LogoutView     ← token.delete()
│     ├── HealthView     ← { status: "ok" }
│     └── ServicesView   ← SERVICES_DATA (lista de módulos hardcoded)
│
├── barranquia/settings.py
│     ├── DATABASES → barranquia_hub (PostgreSQL)
│     ├── WHITENOISE_ROOT = frontend-dist/  (sirve /assets/...)
│     ├── TEMPLATES.DIRS = [frontend-dist/] (sirve index.html)
│     └── REST_FRAMEWORK: TokenAuthentication
│
└── staticfiles/    ← Django collectstatic (admin + DRF styles)
    frontend-dist/  ← React SPA compilado (preservado fuera de STATIC_ROOT)
        ├── index.html
        └── assets/index-*.js, index-*.css
```

---

## 5. Vista de Componentes — ServiPáramo Backend (C4 — Nivel 3)

```
serviparamo-backend [:8001]
│
├── core/urls.py
│     └── /api/serviparamo/ → serviparamo.urls
│
├── serviparamo/urls.py  (13 endpoints)
│     ├── GET  /stats/
│     ├── GET  /skus/           ← paginado, filtrable
│     ├── GET  /skus/<codigo>/
│     ├── GET  /familias/
│     ├── GET  /categorias/
│     ├── GET  /ordenes/
│     ├── GET  /pedidos/
│     ├── GET  /duplicados/
│     ├── POST /aprobar/
│     ├── POST /fusionar-familias/
│     ├── GET  /etl/status/
│     ├── POST /etl/run/        ← lanza Thread background
│     └── GET  /buscar/         ← búsqueda semántica
│
├── serviparamo/etl.py           ← ETL SQL Server → PostgreSQL
│     └── pyodbc → extract → clean → insert Raw* → generate_embeddings
│
├── serviparamo/embeddings.py    ← sentence-transformers
│     └── SentenceTransformer('all-MiniLM-L6-v2') → vector 384 dims
│
├── serviparamo/normalizer.py    ← sklearn
│     └── cosine_similarity() → detectar duplicados (umbral 0.85)
│
└── serviparamo/models.py        ← 12 modelos Django
      CatalogoSKU, CatalogoEmbedding
      RawCategoria, RawFamilia
      RawOrdenEncabezado/Detalle
      RawPedidoEncabezado/Detalle
      RawPresupuestoDetalle/Resumen
      RawKardex, ETLLog
```

---

## 6. Vista de Capas — Todos los Microservicios

```
┌───────────────────────────────────────────┐
│              Cliente HTTP                 │  Browser (React SPA)
└──────────────────────┬────────────────────┘
                       │ HTTPS
┌──────────────────────▼────────────────────┐
│          ngrok (tunnel HTTPS)             │
└──────────────────────┬────────────────────┘
                       │ HTTP
┌──────────────────────▼────────────────────┐
│         Nginx :9005 (API Gateway)         │  Enrutamiento por prefijo URL
│         bare-metal en servidor físico     │  SSL termination
└──────────────────────┬────────────────────┘
                       │ HTTP interno (127.0.0.1)
         ┌─────────────┼──────────────┬──────────────┐
         ▼             ▼              ▼              ▼
   [hub :8006]  [serviparamo:8001] [avantika:8012] [joz:8003]
   [hub-front]  [sp-front:9021]   [av-front:9022] [joz-front:9023]
         │             │              │              │
┌────────▼─────────────▼──────────────▼──────────────▼────────┐
│              Capa de Presentación (DRF Views)                 │
│   api/views.py  serviparamo/views.py  avantika/views.py  ...  │
└─────────────────────────────┬────────────────────────────────┘
                               │
┌─────────────────────────────▼────────────────────────────────┐
│              Capa de Serialización (DRF Serializers)          │
│             Validación y transformación de datos              │
└─────────────────────────────┬────────────────────────────────┘
                               │
┌─────────────────────────────▼────────────────────────────────┐
│                   Capa de Negocio                             │
│  DRF Token Auth · ETL (etl.py) · Embeddings · Clustering     │
│  Clasificación ABC · Pronóstico demanda · Detección anomalías │
└─────────────────────────────┬────────────────────────────────┘
                               │
┌─────────────────────────────▼────────────────────────────────┐
│                   Capa de Datos (Django ORM)                  │
│                                                               │
│  barranquia_hub │ serviparamo │ avantika │ joz               │
│  auth_user      │ CatalogoSKU │ SKU      │ Transaccion       │
│  Token          │ Embedding   │ Pronost. │ Alerta            │
│                 │ Raw* (10)   │ Suger.   │ Riesgo            │
│                 │ ETLLog      │          │                    │
└─────────────────────────────┬────────────────────────────────┘
                               │
┌─────────────────────────────▼────────────────────────────────┐
│              PostgreSQL 16 (contenedor Docker)                │
│              Volumen persistente: postgres_data               │
└──────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────▼────────────────────────────────┐
│              SQL Server ERP (sistema externo)                 │
│              ts1.serviparamo.com.co:1433                      │
│              Acceso via pyodbc — solo desde serviparamo-backend│
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Flujo de Red y Autenticación

```
Usuario
  │
  │  1. GET https://barranquia-hub.ngrok.io
  ▼
ngrok → localhost:9005
  ▼
Nginx :9005
  │
  ├── location /  → proxy hub-backend :8006
  │     └── Django sirve index.html (Hub React SPA via WhiteNoise)
  │           │
  │           └── React carga → verifica token en localStorage
  │                 ├── No hay token → muestra formulario de login
  │                 └── Hay token  → GET /api/health/ (verifica validez)
  │
  ├── POST /api/login/ → hub-backend :8006
  │     │── Django authenticate(username, password)
  │     │── Token.objects.get_or_create(user=user)
  │     └── { token, username } → cliente guarda en localStorage
  │
  └── Usuario navega a /serviparamo/ → proxy serviparamo-frontend :9021
        └── React SPA carga → AuthGuard verifica token
              │── GET /api/health/ Authorization: Token <token>
              │◄── 200 → renderiza módulo ServiPáramo completo
              └── 401 → redirect a https://barranquia-hub.ngrok.io
```

---

## 8. Topología de Despliegue

```
┌─────────────────────────────────────────────────────────────────────┐
│  Servidor físico: 192.168.0.101 (Ubuntu Linux)                       │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ngrok daemon                                                │    │
│  │  barranquia-hub.ngrok.io → localhost:9005                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Nginx :9005  (config: barranquia-hub.conf)                  │    │
│  │  sites-enabled/barranquia-hub                                │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                        │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  Docker Engine                                               │    │
│  │  Compose file: shared/docker-compose.yml                     │    │
│  │  Red: ruta-ia-net (bridge, solo internal)                    │    │
│  │                                                               │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │    │
│  │  │ hub-backend  │ │serviparamo-  │ │ avantika-    │        │    │
│  │  │ :8006→:8005  │ │backend :8001 │ │ backend:8012 │        │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘        │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │    │
│  │  │serviparamo-  │ │ avantika-    │ │ joz-backend  │        │    │
│  │  │frontend:9021 │ │ frontend:9022│ │ :8003        │        │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘        │    │
│  │  ┌──────────────┐ ┌─────────────────────────────────┐      │    │
│  │  │ joz-frontend │ │ postgres :5432  (solo interno)   │      │    │
│  │  │ :9023        │ │ Vol: postgres_data               │      │    │
│  │  └──────────────┘ └─────────────────────────────────┘      │    │
│  │  Vol: huggingface_cache                                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              │
              Internet  ──────┘  (vía ngrok)
              LAN       ──────┘  (vía 192.168.0.101:9005)
```

---

## 9. Decisiones Arquitectónicas

### DA-01: Microservicios completamente independientes

**Decisión:** Cada módulo (ServiPáramo, Avantika, Joz) es un proyecto Django independiente con su propio proceso, base de datos y contenedor Docker. No comparten código de negocio.

**Razón:** Equipos independientes pueden desarrollar, probar y desplegar cada módulo sin afectar a los demás. Fallos de un módulo no propagan al hub.

**Trade-off:** Más contenedores a gestionar; duplicación de boilerplate Django entre módulos.

---

### DA-02: Hub como Identity Provider centralizado

**Decisión:** Solo el Hub gestiona la autenticación (DRF Token). Los módulos validan el token consultando al Hub en cada carga.

**Razón:** Un solo punto de gestión de credenciales. Logout centralizado invalida acceso a todos los módulos simultáneamente.

**Trade-off:** El hub es punto de falla para autenticación. Mitigado: Docker `restart: unless-stopped`.

---

### DA-03: Nginx bare-metal como API Gateway (no en Docker)

**Decisión:** Nginx corre directamente en el servidor físico, no como contenedor Docker.

**Razón:** Simplifica la configuración de red. Evita el doble NAT Docker → host → contenedor Nginx. Permite gestionar el gateway con systemd.

**Trade-off:** El gateway no se puede levantar con `docker compose up`. Requiere gestión separada del servidor.

---

### DA-04: Base de datos separada por microservicio

**Decisión:** PostgreSQL contiene 4 bases de datos independientes (una por microservicio), cada una con su propio usuario y contraseña.

**Razón:** Aislamiento de datos entre clientes. Un problema de migraciones en ServiPáramo no afecta a Avantika ni Joz.

**Trade-off:** Complejidad añadida en backups (4 BDs). Mitigado: backup unificado del volumen postgres_data.

---

### DA-05: Micro-frontends servidos por Nginx Alpine

**Decisión:** Cada frontend React se compila en un contenedor multi-stage (Node build → Nginx serve). El Hub sirve su SPA directamente desde Django/WhiteNoise.

**Razón:** Contenedores de frontend son ligeros (~25MB). El Hub mantiene su SPA embebida para evitar una dependencia adicional en el componente crítico de autenticación.

**Trade-off:** El Hub SPA no puede actualizarse sin reconstruir el contenedor del backend.

---

### DA-06: ETL on-demand en hilo background

**Decisión:** El ETL de SQL Server se dispara manualmente via API y corre en un `threading.Thread` separado.

**Razón:** Evita la complejidad de Celery/Redis en la fase actual. El proceso ETL puede durar varios minutos y no debe bloquear los workers de Gunicorn.

**Trade-off:** No hay programación automática. Datos no se actualizan solos.

**Evolución:** Celery Beat o cron django programado para Sprint 3.

---

### DA-07: frontend-dist separado de STATIC_ROOT

**Decisión:** El `index.html` del Hub React y sus assets se almacenan en `/app/frontend-dist/` (fuera de `STATIC_ROOT`). WhiteNoise los sirve via `WHITENOISE_ROOT`.

**Razón:** `collectstatic --clear` borra todo el `STATIC_ROOT`. Separar el build del frontend previene que sea eliminado en cada arranque del contenedor.

**Trade-off:** El frontend no pasa por el pipeline de hashing de WhiteNoise (sin cache-busting automático para `index.html`).

---

## 10. Riesgos Arquitectónicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Hub como SPOF (autenticación) | Media | Alto | Docker `restart: unless-stopped`; PostgreSQL como BD robusta |
| ETL bloquea proceso si no usa threading | Baja | Alto | ETL corre en `threading.Thread`; timeout configurable |
| Embeddings en `JSONField` sin índice vectorial | Alta | Medio | Búsqueda limitada a subconjuntos; Sprint 3: pgvector + HNSW |
| ERP SQL Server no disponible | Media | Alto | Datos cacheados en PostgreSQL; ETL con manejo de errores robusto |
| ngrok con URL fija pero dependencia externa | Baja | Alto | Dominio fijo contratado; fallback a IP LAN 192.168.0.101:9005 |
| Contraseñas en variables de entorno | Baja | Alto | `.env` en `.gitignore`; nunca commitear `.env` |
| CORS_ALLOW_ALL_ORIGINS = True | Alta | Medio | Ajustar a dominios específicos antes de producción real |

---

## 11. Principios de Diseño

| Principio | Aplicación |
|-----------|-----------|
| **Separación de responsabilidades** | Hub = auth + catálogo; módulos = lógica de negocio específica |
| **Bajo acoplamiento** | Módulos solo dependen del endpoint `/api/health/` del Hub |
| **Alta cohesión** | Cada módulo agrupa su frontend, backend, modelos y rutas |
| **Fail fast** | AuthGuard redirige al login inmediatamente si el token no es válido |
| **Stateless API** | Cada request incluye token; no hay sesiones en el servidor |
| **Convention over configuration** | Prefijos de ruta = nombre del módulo (`/serviparamo/`, `/avantika/`) |
| **Diseño evolutivo** | Módulos son proyectos Django completos, listos para moverse a su propio cluster |
| **Isolation** | Cada BD es independiente; fallos de migración de un módulo no afectan a otros |

---

## 12. Hoja de Ruta Técnica

### Sprint 2 (en curso — abril 2026)
- Completar frontends de Avantika y Joz (conectar con backends reales)
- ETL incremental ServiPáramo con preservación de SKUs aprobados
- Roles y permisos de usuario por módulo
- ETL programado (cron Django o Celery Beat)

### Sprint 3 (mayo 2026)
- pgvector + índice HNSW para búsqueda semántica O(log N) en ServiPáramo
- CI/CD básico con GitHub Actions (build + test + deploy)
- HTTPS con certificado propio (sin ngrok) para producción

### Producción (post-demo)
- CORS configurado a dominios específicos
- Monitoreo con Grafana + Prometheus
- Backups automáticos PostgreSQL
- Secretos en HashiCorp Vault o AWS Secrets Manager

---

*BarranquIA Hub — Ruta IA × Cámara de Comercio de Barranquilla × Boost Business Consulting*
*Última actualización: 5 de abril de 2026*
