# Documento Técnico — BarranquIA Hub

**Versión:** 1.0  
**Fecha:** 2026-04-12  
**Proyecto:** BarranquIA Hub — Plataforma Centralizada de Servicios IA  
**Programa:** Ruta IA — Barranquilla, Colombia  

---

## 1. Descripción General del Sistema

BarranquIA Hub es una plataforma monorepo compuesta por cuatro microservicios independientes de inteligencia artificial orientados a empresas en Barranquilla. Cada microservicio aborda un dominio de negocio diferente y se integra bajo un hub central de autenticación y descubrimiento de servicios.

Los cuatro microservicios son:

| Servicio | Dominio | Cliente |
|---|---|---|
| Hub | Autenticación y gateway central | Transversal |
| ServiPáramo | Normalización de catálogo SKU + ERP | ServiPáramo S.A.S |
| Avantika | Inventario y pronóstico de demanda | Avantika |
| Joz | Detección de anomalías financieras | Joz / SuperEfectivo |

---

## 2. Stack Tecnológico

### 2.1 Backend

| Tecnología | Versión | Uso |
|---|---|---|
| Python | 3.11 | Runtime de todos los backends |
| Django | 4.2 | Framework web |
| Django REST Framework (DRF) | 3.x | API REST + autenticación por token |
| Gunicorn | — | Servidor WSGI en producción |
| psycopg2 | — | Driver PostgreSQL para Django |
| pyodbc | — | Conexión a SQL Server (ServiPáramo) |
| sentence-transformers | — | Embeddings semánticos (ServiPáramo) |
| requests | — | Consumo de API HTTP externa (Joz) |
| corsheaders | — | Control de CORS en Django |

### 2.2 Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| React | 18 (Hub) / 19 (resto) | UI declarativa |
| Vite | 5–8 | Build tool y dev server |
| TypeScript | 5.x | Tipado estático (ServiPáramo, Joz) |
| React Router DOM | 6.x (Hub) / 7.x (resto) | Enrutamiento SPA |
| Axios | 1.x | Cliente HTTP |
| Zustand | 5.x | Manejo de estado global (token) |
| Tailwind CSS | 3.4 | Estilos utilitarios |
| Radix UI | 1.x | Componentes UI accesibles (ServiPáramo, Joz) |
| Recharts | 3.x | Visualizaciones y gráficas |
| Lucide React | 0.5x | Iconografía |

### 2.3 Infraestructura

| Tecnología | Versión | Uso |
|---|---|---|
| Docker | — | Containerización de servicios |
| Docker Compose | — | Orquestación local |
| PostgreSQL | 16-alpine | Base de datos principal |
| Nginx | alpine | Servidor estático frontend + reverse proxy |
| ngrok | — | Tunnel HTTPS para exposición externa |

---

## 3. Estructura del Monorepo

```
barranquIA-clean/
├── hub/
│   ├── backend/           # Django 4.2 (puerto 8006)
│   ├── frontend/          # React 18 (puerto 5174 dev / 9005 prod)
│   └── infra/             # Dockerfile + nginx config
├── serviparamo/
│   ├── backend/           # Django 4.2 (puerto 8001)
│   ├── frontend/          # React 19 + TypeScript (puerto 9021)
│   └── infra/             # Dockerfile (con msodbcsql18)
├── avantika/
│   ├── backend/           # Django 4.2 (puerto 8012)
│   ├── frontend/          # React 19 (puerto 9022)
│   └── infra/             # Dockerfile
├── joz/
│   ├── backend/           # Django 4.2 (puerto 8003)
│   ├── frontend/          # React 19 + TypeScript (puerto 9023)
│   └── infra/             # Dockerfile
├── shared/
│   ├── docker-compose.yml # Orquestación de 8 servicios
│   ├── postgres/
│   │   ├── init.sql       # Creación de 4 DBs y usuarios
│   │   └── init.sh        # Script de inicialización
│   └── scripts/           # Deploy nginx + ngrok
├── Makefile               # 30+ comandos de gestión
└── .env.example           # Variables de entorno requeridas
```

---

## 4. Especificación de APIs

