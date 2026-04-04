# Arquitectura de Software — Módulo ServiPáramo
## Normalización Inteligente de Catálogo de SKUs

**Versión:** 1.0
**Fecha:** 2026-03-18
**Proyecto:** BarranquIA Hub
**Módulo:** ServiPáramo

---

## 1. Posición en el ecosistema BarranquIA Hub

ServiPáramo es un módulo embebido en el Hub. No es una aplicación separada en Sprint 1: comparte el proceso Django y el frontend React del Hub. En Sprint 2 podrá extraerse como app independiente.

```
┌─────────────────────────────────────────────────────────────────┐
│                      BarranquIA Hub                             │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │   Hub Core   │   │  ServiPáramo │   │   Avantika / Joz │   │
│  │  (auth, nav) │   │  (embebido)  │   │  (apps externas) │   │
│  └──────────────┘   └──────────────┘   └──────────────────┘   │
│           │                 │                                   │
│  ┌────────▼─────────────────▼──────────────────────────────┐  │
│  │              Django 4.2 (barranquia.wsgi)                │  │
│  │    api/         serviparamo/          staticfiles/        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                             │                                   │
│                     SQLite (db.sqlite3)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Gunicorn :8005
                              │
                         Nginx :9005
                              │
                        ngrok tunnel
                              │
               https://barranquia-hub.ngrok.io
```

---

