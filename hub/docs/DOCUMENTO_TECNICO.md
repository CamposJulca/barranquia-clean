# Documento Técnico — BarranquIA Hub

**Versión:** 2.0
**Fecha:** 2026-03-22
**Estado:** Sprint 1 completado — en desarrollo activo

---

## 1. Descripción General

BarranquIA Hub es una plataforma centralizada de servicios de inteligencia artificial desarrollada en Barranquilla, Colombia, bajo el programa **Ruta IA** de la Cámara de Comercio de Barranquilla en alianza con Boost Business Consulting.

Actúa como punto de entrada único (*single entry point*) para múltiples módulos de negocio inteligentes, proveyendo autenticación unificada, enrutamiento hacia aplicaciones especializadas y una interfaz de usuario consistente. Cada módulo es una SPA React independiente servida bajo su propio prefijo de ruta.

---

## 2. Stack Tecnológico

### 2.1 Hub — Backend (Django)

| Componente | Tecnología | Versión |
|---|---|---|
| Framework web | Django | 4.2+ |
| API REST | Django REST Framework | 3.14+ |
| Servidor WSGI | Gunicorn | 21.2+ |
| Base de datos | PostgreSQL + psycopg2-binary | 16 / 2.9+ |
| Archivos estáticos | WhiteNoise | 6.6+ |
| CORS | django-cors-headers | 4.3+ |
| Configuración | python-decouple | 3.8+ |
| Conectividad ERP | pyodbc + ODBC Driver 18 for SQL Server | 5.0+ |
| NLP / Embeddings | sentence-transformers (`all-MiniLM-L6-v2`) | 2.7+ |
| Clustering | scikit-learn (K-Means) | 1.4+ |
| Álgebra lineal | numpy | 1.26+ |

**Dependencias Python completas (`backend/hub/requirements.txt`):**

```
django>=4.2,<5.0
djangorestframework>=3.14
django-cors-headers>=4.3
python-decouple>=3.8
gunicorn>=21.2
whitenoise>=6.6
psycopg2-binary>=2.9
pyodbc>=5.0
sentence-transformers>=2.7
scikit-learn>=1.4
numpy>=1.26
```

### 2.2 Hub — Frontend

| Componente | Tecnología | Versión |
|---|---|---|
| Framework UI | React | 18 |
| Bundler | Vite | 5 |
| Enrutamiento | react-router-dom | 6 |
| Cliente HTTP | Axios | 1.6+ |

### 2.3 ServiPáramo — Frontend (módulo independiente)

| Componente | Tecnología | Versión |
|---|---|---|
| Framework UI | React | 19.2.4 |
| Bundler | Vite | 8 |
| Tipado | TypeScript | 5 |
| Estilos | Tailwind CSS | 4 |
| Estado global | Zustand | 5.0.11 |
| Gráficas | Recharts | 3.8.0 |
| Iconos | Lucide React | 0.577.0 |
| Enrutamiento | react-router-dom | 7.13.1 |
| Cliente HTTP | Axios | 1.13.6 |
| Componentes UI | Radix UI (14 primitivos) | 2.1+ |

### 2.4 Infraestructura

| Componente | Tecnología | Puerto | Función |
|---|---|---|---|
| Proxy inverso | Nginx | 9005 | API Gateway, enrutamiento, static files |
| Túnel HTTPS | ngrok | → 9005 | Acceso externo durante desarrollo |
| Hub Backend | Django/Gunicorn | 8005 | API REST + lógica de negocio |
| Hub Frontend | Nginx container / Vite dev | 80 / 3000 | SPA principal |
| ServiPáramo Frontend | Nginx container / Vite dev | 80 / 5176 | SPA ServiPáramo |
| Base de datos | PostgreSQL | 5432 | Almacenamiento central |

---

## 3. Estructura de Directorios