### 4.1 Hub Backend — `localhost:8006/api/`

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/api/login/` | No | Autentica usuario, retorna token |
| POST | `/api/logout/` | Token | Invalida el token activo |
| GET | `/api/health/` | No | Estado del servicio |
| GET | `/api/services/` | Token | Lista los servicios disponibles |

**Respuesta login:**
```json
{
  "token": "9af3b2c...",
  "username": "admin"
}
```

### 4.2 ServiPáramo Backend — `localhost:8001/api/serviparamo/`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/stats/` | Estadísticas del catálogo |
| GET | `/skus/` | Listado paginado de SKUs |
| GET | `/skus/{codigo}/` | Detalle de un SKU |
| GET | `/categorias/` | Categorías disponibles |
| GET | `/familias/` | Familias normalizadas con conteos |
| GET | `/familias/erp/` | Familias crudas del ERP |
| GET | `/duplicados/` | Grupos de SKUs duplicados |
| POST | `/aprobar/` | Aprobar normalización de SKU |
| POST | `/fusionar-familias/` | Fusionar dos familias |
| GET | `/ordenes/` | Órdenes de compra |
| GET | `/ordenes/{numfac}/` | Detalle de orden |
| GET | `/pedidos/` | Pedidos/cotizaciones |
| GET | `/pedidos/{pedido}/` | Detalle de pedido |
| GET | `/etl/status/` | Estado del proceso ETL |
| POST | `/etl/run/` | Disparar sincronización ETL |
| GET | `/buscar/` | Búsqueda semántica de SKUs |

### 4.3 Avantika Backend — `localhost:8012/`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/stats/` | Resumen de inventario |
| GET | `/clasificacion-abc/` | Clasificación ABC con filtros |
| POST | `/predecir-demanda/` | Generar pronóstico de demanda |
| GET | `/sugerencias-reposicion/` | Sugerencias de reposición |
| POST | `/parametros/` | Actualizar parámetros del modelo |
| POST | `/log-feedback/` | Registrar feedback del modelo |

### 4.4 Joz Backend — `localhost:8003/api/joz/`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/stats/` | Estadísticas generales del dashboard |
| GET | `/anomalias-por-dia/` | Anomalías agrupadas por día |
| GET | `/alertas/` | Listado de alertas (paginado, filtrable) |
| PATCH | `/alertas/{id}/` | Actualizar estado de alerta |
| GET | `/riesgos/` | Listado de riesgos |
| GET | `/historial/` | Historial de transacciones |
| POST | `/etl/run/` | Disparar sincronización con SuperEfectivo |
| GET | `/etl/status/` | Estado del proceso ETL |

---

## 5. Modelos de Datos

### 5.1 Hub

No tiene modelos propios. Utiliza `django.contrib.auth.User` y `rest_framework.authtoken.Token` de Django/DRF.

### 5.2 Avantika

```
SKU
├── codigo (PK)
├── descripcion
├── categoria
├── clasificacion_abc (A/B/C)
├── stock_actual
├── stock_minimo
├── precio_unitario
└── estado

PronosticoDemanda
├── sku → FK(SKU)
├── fecha
├── cantidad_pronosticada
├── intervalo_confianza_min
└── intervalo_confianza_max

SugerenciaReposicion
├── sku → FK(SKU)
├── cantidad_sugerida
├── fecha_generacion
└── prioridad
```

### 5.3 ServiPáramo

```
CatalogoSKU
├── codigo (PK)
├── descripcion
├── familia
├── familia_normalizada
├── categoria
├── unidad
├── estado
└── fecha_actualizacion

CatalogoEmbedding
├── sku → FK(CatalogoSKU)
├── vector (JSON/array)
└── modelo_version

RawOrdenEncabezado
├── numfac (PK)
├── fecha
├── proveedor
├── total
└── estado

RawOrdenDetalle
├── numfac → FK(RawOrdenEncabezado)
├── codigo_sku
├── cantidad
└── precio_unitario

(+ tablas similares para pedidos y presupuestos)

ETLLog
├── id
├── tipo (ordenes/pedidos/presupuestos/skus)
├── estado (ok/error)
├── registros_procesados
├── fecha_inicio
└── fecha_fin
```

### 5.4 Joz

```
Transaccion
├── id (PK)
├── referencia
├── sucursal
├── cliente
├── tipo (empeño/retiro/abono/apertura/cierre)
├── monto
├── fecha
└── es_anomalia (bool)

Alerta
├── id
├── transaccion → FK(Transaccion)
├── severidad (alta/media/baja)
├── estado (pendiente/revisada/descartada)
├── nivel_riesgo
├── descripcion
└── fecha_creacion

Riesgo
├── id
├── sucursal
├── categoria
├── probabilidad (0-1)
├── impacto (0-1)
└── fecha_evaluacion

ETLLog
├── tipo
├── estado
├── registros
├── fecha_inicio
└── fecha_fin
```

---

## 6. Autenticación y Seguridad

### 6.1 Mecanismo

Se usa autenticación por token de DRF (`rest_framework.authtoken`):

1. El usuario envía credenciales al Hub (`POST /api/login/`)
2. Django valida con `authenticate(username, password)`
3. Se crea o recupera el token (`Token.objects.get_or_create(user=user)`)
4. El token se almacena en `localStorage` del navegador
5. Cada petición subsiguiente incluye `Authorization: Token <token>`

