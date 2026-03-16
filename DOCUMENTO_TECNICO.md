# Documento Técnico — BarranquIA Hub
**Versión:** 1.0
**Fecha:** 2026-03-14
**Estado:** En desarrollo activo

---

## 1. Descripción General

BarranquIA Hub es una plataforma centralizada de servicios de inteligencia artificial desarrollada en Barranquilla, Colombia. Actúa como punto de entrada único (*single entry point*) para múltiples aplicaciones de negocio inteligentes, proveyendo autenticación unificada, enrutamiento hacia microservicios especializados y una interfaz de usuario consistente.

---

## 2. Stack Tecnológico

### 2.1 Hub — Backend

| Componente | Tecnología | Versión |
|---|---|---|
| Framework web | Django | 4.2+ |
| API REST | Django REST Framework | 3.14+ |
| Servidor WSGI | Gunicorn | 21.2+ |
| Base de datos | SQLite3 | Built-in |
| Archivos estáticos | WhiteNoise | 6.6+ |
| CORS | django-cors-headers | 4.3+ |
| Configuración | python-decouple | 3.8+ |

**Dependencias Python completas (`requirements.txt`):**
```
django>=4.2,<5.0
djangorestframework>=3.14
django-cors-headers>=4.3
python-decouple>=3.8
gunicorn>=21.2
whitenoise>=6.6
```

### 2.2 Hub — Frontend

| Componente | Tecnología | Versión |
|---|---|---|
| Framework UI | React | 18.2.0 |
| Bundler | Vite | 5.0.0 |
| Enrutamiento | react-router-dom | 6.21.0 |
| Cliente HTTP | Axios | 1.6.0 |

### 2.3 Módulo Avantika — Frontend

| Componente | Tecnología | Versión |
|---|---|---|
| Framework UI | React | 19.2.4 |
| Bundler | Vite | 8.0.0 |
| Tipado | TypeScript | 5.9.3 |
| Estilos | Tailwind CSS | 3.4.4 |
| Estado global | Zustand | 5.0.11 |
| Gráficas | Recharts | 3.8.0 |
| Íconos | Lucide React | 0.577.0 |
| Enrutamiento | react-router-dom | 7.13.1 |
| Cliente HTTP | Axios | 1.13.6 |

### 2.4 Infraestructura

| Componente | Tecnología | Puerto | Función |
|---|---|---|---|
| Proxy inverso | Nginx | 9005 | Enrutamiento y SSL termination |
| Túnel HTTPS | ngrok | → 9005 | Acceso externo durante desarrollo |
| Hub API | Django/Gunicorn | 8005 | Backend del hub |
| Avantika API | FastAPI | 9001 | Microservicio (planificado) |
| ServiPáramo API | FastAPI | 9002 | Microservicio (planificado) |
| Joz API | FastAPI | 9003 | Microservicio (planificado) |

---

## 3. Estructura de Directorios

```
/home/desarrollo/barranquIA-hub/
├── hub/                              # Hub central (OPERATIVO)
│   ├── backend/                      # Django REST API
│   │   ├── api/                      # App Django principal
│   │   │   ├── models.py             # Modelos de BD (extensible)
│   │   │   ├── views.py              # Controladores/endpoints
│   │   │   ├── serializers.py        # Validación de datos
│   │   │   └── urls.py               # Rutas de la API
│   │   ├── barranquia/               # Configuración Django
│   │   │   ├── settings.py           # Ajustes del proyecto
│   │   │   ├── urls.py               # URLs raíz
│   │   │   └── wsgi.py               # Entry point WSGI
│   │   ├── staticfiles/              # Archivos estáticos compilados
│   │   │   └── frontend/             # Build de React (producción)
│   │   ├── manage.py
│   │   ├── db.sqlite3                # Base de datos
│   │   └── .env                      # Variables de entorno
│   ├── frontend/                     # React SPA del Hub
│   │   ├── src/
│   │   │   ├── App.jsx               # Componente raíz + auth
│   │   │   ├── Login.jsx             # Formulario de autenticación
│   │   │   └── main.jsx              # Entry point React
│   │   ├── vite.config.js
│   │   └── package.json
│   ├── nginx.conf                    # Configuración Nginx
│   ├── barranquia-hub.service        # Unidad SystemD
│   └── setup.sh                      # Script de despliegue
├── avantika/                         # Módulo: Inventario y Pronóstico
│   └── frontend/                     # React 19 + TypeScript
│       └── src/
│           ├── router/               # Definición de rutas
│           ├── pages/                # Páginas por módulo
│           ├── components/           # Componentes reutilizables
│           ├── features/             # Lógica por dominio
│           ├── layouts/              # Estructuras de página
│           ├── services/             # Clientes HTTP
│           ├── store/                # Estado global (Zustand)
│           ├── hooks/                # Hooks personalizados
│           └── mock/                 # Datos de prueba JSON
├── joz/                              # Módulo: Alertas (boilerplate)
├── serviparamo/                      # Módulo: Catálogo (boilerplate)
├── powerbi/                          # Módulo: BI (pendiente)
└── docker-compose.yml
```