```
/home/desarrollo/barranquIA-clean/
├── backend/
│   └── hub/                          # Proyecto Django (WSGI)
│       ├── api/                      # App Hub core (auth, servicios)
│       │   ├── models.py
│       │   ├── views.py              # login, logout, health, services, verify-token
│       │   ├── serializers.py
│       │   └── urls.py
│       ├── barranquia/               # Configuración Django
│       │   ├── settings.py
│       │   ├── urls.py               # Rutas raíz (incluye serviparamo)
│       │   └── wsgi.py
│       ├── serviparamo/              # Django app — módulo ServiPáramo
│       │   ├── models.py             # 11 modelos (SKUs, embeddings, staging, ETLLog)
│       │   ├── views.py              # 13 endpoints REST
│       │   ├── serializers.py
│       │   ├── urls.py
│       │   ├── router.py
│       │   ├── etl.py                # Extracción SQL Server → PostgreSQL
│       │   ├── embeddings.py         # Vectorización sentence-transformers
│       │   ├── normalizer.py         # K-Means + similitud coseno
│       │   ├── admin.py
│       │   └── migrations/           # 0001–0003
│       ├── manage.py
│       └── requirements.txt
├── frontend/
│   ├── hub/                          # React SPA del Hub
│   │   └── src/
│   │       ├── App.jsx               # Autenticación + grid de servicios
│   │       ├── Login.jsx
│   │       └── main.jsx
│   └── serviparamo/                  # React SPA ServiPáramo (Vite + TS)
│       └── src/
│           ├── pages/                # 9 páginas
│           ├── features/             # Componentes por dominio
│           ├── components/           # Componentes reutilizables + Radix UI
│           ├── layouts/              # DashboardLayout, Header, Sidebar
│           ├── router/               # React Router v7
│           ├── services/             # api.js, serviparamoService.js
│           ├── store/                # Zustand (useSessionStore)
│           ├── hooks/                # useFetch
│           └── utils/                # formatters.js
├── docker/
│   ├── hub/
│   │   ├── Dockerfile.backend        # Python 3.11-slim + ODBC Driver 18
│   │   └── entrypoint.sh             # migrate → collectstatic → gunicorn
│   ├── serviparamo/
│   │   ├── Dockerfile.frontend       # Multi-stage: Node 20 build → Nginx serve
│   │   └── nginx.conf                # Sirve /serviparamo/ desde dist/
│   └── docker-compose.yml            # 4 servicios: postgres, hub-backend, serviparamo-frontend, nginx
├── infra/
│   ├── nginx/
│   │   ├── docker.conf               # Nginx para Docker (rutas a containers)
│   │   └── barranquia-hub.conf       # Nginx bare-metal (rutas a localhost)
│   └── systemd/
│       ├── barranquia-hub.service    # Django/Gunicorn gestionado por SystemD
│       └── barranquia-ngrok.service  # Túnel ngrok
├── data/
│   └── serviparamo/                  # Archivos de datos del módulo
├── scripts/
│   ├── deploy-nginx.sh
│   └── deploy-ngrok.sh
├── docs/
│   ├── serviparamo/                  # Docs específicos del módulo
│   ├── DOCUMENTO_TECNICO.md          # Este archivo
│   ├── ARQUITECTURA_SOFTWARE.md
│   ├── DOCUMENTO_FUNCIONAL.md
│   └── POWERBI_CONEXION.md
├── Makefile                          # 30+ targets de gestión
├── .env                              # Variables de entorno (git-ignored)
└── .env.example                      # Template de variables
```

---

## 4. API REST — Hub Backend

### 4.1 Configuración Base

- **URL base:** `http://192.168.0.101:9005/api/` (LAN) / `https://barranquia-hub.ngrok.io/api/` (externo)
- **Autenticación:** Token DRF — `Authorization: Token <token>`
- **Formato:** JSON
- **Locale:** `es-co` / `America/Bogota`

### 4.2 Endpoints del Hub Core

#### `GET /api/health/`

Verificación de estado del servicio. No requiere autenticación.

**Respuesta 200:**
```json
{ "status": "ok", "service": "BarranquIA Hub" }
```

---

#### `POST /api/login/`

Autenticación de usuario y generación de token DRF.

**Body:**
```json
{ "username": "string", "password": "string" }
```

**Respuesta 200:**
```json
{ "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b", "username": "admin" }
```

**Respuesta 400:**
```json
{ "error": "Credenciales inválidas" }
```

---

#### `POST /api/logout/`

Invalida el token de sesión actual. Requiere autenticación.

**Respuesta 200:**
```json
{ "status": "ok" }
```

---

#### `GET /api/services/`

Lista de módulos registrados en el hub. Requiere autenticación.

**Respuesta 200:**
```json
[
  {
    "id": "serviparamo",
    "name": "ServiPáramo",
    "description": "Normalización inteligente de catálogo de SKUs",
    "icon": "🏔️",
    "color": "#1a3a5c",
    "path": "/serviparamo",
    "active": true
  }
]
```

---

#### `GET /api/verify-token/`

Valida si el token de sesión está activo. Usado por los módulos hijos al cargar.