### 6.2 Inyección del token (frontend)

```javascript
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Token ${token}`
  return config
})
```

### 6.3 AuthGuard

Cada microservicio frontend tiene un componente `AuthGuard` que verifica la validez del token al montar la ruta protegida. Si el token falla, redirige al Hub de autenticación.

### 6.4 Limitaciones actuales de seguridad

- Los tokens no tienen expiración (vida indefinida)
- No hay sistema RBAC (todos los usuarios autenticados tienen el mismo acceso)
- El token se almacena en `localStorage` (susceptible a XSS)
- No se implementan refresh tokens
- Las credenciales de ERP y APIs externas se gestionan via variables de entorno

---

## 7. Integración con Sistemas Externos

### 7.1 ERP SQL Server — ServiPáramo

```
Servidor: ts1.serviparamo.com.co:1433
Base de datos: PRUEBA
Driver: ODBC Driver 18 for SQL Server (msodbcsql18)
```

El backend de ServiPáramo usa `pyodbc` para conectarse al ERP de SQL Server, extraer datos crudos (SKUs, órdenes, pedidos) y sincronizarlos hacia PostgreSQL mediante un proceso ETL. El Dockerfile instala explícitamente el driver `msodbcsql18` para habilitar esta conexión.

### 7.2 API REST SuperEfectivo — Joz

```
Host: https://ia.elpenon.pa
Autenticación: Bearer token + Basic auth
```

Joz consume la API de SuperEfectivo para extraer transacciones financieras. El ETL se puede disparar manualmente desde el dashboard o programáticamente. Los datos se almacenan en PostgreSQL y se procesan para detección de anomalías.

---

## 8. Configuración de Variables de Entorno

Las siguientes variables son requeridas (ver `.env.example`):

```bash
# PostgreSQL compartido
POSTGRES_DB=barranquia_hub
POSTGRES_USER=barranquia
POSTGRES_PASSWORD=...

# Hub
SECRET_KEY=...
DB_NAME=barranquia_hub
DB_HOST=postgres

# ServiPáramo
SERVIPARAMO_DB_USER=serviparamo
SERVIPARAMO_DB_PASSWORD=...
SERVIPARAMO_ERP_HOST=ts1.serviparamo.com.co
SERVIPARAMO_ERP_PORT=1433
SERVIPARAMO_ERP_DB=PRUEBA
SERVIPARAMO_ERP_PASS=...

# Avantika
AVANTIKA_DB_USER=avantika
AVANTIKA_DB_PASSWORD=...

# Joz
JOZ_DB_USER=joz
JOZ_DB_PASSWORD=...
JOZ_API_URL=https://ia.elpenon.pa
JOZ_API_USUARIO=SuperEfectivo
JOZ_API_PASSWORD=...
JOZ_API_TOKEN=...
```

---

## 9. Puertos y Mapeo de Servicios

| Servicio | Puerto Host | Puerto Contenedor | Protocolo |
|---|---|---|---|
| Nginx Gateway (host) | 9005 | — | HTTP |
| Hub Backend | 8006 | 8005 | HTTP (Gunicorn) |
| ServiPáramo Backend | 8001 | 8001 | HTTP (Gunicorn) |
| ServiPáramo Frontend | 9021 | 80 | HTTP (Nginx) |
| Avantika Backend | 8012 | 8002 | HTTP (Gunicorn) |
| Avantika Frontend | 9022 | 80 | HTTP (Nginx) |
| Joz Backend | 8003 | 8003 | HTTP (Gunicorn) |
| Joz Frontend | 9023 | 80 | HTTP (Nginx) |
| PostgreSQL | — | 5432 | TCP (interno) |

---

## 10. Comandos de Gestión (Makefile)

```bash
make setup           # Build completo e inicio de servicios
make up              # Iniciar todos los contenedores
make down            # Detener y eliminar contenedores
make logs            # Ver logs en tiempo real
make deploy-nginx    # Aplicar configuración de Nginx
make deploy-ngrok    # Configurar túnel HTTPS
make migrate-hub     # Migraciones del Hub
make migrate-serviparamo  # Migraciones de ServiPáramo
make etl             # Disparar ETL de ServiPáramo
```

---

## 11. Proceso de Build y Deploy

### Build de Frontend (multi-stage Docker)

```dockerfile
# Stage 1: compilar
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: servir
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

### Backend Django (entrypoint)

```bash
#!/bin/bash
python manage.py migrate --noinput
python manage.py collectstatic --noinput
gunicorn core.wsgi:application --bind 0.0.0.0:8001 --workers 2
```

---

## 12. Locale y Configuración Regional

Todos los backends Django comparten:

```python
LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Bogota'
USE_I18N = True
USE_TZ = True
```