---

## 4. API REST — Hub Backend

### 4.1 Configuración Base

- **URL base:** `http://192.168.0.101:9005/api/`
- **Autenticación:** Token DRF (`Authorization: Token <token>`)
- **Formato:** JSON
- **Locale:** `es-co` / `America/Bogota`

### 4.2 Endpoints

#### `GET /api/health/`
Verificación de estado del servicio.

**Autenticación:** No requerida

**Respuesta 200:**
```json
{
  "status": "ok",
  "service": "BarranquIA Hub"
}
```

---

#### `POST /api/login/`
Autenticación de usuario y generación de token.

**Autenticación:** No requerida

**Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Respuesta 200:**
```json
{
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "username": "admin"
}
```

**Respuesta 400 (credenciales inválidas):**
```json
{
  "error": "Credenciales inválidas"
}
```

---

#### `POST /api/logout/`
Invalidación del token de sesión.

**Autenticación:** Requerida

**Respuesta 200:**
```json
{
  "status": "ok"
}
```

---

#### `GET /api/services/`
Lista de microservicios registrados en el hub.

**Autenticación:** Requerida

**Respuesta 200:**
```json
[
  {
    "id": "avantika",
    "name": "Avantika",
    "description": "Plataforma de gestión de inventario y pronóstico de demanda",
    "icon": "🤖",
    "color": "#6c63ff",
    "path": "/avantika",
    "active": true
  }
]
```

---

#### `GET /api/verify-token/`
Validación de token activo (usado por módulos hijos).

**Autenticación:** Requerida

**Respuesta 200:** Token válido
**Respuesta 401:** Token inválido o expirado

---

### 4.3 Configuración Django (`settings.py`)

```python
DEBUG = False
ALLOWED_HOSTS = ['*', 'barranquia-hub.ngrok.io', '192.168.0.101', 'localhost']
CORS_ALLOW_ALL_ORIGINS = True
LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Bogota'
STATIC_ROOT = BASE_DIR / 'staticfiles'
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['rest_framework.authentication.TokenAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
}
```

---

## 5. Configuración Nginx

**Archivo:** `hub/nginx.conf`
**Puerto escucha:** 9005

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8005/;
}
location /avantika/ {
    proxy_pass http://127.0.0.1:9001/;
}
location /serviparamo/ {
    proxy_pass http://127.0.0.1:9002/;
}
location /joz/ {
    proxy_pass http://127.0.0.1:9003/;
}
location / {
    try_files $uri /index.html;   # React SPA fallback
}
```

**Cabeceras de seguridad:**
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`

**Caché estático:**
- `/static/` → 30 días (`immutable`)
- `/` → 1 hora

---

## 6. Variables de Entorno

**Archivo:** `hub/backend/.env`

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `SECRET_KEY` | Clave secreta Django | `barranquia-hub-secret-key-...` |
| `DEBUG` | Modo depuración | `False` |
| `ALLOWED_HOSTS` | Hosts permitidos | `*,barranquia-hub.ngrok.io,...` |