**Respuesta 200:** Token válido
**Respuesta 401:** Token inválido o expirado

---

### 4.3 Endpoints de ServiPáramo

Ver documento técnico específico: `docs/serviparamo/DOCUMENTO_TECNICO.md`

**Prefijo:** `/api/serviparamo/`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/stats/` | KPIs generales del catálogo |
| GET | `/skus/` | Catálogo paginado (filtros: familia, categoria, q) |
| GET | `/skus/<codigo>/` | Detalle de un SKU |
| GET | `/categorias/` | Lista de categorías |
| GET | `/familias/` | Lista de familias |
| GET | `/ordenes/` | Órdenes de compra |
| GET | `/pedidos/` | Solicitudes de pedido |
| GET | `/duplicados/` | Grupos de duplicados paginados |
| POST | `/aprobar/` | Aprobar SKU como maestro |
| POST | `/fusionar/` | Fusionar familias |
| GET | `/etl/status/` | Estado del último ETL |
| POST | `/etl/run/` | Disparar ETL manualmente |
| GET | `/buscar/` | Búsqueda semántica de SKUs |

---

## 5. Configuración Django

**Archivo:** `backend/hub/barranquia/settings.py`

```python
DEBUG = False
ALLOWED_HOSTS = ['*', 'barranquia-hub.ngrok.io', '192.168.0.101', 'localhost']
LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Bogota'
CORS_ALLOW_ALL_ORIGINS = True

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME'),
        'USER': env('DB_USER'),
        'PASSWORD': env('DB_PASSWORD'),
        'HOST': env('DB_HOST'),   # 'postgres' en Docker, 'localhost' en bare-metal
        'PORT': env('DB_PORT', default='5432'),
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.TokenAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
}

INSTALLED_APPS = [
    ...
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'api',
    'serviparamo',
]
```

---

## 6. Configuración Nginx

**Archivo Docker:** `infra/nginx/docker.conf`
**Puerto escucha:** 9005

```nginx
server {
    listen 9005;
    server_name barranquia-hub.ngrok.io 192.168.0.101 localhost;

    # Hub Backend (Django/Gunicorn)
    location /api/ {
        proxy_pass http://hub-backend:8005/api/;
    }
    location /admin/ {
        proxy_pass http://hub-backend:8005/admin/;
    }
    location /static/ {
        proxy_pass http://hub-backend:8005/static/;
    }

    # ServiPáramo Frontend (React SPA)
    location /serviparamo/ {
        proxy_pass http://serviparamo-frontend:80/;
    }

    # Hub Frontend (React SPA — fallback)
    location / {
        proxy_pass http://hub-backend:8005;
    }
}
```

---

## 7. Variables de Entorno

**Archivo:** `.env` (git-ignored) / `.env.example` (plantilla)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `SECRET_KEY` | Clave secreta Django | `cambia-esta-clave-...` |
| `DEBUG` | Modo depuración | `False` |
| `ALLOWED_HOSTS` | Hosts permitidos | `localhost,192.168.0.101,...` |
| `DB_NAME` | Nombre BD PostgreSQL | `barranquia_hub` |
| `DB_USER` | Usuario BD | `barranquia` |
| `DB_PASSWORD` | Contraseña BD | `Barranquia2024Hub` |
| `DB_HOST` | Host BD | `postgres` (Docker) / `localhost` (bare-metal) |
| `DB_PORT` | Puerto BD | `5432` |
| `GUNICORN_WORKERS` | Workers Gunicorn | `3` |
| `GUNICORN_TIMEOUT` | Timeout Gunicorn (s) | `120` |
| `SERVIPARAMO_ERP_HOST` | Host SQL Server ERP | `ts1.serviparamo.com.co` |
| `SERVIPARAMO_ERP_PORT` | Puerto SQL Server | `1433` |
| `SERVIPARAMO_ERP_DB` | Base de datos ERP | `PRUEBA` |
| `SERVIPARAMO_ERP_USER` | Usuario ERP | `sa` |
| `SERVIPARAMO_ERP_PASS` | Contraseña ERP | `<confidencial>` |

---

## 8. Flujo de Autenticación

```
[Cliente]
  │── POST /api/login/ { username, password }
  ▼
[Nginx :9005] → proxy → [Django :8005]
  │  Valida contra django.contrib.auth
  │  Genera/retorna DRF Token (tabla authtoken_token)
  ▼
[Cliente] ← { token, username }
  │  Almacena token en localStorage
  │