## 2. Vista de componentes (C4 — Nivel 3)

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENTE (browser)                                              │
│                                                                 │
│  React SPA                                                      │
│  ├── App.jsx (BrowserRouter)                                    │
│  │    ├── /            → Hub (cards de servicios)              │
│  │    └── /serviparamo/*                                        │
│  │         └── ServiParamo.jsx                                  │
│  │              ├── /dashboard  → Dashboard.jsx                 │
│  │              ├── /buscar     → Buscador.jsx                  │
│  │              ├── /duplicados → Duplicados.jsx                │
│  │              └── /familias   → Familias.jsx                  │
│  │                                                              │
│  │  HTTP (axios) → /api/serviparamo/*                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / proxy Nginx
┌──────────────────────────▼──────────────────────────────────────┐
│  SERVIDOR                                                        │
│                                                                  │
│  Nginx :9005                                                     │
│  ├── /api/serviparamo/  → proxy → Gunicorn :8005                │
│  ├── /static/           → staticfiles/                          │
│  └── /                  → staticfiles/frontend/index.html (SPA) │
│                                                                  │
│  Gunicorn :8005 (3 workers)                                      │
│  └── Django barranquia.wsgi                                      │
│       └── URL: /api/serviparamo/ → serviparamo.urls             │
│            ├── GET  /familias/          → views.familias         │
│            ├── GET  /buscar/            → views.buscar           │
│            ├── GET  /duplicados/        → views.duplicados       │
│            ├── POST /aprobar/           → views.aprobar          │
│            ├── POST /fusionar-familias/ → views.fusionar_familias│
│            └── GET  /stats/            → views.stats             │
│                                                                  │
│  SQLite (db.sqlite3)                                             │
│  ├── serviparamo_catalogo_skus      (127,090 filas)             │
│  └── serviparamo_catalogo_embeddings (JSON vectors 384-dim)     │
│                                                                  │
│  SQL Server (externo)                                            │
│  └── ts1.serviparamo.com.co:1433 → PRUEBA → inv_ina01           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Vista del pipeline de datos (flujo ETL → API)

```
┌───────────────────────────────────────────────────────────┐
│                    PIPELINE DE DATOS                       │
│                                                            │
│  [SQL Server]                                              │
│      inv_ina01 (127,090 filas)                             │
│           │                                                │
│           │  pyodbc — SELECT + LTRIM/RTRIM/ISNULL          │
│           ▼                                                │
│  [etl.py]                                                  │
│      Limpieza → Normalización básica → Detección dups      │
│      bulk_create en lotes de 2,000                         │
│           │                                                │
│           ▼                                                │
│  [SQLite] serviparamo_catalogo_skus                        │
│           │                                                │
│           │  Sentence Transformers all-MiniLM-L6-v2        │
│           ▼                                                │
│  [embeddings.py]                                           │
│      texto = familia + categoria + nombre + nombre1        │
│      vector = encode(texto, normalize=True) → (384,)       │
│      bulk_create en lotes de 500                           │
│           │                                                │
│           ▼                                                │
│  [SQLite] serviparamo_catalogo_embeddings                  │
│           │                                                │
│           │  numpy array (N, 384)                          │
│           ▼                                                │
│  [normalizer.py]                                           │
│      MiniBatchKMeans(k=auto)                               │
│      → familia_normalizada por votación                    │
│      cosine_similarity en bloques de 1,000                 │
│      → es_duplicado si sim ≥ 0.92                          │
│      bulk_update                                           │
│           │                                                │
│           ▼                                                │
│  [SQLite] serviparamo_catalogo_skus (actualizado)          │
│           │                                                │
│           │  Django REST API                               │
│           ▼                                                │
│  [API] /api/serviparamo/*                                  │
│      ← React frontend ← Analista / Power BI                │
└───────────────────────────────────────────────────────────┘
```

---

## 4. Decisiones de arquitectura

### DA-01: Django app embebida en el Hub (no microservicio)

**Decisión:** ServiPáramo vive como Django app dentro del proyecto Hub (`INSTALLED_APPS`), no como servicio independiente.

**Razón:** La complejidad operativa de un microservicio separado (docker, puertos, autenticación inter-servicios) no justifica el beneficio. El código está diseñado para extraerse fácilmente.

**Trade-off:** Un bug en ServiPáramo podría afectar al Hub. Mitigación: tests unitarios en Sprint 2.

---

### DA-02: SQLite en desarrollo, PostgreSQL en producción

**Decisión:** SQLite para desarrollo y demo (Sprint 1). Router de base de datos preparado para migrar a PostgreSQL sin cambiar el código de negocio.

**Razón:** No hay credenciales PG disponibles al inicio del sprint. SQLite es suficiente para 127K registros en un contexto de demo.

**Trade-off:** La búsqueda semántica iterando 127K registros JSON en SQLite es lenta (5-30s). En producción con PG + pgvector sería < 100ms.

**Migración:** Descomentar en `settings.py` el bloque de PG y correr `migrate --database=serviparamo`.

---

### DA-03: Embeddings como JSON en base de datos relacional

**Decisión:** Los vectores se almacenan en `JSONField` (lista de 384 floats) en SQLite/PostgreSQL.

**Razón:** Evita dependencias externas (Chroma, Pinecone, pgvector) que complican el despliegue en Sprint 1. Para 127K × 384 floats ≈ 195MB, manejable.

**Trade-off:** Sin índice vectorial → búsqueda semántica O(N) en Python puro. Lento para producción.

**Evolución:** En Sprint 3, migrar a PG + pgvector con índice HNSW → búsqueda en O(log N).

---

### DA-04: Frontend embebido con rutas propias

**Decisión:** Las vistas de ServiPáramo viven en el mismo bundle React del Hub bajo `/serviparamo/*` (React Router).

**Razón:** El frontend independiente es tarea de Juan en Sprint 2. Para la demo se necesita algo funcional hoy.

**Trade-off:** El bundle del Hub crece (~30KB extra). Aceptable para un prototipo.

**Evolución:** En Sprint 2, Juan construye `serviparamo/frontend/` como Vite app independiente servida en puerto propio con proxy Nginx.

---

### DA-05: Modelo de embeddings all-MiniLM-L6-v2

**Decisión:** Usar `all-MiniLM-L6-v2` de Sentence Transformers (384 dimensiones, ~90MB).

**Razón:** Balance óptimo entre tamaño, velocidad y calidad semántica para texto corto en español/inglés. Funciona bien con descripciones de productos industriales. No requiere GPU.

**Trade-off:** No es multilingüe puro. Si ServiPáramo tiene productos con términos técnicos muy específicos, podría fallar. Alternativa: `paraphrase-multilingual-MiniLM-L12-v2`.

---

## 5. Vista de despliegue

```
Servidor físico (Linux Ubuntu 24.04)
│
├── /home/desarrollo/barranquIA-hub/
│   ├── hub/
│   │   ├── venv/                    ← Python 3.12 virtualenv
│   │   ├── backend/
│   │   │   ├── barranquia/          ← Django project
│   │   │   ├── serviparamo/         ← Django app
│   │   │   ├── db.sqlite3           ← Base de datos
│   │   │   └── staticfiles/
│   │   │       └── frontend/        ← React build (dist)
│   │   └── frontend/                ← Código fuente React
│   ├── nginx.conf                   ← Configuración nginx
│   └── barranquia-hub.service       ← systemd service (Gunicorn)
│
├── Gunicorn :8005  ← barranquia.wsgi (3 workers)
├── Nginx :9005     ← proxy + static files
└── ngrok           ← tunnel → barranquia-hub.ngrok.io
```

---

## 6. Puertos y rutas

| Servicio | Puerto | Descripción |
|---|---|---|
| Nginx | 9005 | Punto de entrada público (ngrok apunta aquí) |
| Gunicorn (Hub) | 8005 | Django backend (solo localhost) |
| Vite dev (Hub) | 3000 | Solo en desarrollo local |
| Vite dev (Avantika) | 3001 | Solo en desarrollo local |

| Prefijo URL | Destino |
|---|---|
| `/api/` | Gunicorn :8005 → Django |
| `/api/serviparamo/` | Django → `serviparamo.urls` |
| `/static/` | `staticfiles/` en disco |
| `/serviparamo/*` | `index.html` (React SPA catch-all) |
| `/*` | `index.html` (React SPA catch-all) |

---

## 7. Evolución esperada

### Sprint 2 (23–31 mar)
- Frontend independiente `serviparamo/frontend/` (Juan) en puerto 5176
- Nginx proxy `/serviparamo/` → `:5176`
- ETL incremental con `--keep-aprobados`
- Tests unitarios de la API

### Sprint 3 (1–8 abr)
- Migración a PostgreSQL + pgvector
- Índice HNSW para búsqueda semántica O(log N)
- ETL programado con cron
- Dashboard Power BI conectado a la API (Andrés)

### Producción (post-demo)
- ServiPáramo como microservicio Docker independiente
- CI/CD con GitHub Actions
- Autenticación delegada al Hub (JWT o Token compartido)

---

## 8. Riesgos arquitectónicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| SQLite con 127K registros JSON lento para búsqueda semántica | Alta | Medio | Buscar en máx 10K registros únicos; migrar a PG+pgvector en Sprint 3 |
| Gunicorn sin reload automático al cambiar código | Media | Bajo | `kill -HUP` manual o systemd restart en producción |
| Embeddings generados con modelo desactualizado | Baja | Bajo | Guardar nombre del modelo junto al embedding en BD |
| Pérdida de aprobaciones al re-ejecutar ETL | Alta | Alto | Backup de `aprobado=True` antes del ETL; flag `--keep-aprobados` en Sprint 2 |

---

*Módulo ServiPáramo — BarranquIA Hub*
*Ruta IA — Cámara de Comercio de Barranquilla × Boost Business Consulting*
*Última actualización: 18 de marzo de 2026*
