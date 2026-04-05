# BarranquIA Hub

Plataforma centralizada de servicios de inteligencia artificial para empresas en Barranquilla, Colombia, desarrollada bajo el programa **Ruta IA** de la Cámara de Comercio de Barranquilla en alianza con Boost Business Consulting.

**URL pública:** `https://barranquia-hub.ngrok.io`
**Red local:** `http://192.168.0.101:9005`

---

## Módulos del sistema

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| **Hub** | Portal de entrada, autenticación centralizada | ✅ Operativo |
| **ServiPáramo** | Normalización semántica de catálogo SKU + ERP SQL Server | ✅ Operativo |
| **Avantika** | Gestión de inventario y pronóstico de demanda ML | ✅ Operativo |
| **Joz** | Detección de anomalías, alertas y análisis de riesgos | ✅ Operativo |

---

## Arquitectura

```
Internet / LAN
      │
      ▼
  ngrok (HTTPS)
      │
      ▼
Nginx :9005  (gateway bare-metal)
  ├── /                    → Hub React SPA     (hub-backend :8006)
  ├── /api/                → Hub API Django     (hub-backend :8006)
  ├── /api/serviparamo/    → ServiPáramo API   (serviparamo-backend :8001)
  ├── /api/avantika/       → Avantika API      (avantika-backend :8012)
  ├── /api/joz/            → Joz API           (joz-backend :8003)
  ├── /serviparamo/        → ServiPáramo SPA   (serviparamo-frontend :9021)
  ├── /avantika/           → Avantika SPA      (avantika-frontend :9022)
  └── /joz/                → Joz SPA           (joz-frontend :9023)

Docker Compose (ruta-ia-net)
  ├── barranquia_postgres           :5432  (PostgreSQL 16 — 4 BDs)
  ├── barranquia_hub_backend        :8006  (Django + Gunicorn)
  ├── barranquia_serviparamo_backend :8001  (Django + Gunicorn)
  ├── barranquia_serviparamo_frontend :9021 (Nginx + React)
  ├── barranquia_avantika_backend   :8012  (Django + Gunicorn)
  ├── barranquia_avantika_frontend  :9022  (Nginx + React)
  ├── barranquia_joz_backend        :8003  (Django + Gunicorn)
  └── barranquia_joz_frontend       :9023  (Nginx + React)
```

---

## Estructura del repositorio

```
barranquIA-clean/
├── hub/                    # Hub central de autenticación
│   ├── backend/            # Django 4.2 + DRF (puerto 8006)
│   ├── frontend/           # React 18 + Vite (SPA principal)
│   ├── infra/
│   │   ├── docker/         # Dockerfile.backend + entrypoint.sh
│   │   └── server/nginx/   # barranquia-hub.conf (gateway)
│   └── docs/               # Documentación técnica y funcional
│
├── serviparamo/            # Módulo catálogo SKU + ERP
│   ├── backend/            # Django 4.2 (puerto 8001) — 12 modelos, 13 endpoints, ETL
│   ├── frontend/           # React 19 + Tailwind (puerto 9021) — 7 páginas
│   └── infra/              # Dockerfile.backend + Dockerfile.frontend
│
├── avantika/               # Módulo inventario + forecasting
│   ├── backend/            # Django 4.2 (puerto 8012) — 3 modelos, 6 endpoints
│   ├── frontend/           # React 19 + Radix UI (puerto 9022)
│   └── infra/              # Dockerfiles
│
├── joz/                    # Módulo alertas + análisis de riesgos
│   ├── backend/            # Django 4.2 (puerto 8003) — 3 modelos, 6 endpoints
│   ├── frontend/           # React 19 + Recharts (puerto 9023)
│   └── infra/              # Dockerfiles
│
├── shared/                 # Infraestructura compartida
│   ├── docker-compose.yml  # Orquestación de 8 contenedores
│   ├── postgres/init.sql   # Inicialización: 4 roles + 4 BDs
│   └── scripts/            # deploy-nginx.sh, deploy-ngrok.sh
│
├── Makefile                # 30+ comandos de gestión
├── .env                    # Variables de entorno (git-ignored)
└── .env.example            # Plantilla de configuración
```

---

## Inicio rápido

```bash
# Primera vez: construir y levantar todo el stack
make setup

# Levantar servicios
make up

# Ver estado de contenedores
make ps

# Ver logs en tiempo real
make logs

# Detener servicios
make down
```

### Comandos por microservicio

```bash
# Levantar un módulo específico
make up-serviparamo
make up-avantika
make up-joz
make up-hub

# Logs por módulo
make logs-serviparamo
make logs-avantika
make logs-joz
make logs-hub

# Shell Django por módulo
make shell-serviparamo
make shell-avantika
make shell-joz
make shell-hub

# Migraciones por módulo
make migrate-serviparamo
make migrate-avantika
make migrate-joz
make migrate-hub
```

### ETL ServiPáramo

```bash
# Disparar ETL desde ERP SQL Server → PostgreSQL
make etl
```

---

## API Endpoints — Hub

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/health/` | No | Estado del servicio |
| POST | `/api/login/` | No | Obtener token de sesión |
| POST | `/api/logout/` | Token | Invalidar token |
| GET | `/api/services/` | Token | Catálogo de módulos disponibles |

```bash
# Login de ejemplo
curl -X POST https://barranquia-hub.ngrok.io/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin2026"}'

# Respuesta
{ "token": "abc123...", "username": "admin" }
```

---

## Convención de puertos

| Puerto (host) | Servicio | Descripción |
|---------------|----------|-------------|
| `9005` | Nginx | API Gateway (entrada pública) |
| `8006` | hub-backend | Django Hub (container :8005) |
| `8001` | serviparamo-backend | Django ServiPáramo |
| `8012` | avantika-backend | Django Avantika (container :8002) |
| `8003` | joz-backend | Django Joz |
| `9021` | serviparamo-frontend | Nginx + React SPA |
| `9022` | avantika-frontend | Nginx + React SPA |
| `9023` | joz-frontend | Nginx + React SPA |
| `5432` | postgres | PostgreSQL 16 (interno) |

---

## Bases de datos

| Base de datos | Usuario | Microservicio |
|---------------|---------|---------------|
| `barranquia_hub` | `barranquia` | Hub central |
| `serviparamo` | `serviparamo` | ServiPáramo |
| `avantika` | `avantika` | Avantika |
| `joz` | `joz` | Joz |

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Backend | Django + DRF + Gunicorn | 4.2 / 3.14 / 21.2 |
| Frontend Hub | React + Vite | 18 / 5 |
| Frontend módulos | React + Vite + Tailwind | 19 / 8 / 4 |
| Base de datos | PostgreSQL | 16 |
| ML / NLP | sentence-transformers | 2.7 |
| Contenedores | Docker Compose | — |
| Gateway | Nginx (bare-metal) | — |
| Túnel HTTPS | ngrok | — |
| Lenguaje backend | Python | 3.11 |
| ERP externo | SQL Server (pyodbc) | — |

---

## Despliegue en servidor

```bash
# Aplicar configuración Nginx
make deploy-nginx

# Configurar túnel ngrok
make deploy-ngrok

# Ambos a la vez
make deploy
```

### Nginx (configuración aplicada en el servidor)

```bash
sudo cp hub/infra/server/nginx/barranquia-hub.conf /etc/nginx/sites-enabled/barranquia-hub
sudo nginx -t && sudo systemctl reload nginx
```

---

## Equipo

- **Ruta IA** — Cámara de Comercio de Barranquilla
- **NEUSI** — Desarrollo e implementación

---

*Bogotá, Colombia · 2026*