[Módulo hijo (ej. ServiPáramo)]
  │── GET /api/verify-token/ Authorization: Token <token>
  ▼
[Django :8005]
  │  200 → renderiza app completa
  │  401 → redirect a Hub login
```

---

## 9. Docker Compose

**Archivo:** `docker/docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16
    volumes: [postgres_data:/var/lib/postgresql/data]
    networks: [ruta-ia-net]

  hub-backend:
    build: { context: .., dockerfile: docker/hub/Dockerfile.backend }
    depends_on: [postgres]
    volumes: [huggingface_cache:/root/.cache/huggingface]
    networks: [ruta-ia-net]

  serviparamo-frontend:
    build: { context: .., dockerfile: docker/serviparamo/Dockerfile.frontend }
    networks: [ruta-ia-net]

  nginx:
    image: nginx:alpine
    ports: ["9005:9005"]
    volumes: [./infra/nginx/docker.conf:/etc/nginx/conf.d/default.conf]
    depends_on: [hub-backend, serviparamo-frontend]
    networks: [ruta-ia-net]

volumes:
  postgres_data:
  huggingface_cache:    # Caché modelos HuggingFace/sentence-transformers

networks:
  ruta-ia-net:
    driver: bridge
```

**Comandos principales (Makefile):**

```bash
make setup      # Primera vez: build + up
make up         # Levantar servicios
make down       # Detener servicios
make restart    # Reiniciar servicios
make logs       # Ver logs en tiempo real
make ps         # Estado de contenedores
make build-serviparamo  # Rebuild frontend ServiPáramo
make reload-backend     # Gunicorn graceful reload
```

---

## 10. Despliegue Bare-Metal

**Servidor:** `192.168.0.101` — Ubuntu Linux

### 10.1 Servicio SystemD (Django)

**Archivo:** `infra/systemd/barranquia-hub.service`

```ini
[Unit]
Description=BarranquIA Hub - Django Backend
After=network.target postgresql.service

[Service]
Type=simple
User=desarrollo
WorkingDirectory=/home/desarrollo/barranquIA-clean/backend/hub
EnvironmentFile=/home/desarrollo/barranquIA-clean/.env
ExecStart=/home/desarrollo/barranquIA-clean/backend/hub/venv/bin/gunicorn \
          barranquia.wsgi:application \
          --bind 127.0.0.1:8005 \
          --workers 3 \
          --timeout 120
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 10.2 Túnel ngrok

**Archivo:** `infra/systemd/barranquia-ngrok.service`

Establece el túnel público `https://barranquia-hub.ngrok.io` → `localhost:9005`.

### 10.3 Comandos de Gestión

```bash
# Estado de servicios
sudo systemctl status barranquia-hub
sudo systemctl status barranquia-ngrok

# Reiniciar backend
sudo systemctl restart barranquia-hub

# Ver logs
sudo journalctl -u barranquia-hub -f

# Desplegar configuración Nginx
bash scripts/deploy-nginx.sh

# Desplegar ngrok
bash scripts/deploy-ngrok.sh
```

---

## 11. Desarrollo Local

```bash
# Hub Backend
cd backend/hub
source venv/bin/activate
python manage.py runserver 8005

# ServiPáramo Frontend
cd frontend/serviparamo
npm install
npm run dev   # :5176

# Con Docker (todo el stack)
make up
make logs
```

---

## 12. Estado de Implementación

| Componente | Estado | Notas |
|---|---|---|
| Hub Backend (Django + PostgreSQL) | ✅ Operativo | Auth, servicios, health check |
| Hub Frontend (React 18) | ✅ Operativo | Login, grid de servicios |
| ServiPáramo Backend | ✅ Sprint 1 completo | ETL, embeddings, API REST (13 endpoints) |
| ServiPáramo Frontend | ✅ Sprint 1 completo | 9 páginas, branding ServiPáramo |
| Docker Compose (4 servicios) | ✅ Operativo | postgres, hub-backend, serviparamo-frontend, nginx |
| Bare-metal (SystemD + Nginx + ngrok) | ✅ Operativo | LAN: :9005, externo: ngrok |
| Avantika (módulo) | ⏳ En desarrollo | Frontend boilerplate |
| Joz (módulo) | ⏳ Pendiente | Boilerplate |
| Power BI | ⏳ Pendiente | Sprint 3 |

---

*BarranquIA Hub — Ruta IA × Cámara de Comercio de Barranquilla × Boost Business Consulting*
*Última actualización: 22 de marzo de 2026*