---

## 7. Autenticación — Flujo de Tokens

```
[Cliente] POST /api/login/ con credentials
      ↓
[Django] Valida con django.contrib.auth
      ↓
[DRF] Genera/retorna Token (tabla authtoken_token)
      ↓
[Cliente] Almacena en localStorage['token']
      ↓
[Módulo hijo] Lee localStorage['token']
      ↓
[Módulo hijo] GET /api/verify-token/ con Authorization header
      ↓  ✓ Válido → renderiza app
      ↓  ✗ Inválido → redirect a Hub (:5174)
```

---

## 8. Modelos de Datos

### 8.1 SKU (Inventario)

```typescript
interface SKU {
  id: string;                    // Ej: "SKU-001"
  nombre: string;                // Nombre del producto
  categoria: string;             // Categoría
  stock: number;                 // Unidades en inventario
  precio: number;                // Precio en COP
  demandaPromedio: number;       // Demanda promedio diaria
  nivelReorden: number;          // Nivel de reorden
  proveedor: string;             // Nombre del proveedor
  ultimaActualizacion: string;   // Fecha ISO 8601
}
```

**Lógica de estado:**
- `critical`: `stock <= nivelReorden * 0.5`
- `low`: `stock <= nivelReorden`
- `normal`: `stock > nivelReorden`

### 8.2 Pronóstico de Demanda

```typescript
interface ForecastDataPoint {
  fecha: string;           // Fecha ISO 8601
  demandaReal: number;     // Demanda real observada (pasado)
  prediccion: number;      // Valor predicho
  limiteInferior: number;  // Intervalo de confianza inferior
  limiteSuperior: number;  // Intervalo de confianza superior
}
```

---

## 9. Despliegue en Producción

### 9.1 Servicio SystemD

**Archivo:** `hub/barranquia-hub.service`

```ini
[Unit]
Description=BarranquIA Hub - Django Backend
After=network.target

[Service]
Type=simple
User=desarrollo
WorkingDirectory=/home/desarrollo/barranquIA-hub/hub/backend
ExecStart=gunicorn barranquia.wsgi:application \
          --bind 127.0.0.1:8005 \
          --workers 3 \
          --timeout 120
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 9.2 Comandos de Despliegue

```bash
# 1. Compilar frontend
cd hub/frontend && npm run build

# 2. Recolectar archivos estáticos
cd hub/backend
source ../venv/bin/activate
python manage.py collectstatic --noinput

# 3. Aplicar migraciones (si existen)
python manage.py migrate

# 4. Reiniciar servicio
sudo systemctl restart barranquia-hub

# 5. Verificar estado
sudo systemctl status barranquia-hub
curl http://localhost:8005/api/health/
```

### 9.3 Acceso

| Entorno | URL |
|---|---|
| Local (red LAN) | `http://192.168.0.101:9005` |
| Externo (ngrok) | `https://barranquia-hub.ngrok.io` |

---

## 10. Desarrollo Local

```bash
# Hub Backend
cd hub/backend
source ../venv/bin/activate
python manage.py runserver 8005

# Hub Frontend
cd hub/frontend
npm install && npm run dev   # :5174

# Avantika Frontend
cd avantika/frontend
npm install && npm run dev   # :5175
```

---

## 11. Estado de Implementación

| Componente | Estado | Notas |
|---|---|---|
| Hub Backend (Django) | Operativo | Autenticación, servicios, health check |
| Hub Frontend (React 18) | Operativo | Login, grid de servicios |
| Avantika Frontend (React 19) | Operativo | UI con datos mock |
| Avantika Backend (FastAPI) | Planificado | Puerto 9001 reservado |
| Joz Frontend | Boilerplate | Template Vite sin personalizar |
| Joz Backend | Pendiente | Puerto 9003 reservado |
| ServiPáramo Frontend | Boilerplate | Template Vite sin personalizar |
| ServiPáramo Backend | Pendiente | Puerto 9002 reservado |
| Power BI | Pendiente | Integración externa |
| Docker Compose | Mínimo | Sin servicios configurados |
