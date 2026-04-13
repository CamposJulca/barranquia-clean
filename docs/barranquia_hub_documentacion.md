# BarranquIA Hub — Documentación General

**Versión:** 1.0  
**Fecha:** 2026-04-12  
**Proyecto:** BarranquIA Hub — Plataforma Centralizada de Servicios IA  
**Programa:** Ruta IA — Barranquilla, Colombia  

---

## Tabla de Contenidos

1. [Propósito del Sistema](#1-propósito-del-sistema)
2. [Actores del Sistema](#2-actores-del-sistema)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Estructura del Monorepo](#4-estructura-del-monorepo)
5. [Descripción Funcional por Módulo](#5-descripción-funcional-por-módulo)
6. [Especificación de APIs](#6-especificación-de-apis)
7. [Modelos de Datos](#7-modelos-de-datos)
8. [Autenticación y Seguridad](#8-autenticación-y-seguridad)
9. [Integración con Sistemas Externos](#9-integración-con-sistemas-externos)
10. [Arquitectura de Software](#10-arquitectura-de-software)
11. [Infraestructura y Contenedores](#11-infraestructura-y-contenedores)
12. [Configuración y Despliegue](#12-configuración-y-despliegue)
13. [Glosario](#13-glosario)

---

## 1. Propósito del Sistema

BarranquIA Hub es una plataforma que centraliza múltiples servicios de inteligencia artificial para empresas participantes del programa Ruta IA en Barranquilla. Cada empresa accede a un microservicio personalizado para su dominio de negocio, todos gestionados bajo un único punto de autenticación.

El sistema resuelve dos grandes necesidades empresariales en su versión actual:

1. **Normalización y gestión de catálogos de productos** (ServiPáramo)
2. **Detección de anomalías y gestión de riesgos financieros** (Joz)

La plataforma es un monorepo compuesto por microservicios independientes. Cada uno tiene su propio backend, frontend, base de datos y contenedor Docker, integrados bajo un Hub central de autenticación y descubrimiento de servicios.

| Servicio | Dominio | Cliente |
|---|---|---|
| Hub | Autenticación y gateway central | Transversal |
| ServiPáramo | Normalización de catálogo SKU + ERP | ServiPáramo S.A.S |
| Joz | Detección de anomalías financieras | Joz / SuperEfectivo |

---

## 2. Actores del Sistema

| Actor | Descripción |
|---|---|
| Usuario administrador | Accede al Hub y navega a cualquier servicio. Gestiona configuraciones. |
| Analista de catálogo | Usa ServiPáramo para revisar, normalizar y depurar SKUs del ERP. |
| Analista de riesgos | Usa Joz para revisar alertas de anomalías y evaluar riesgos financieros. |

Actualmente todos los usuarios autenticados tienen el mismo nivel de acceso (sin roles diferenciados por servicio).

---

## 3. Stack Tecnológico

### 3.1 Backend

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

### 3.2 Frontend

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

### 3.3 Infraestructura

| Tecnología | Versión | Uso |
|---|---|---|
| Docker | — | Containerización de servicios |
| Docker Compose | — | Orquestación local |
| PostgreSQL | 16-alpine | Base de datos principal |
| Nginx | alpine | Servidor estático frontend + reverse proxy |
| ngrok | — | Tunnel HTTPS para exposición externa |

---

## 4. Estructura del Monorepo

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
├── joz/
│   ├── backend/           # Django 4.2 (puerto 8003)
│   ├── frontend/          # React 19 + TypeScript (puerto 9023)
│   └── infra/             # Dockerfile
├── shared/
│   ├── docker-compose.yml # Orquestación de servicios
│   ├── postgres/
│   │   ├── init.sql       # Creación de DBs y usuarios
│   │   └── init.sh        # Script de inicialización
│   └── scripts/           # Deploy nginx + ngrok
├── Makefile               # Comandos de gestión
└── .env.example           # Variables de entorno requeridas
```

---

## 5. Descripción Funcional por Módulo

### 5.1 Hub Central de Autenticación

El Hub es el punto de entrada único a la plataforma. Presenta al usuario un formulario de login y, una vez autenticado, muestra las tarjetas de acceso a cada servicio disponible.

**Flujo de autenticación:**

1. El usuario accede al Hub en el navegador.
2. Ingresa su usuario y contraseña en el formulario de login.
3. El sistema valida las credenciales contra la base de datos.
4. Si son correctas, se entrega un token de sesión.
5. El token se almacena localmente y se usa en todas las peticiones posteriores.
6. El Hub presenta las tarjetas de los servicios disponibles.
7. Al hacer clic en una tarjeta, el usuario es redirigido al servicio seleccionado.

Al cerrar sesión, el token es invalidado en el servidor y se limpia el almacenamiento local.

---

### 5.2 ServiPáramo — Gestión de Catálogo SKU

ServiPáramo conecta con el ERP de la empresa (SQL Server) para extraer, normalizar y gestionar el catálogo de productos. Utiliza inteligencia artificial (embeddings semánticos) para detectar duplicados y sugerir normalizaciones de familias de productos.

#### Dashboard
- Estado general del catálogo: total de SKUs, porcentaje de duplicados, familias normalizadas, embeddings generados.
- Estado del último proceso ETL ejecutado.

#### Gestor de Catálogo
- Lista todos los SKUs con filtros por categoría, familia y búsqueda de texto libre.
- Soporta paginación para grandes volúmenes de productos.
- Permite ver el detalle de cada SKU individual.

#### Detección de Duplicados
- Identifica grupos de SKUs que podrían ser el mismo producto con descripciones distintas.
- El analista puede revisar cada grupo y decidir si fusionarlos o mantenerlos separados.
- La detección se basa en similitud semántica entre descripciones.

#### Normalización de Familias
- Muestra las familias de productos del ERP con sus variaciones de nombre.
- Permite al analista aprobar, rechazar o modificar la normalización sugerida.
- Permite fusionar dos familias en una sola.

#### Búsqueda Semántica
- El usuario escribe una descripción o término en lenguaje natural.
- El sistema usa embeddings para encontrar los SKUs más similares, incluso si no coinciden literalmente con el texto buscado.

#### Análisis de Compras
- Visualiza las órdenes de compra y pedidos sincronizados desde el ERP.
- Gráficas de evolución temporal y distribución por proveedor/categoría.

#### Consola SQL
- Permite ejecutar consultas SQL directamente sobre la base de datos.
- Orientada a usuarios técnicos para exploración ad-hoc.

#### Proceso ETL (Sincronización con ERP)

1. Conexión al servidor SQL Server del ERP.
2. Extracción de categorías, familias, SKUs, órdenes, pedidos y presupuestos.
3. Almacenamiento en tablas intermedias (raw).
4. Normalización semántica de familias.
5. Generación de embeddings para los SKUs.
6. Registro del resultado en el log de ETL.

El proceso puede dispararse manualmente desde el dashboard o la configuración.

---

### 5.3 Joz — Detección de Anomalías y Riesgos

Joz monitorea las transacciones financieras de la empresa (provenientes de la plataforma SuperEfectivo) para detectar comportamientos anómalos, gestionar alertas y evaluar los niveles de riesgo por sucursal.

#### Dashboard Principal
- **KPIs:** total de transacciones, transacciones con anomalías, alertas activas, sucursales monitoreadas.
- Gráfica de actividad diaria con resaltado de anomalías.
- Distribución de transacciones por sucursal y por tipo.

#### Gestión de Alertas
- Listado de alertas con filtros por severidad (alta/media/baja), estado (pendiente/revisada/descartada) y nivel de riesgo.
- El analista puede cambiar el estado de cada alerta.
- Paginación para volúmenes grandes.

#### Evaluación de Riesgos
- Vista de riesgos identificados por sucursal.
- Cada riesgo incluye categoría, probabilidad de ocurrencia e impacto estimado.

#### Historial de Transacciones
- Historial completo con filtros por fecha, tipo, sucursal y búsqueda por cliente o referencia.

#### Detalle de Sucursal
- Vista individual por sucursal con métricas propias, transacciones, alertas y riesgos asociados.

#### Tipos de transacciones monitoreadas

| Tipo | Descripción |
|---|---|
| Empeño | Entrega de prenda a cambio de dinero |
| Retiro | Recuperación de la prenda al pagar la deuda |
| Abono | Pago parcial de la deuda |
| Apertura | Apertura de nueva cuenta/caja |
| Cierre | Cierre de cuenta/caja |

#### Proceso ETL (Sincronización con SuperEfectivo)

1. Conexión autenticada a la API de SuperEfectivo.
2. Descarga de transacciones del período.
3. Detección de anomalías por comparación con patrones históricos.
4. Generación de alertas para transacciones fuera de parámetros normales.
5. Cálculo de niveles de riesgo por sucursal.
6. Registro en el log de ETL.

---

### 5.4 Flujos de Trabajo Principales

**Normalización de catálogo (ServiPáramo)**
```
1. Ejecutar ETL desde dashboard o configuración
2. Sistema sincroniza datos desde ERP SQL Server
3. Sistema genera embeddings para SKUs nuevos/modificados
4. Analista revisa duplicados detectados → decide fusionar o mantener
5. Analista revisa normalizaciones de familias → aprueba o corrige
6. Catálogo queda depurado y disponible para búsqueda semántica
```

**Gestión de alerta de anomalía (Joz)**
```
1. ETL sincroniza transacciones desde SuperEfectivo
2. Sistema detecta transacción fuera de parámetros
3. Se genera una alerta con severidad asignada
4. Analista revisa la alerta en el módulo de Alertas
5. Analista la marca como "revisada" o "descartada"
6. Si es relevante, el riesgo de la sucursal se actualiza
```

---

### 5.5 Casos de Uso Fuera de Alcance (versión actual)

- No existe gestión de usuarios desde interfaz (creación, edición, roles)
- No hay notificaciones automáticas (email, SMS, push) ante alertas críticas
- No hay integración bidireccional con el ERP (solo lectura en ServiPáramo)
- No hay exportación automática de reportes programados
- No hay historial de auditoría de acciones del usuario
- No hay diferenciación de permisos por rol

---

## 6. Especificación de APIs

### 6.1 Hub Backend — `localhost:8006/api/`

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| POST | `/api/login/` | No | Autentica usuario, retorna token |
| POST | `/api/logout/` | Token | Invalida el token activo |
| GET | `/api/health/` | No | Estado del servicio |
| GET | `/api/services/` | Token | Lista los servicios disponibles |

**Respuesta de login:**
```json
{
  "token": "9af3b2c...",
  "username": "admin"
}
```

### 6.2 ServiPáramo Backend — `localhost:8001/api/serviparamo/`

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

### 6.3 Joz Backend — `localhost:8003/api/joz/`

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

## 7. Modelos de Datos

### 7.1 Hub

No tiene modelos propios. Utiliza `django.contrib.auth.User` y `rest_framework.authtoken.Token` de Django/DRF.

### 7.2 ServiPáramo

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

(+ tablas equivalentes para pedidos y presupuestos)

ETLLog
├── id
├── tipo (ordenes/pedidos/presupuestos/skus)
├── estado (ok/error)
├── registros_procesados
├── fecha_inicio
└── fecha_fin
```

### 7.3 Joz

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

## 8. Autenticación y Seguridad

### 8.1 Mecanismo

Se usa autenticación por token de DRF (`rest_framework.authtoken`):

1. El usuario envía credenciales al Hub (`POST /api/login/`)
2. Django valida con `authenticate(username, password)`
3. Se crea o recupera el token (`Token.objects.get_or_create(user=user)`)
4. El token se almacena en `localStorage` del navegador
5. Cada petición subsiguiente incluye `Authorization: Token <token>`

### 8.2 Inyección del token (frontend)

```javascript
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Token ${token}`
  return config
})
```

### 8.3 AuthGuard

Cada microservicio frontend tiene un componente `AuthGuard` que verifica la validez del token al montar la ruta protegida. Si el token falla, redirige al Hub de autenticación.

### 8.4 Limitaciones actuales

| Aspecto | Estado actual | Mejora recomendada |
|---|---|---|
| Token storage | `localStorage` (vulnerable a XSS) | `httpOnly` cookies |
| Token expiration | Sin expiración (indefinido) | JWT con expiración + refresh token |
| RBAC | No implementado | Roles: admin, analista_catalogo, analista_riesgo |
| HTTPS | Solo via ngrok (desarrollo) | Certificado SSL en Nginx (producción) |
| Secrets management | Variables de entorno en `.env` | Vault o gestor de secretos |
| CORS | Configurado en Django | Restringir a dominios específicos |
| Rate limiting | No implementado | Nginx rate limiting en gateway |
| DB credentials | Un usuario por servicio | Correcto — mínimo privilegio |

---

## 9. Integración con Sistemas Externos

### 9.1 ERP SQL Server — ServiPáramo

```
Servidor: ts1.serviparamo.com.co:1433
Base de datos: PRUEBA
Driver: ODBC Driver 18 for SQL Server (msodbcsql18)
```

El backend de ServiPáramo usa `pyodbc` para conectarse al ERP de SQL Server, extraer datos crudos (SKUs, órdenes, pedidos) y sincronizarlos hacia PostgreSQL mediante el proceso ETL. El Dockerfile instala explícitamente el driver `msodbcsql18`.

### 9.2 API REST SuperEfectivo — Joz

```
Host: https://ia.elpenon.pa
Autenticación: Bearer token + Basic auth
```

Joz consume la API de SuperEfectivo para extraer transacciones financieras. El ETL se puede disparar manualmente desde el dashboard. Los datos se procesan en PostgreSQL para detección de anomalías.

---

## 10. Arquitectura de Software

### 10.1 Visión General

BarranquIA Hub sigue una **arquitectura de microservicios en monorepo**. Cada microservicio implementa el patrón **BFF (Backend for Frontend)**: el backend expone exactamente los endpoints que su propio frontend necesita.

```
┌─────────────────────────────────────────────────────────────┐
│                       USUARIO FINAL                         │
│                     (Navegador Web)                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 NGINX GATEWAY (puerto 9005)                  │
│            Reverse proxy — Host Bare-Metal                   │
└──────────┬──────────────────────────┬────────────────────────┘
           │                          │
           ▼                          ▼
   ┌──────────────┐           ┌──────────────────┐
   │     HUB      │           │   SERVIPARAMO    │
   │  Frontend    │           │   Frontend       │
   │   :5174      │           │    :9021         │
   └──────┬───────┘           └────────┬─────────┘
          │                            │
          ▼                            ▼
   ┌──────────────┐           ┌──────────────────┐
   │  HUB Backend │           │ SERVIPARAMO      │
   │    :8006     │           │ Backend  :8001   │
   └──────┬───────┘           └────────┬─────────┘
          │                            │
          ▼                            ▼
   ┌──────────────────────────────────────────────┐
   │         PostgreSQL 16 (puerto 5432)           │
   │     DB: barranquia_hub | serviparamo | joz    │
   └──────────────────────────────────────────────┘
                      │              │
           ┌──────────┘              └────────────┐
           ▼                                      ▼
  ┌──────────────────┐              ┌─────────────────────┐
  │  SQL Server ERP  │              │  API SuperEfectivo  │
  │ ts1.serviparamo  │              │  ia.elpenon.pa      │
  │ (pyodbc/ODBC)    │              │  (REST/Bearer)      │
  └──────────────────┘              └─────────────────────┘

           ┌──────────────────┐
           │      JOZ         │
           │  Frontend :9023  │
           └────────┬─────────┘
                    │
           ┌────────▼─────────┐
           │  JOZ Backend     │
           │    :8003         │
           └──────────────────┘
```

### 10.2 Flujo de Autenticación Cross-Service

El token generado en el Hub se reutiliza en los demás microservicios: cada frontend lo lee de `localStorage` y lo inyecta como header `Authorization: Token <token>` en cada petición.

```
Usuario       Hub Frontend     Hub Backend     Microservicio
   │               │                │             Frontend
   │  login        │                │                │
   │──────────────►│                │                │
   │               │ POST /login/   │                │
   │               │───────────────►│                │
   │               │  {token, user} │                │
   │               │◄───────────────│                │
   │               │ localStorage   │                │
   │               │ token=xxx      │                │
   │  clic servicio│                │                │
   │──────────────────────────────────────────────► │
   │               │  interceptor: Authorization: Token xxx
   │◄──────────────────────────────────────────────│
   │  acceso concedido                              │
```

### 10.3 Arquitectura de Datos

Cada microservicio tiene su propia base de datos PostgreSQL con usuario dedicado. No hay acceso cruzado entre bases de datos.

```
PostgreSQL 16
├── barranquia_hub    (usuario: barranquia)
│   └── authtoken_token, auth_user
├── serviparamo       (usuario: serviparamo)
│   ├── catalogo_skus
│   ├── catalogo_embeddings
│   ├── raw_categorias, raw_familias
│   ├── raw_ordenes_*, raw_pedidos_*
│   └── etl_log
└── joz               (usuario: joz)
    ├── transacciones
    ├── alertas
    ├── riesgos
    └── etl_log
```

### 10.4 Flujo ETL — ServiPáramo

```
SQL Server ERP (ts1.serviparamo.com.co)
        │  pyodbc (ODBC Driver 18)
        ▼
┌───────────────────────────────────┐
│  Extracción                       │
│  SELECT categorias, familias,     │
│  skus, ordenes, pedidos           │
└──────────────┬────────────────────┘
               ▼
┌───────────────────────────────────┐
│  Carga en Raw Tables              │
│  INSERT INTO raw_categorias, ...  │
└──────────────┬────────────────────┘
               ▼
┌───────────────────────────────────┐
│  Transformación + Embeddings      │
│  sentence-transformers.encode()   │
│  INSERT INTO catalogo_embeddings  │
└──────────────┬────────────────────┘
               ▼
┌───────────────────────────────────┐
│  Catálogo normalizado listo       │
│  para búsqueda semántica          │
└───────────────────────────────────┘
```

### 10.5 Flujo ETL — Joz

```
API SuperEfectivo (ia.elpenon.pa)
        │  HTTP REST (Bearer Token)
        ▼
┌───────────────────────────────────┐
│  Extracción de transacciones      │
│  GET /transacciones?periodo=...   │
└──────────────┬────────────────────┘
               ▼
┌───────────────────────────────────┐
│  Detección de anomalías           │
│  z-score vs patrones históricos   │
│  Umbral de desviación configurable│
└──────────────┬────────────────────┘
               ▼
┌───────────────────────────────────┐
│  Generación de alertas y riesgos  │
│  INSERT alertas (si anomalía)     │
│  UPDATE riesgos (por sucursal)    │
└───────────────────────────────────┘
```

### 10.6 Arquitectura Frontend

Todos los frontends siguen el mismo patrón estructural:

```
src/
├── main.jsx              # Entry point — monta RouterProvider
├── router/router.jsx     # createBrowserRouter con rutas anidadas
├── layouts/DashboardLayout  # Shell: sidebar + header + outlet
├── pages/                # Un componente por ruta
├── features/             # Componentes específicos de dominio
├── components/ui/        # Primitivos Radix UI wrapeados
├── services/
│   ├── api.js            # Axios instance con interceptors
│   └── *Service.js       # Métodos por recurso de API
├── store/useSessionStore.js  # Zustand: token de sesión
├── hooks/                # Custom React hooks
├── types/                # TypeScript interfaces/types
└── styles/globals.css    # Tailwind base + variables CSS
```

**Capa de servicios:**
```
Componente React
      │ useEffect / click handler
      ▼
Service Method (e.g. serviparamoService.js)
      │ api.get('/api/serviparamo/skus/', { params })
      ▼
Axios Instance (api.js)
      │ + Header: Authorization: Token xxx (interceptor)
      ▼
Backend REST API (Django)
      │ Response JSON
      ▼
Componente React (setState)
```

**Gestión de estado:** Zustand se usa exclusivamente para el token de sesión global. El resto del estado es local a cada componente con `useState`.

### 10.7 Diagrama de Secuencia — Búsqueda Semántica (ServiPáramo)

```
Usuario     Frontend       Backend        PostgreSQL      Modelo IA
   │            │               │               │              │
   │ "tornillo M5"              │               │              │
   │───────────►│               │               │              │
   │            │ GET /buscar/  │               │              │
   │            │───────────────►               │              │
   │            │               │ encode(texto) │              │
   │            │               │──────────────────────────────►
   │            │               │          vector[768]         │
   │            │               │◄──────────────────────────────
   │            │               │ cosine_similarity(           │
   │            │               │  vector, embeddings)         │
   │            │               │───────────────►              │
   │            │               │  TOP 10 SKUs  │              │
   │            │               │◄──────────────│              │
   │            │ [{sku, sim}]  │               │              │
   │            │◄──────────────│               │              │
   │ Resultados │               │               │              │
   │◄───────────│               │               │              │
```

### 10.8 Diagrama de Secuencia — Detección de Anomalías (Joz)

```
Manual/Cron   Joz Backend    SuperEfectivo API   PostgreSQL
     │              │                │                │
     │ POST /etl/   │                │                │
     │──────────────►               │                │
     │              │ GET /transacc. │                │
     │              │───────────────►                │
     │              │  [{transacc}]  │                │
     │              │◄───────────────                │
     │              │                │                │
     │              │  z-score vs histórico           │
     │              │  INSERT transacciones           │
     │              │────────────────────────────────►│
     │              │  INSERT alertas (si anomalía)   │
     │              │────────────────────────────────►│
     │              │  UPDATE riesgos (por sucursal)  │
     │              │────────────────────────────────►│
     │ {status: ok} │                │                │
     │◄─────────────│                │                │
```

### 10.9 Decisiones Arquitectónicas

| Decisión | Justificación |
|---|---|
| Monorepo con microservicios independientes | Desarrollo paralelo por empresa, deploy independiente, aislamiento de datos |
| Django + DRF para todos los backends | Consistencia tecnológica, ORM robusto, auth built-in |
| React + Vite para todos los frontends | Hot reload rápido, ecosistema moderno, TypeScript opcional |
| PostgreSQL aislado por servicio | Mínimo privilegio, evita acoplamiento de datos |
| Token DRF (no JWT) | Simplicidad, invalidación síncrona en servidor |
| Tailwind + Radix UI | Velocidad de desarrollo, accesibilidad out-of-the-box |
| Zustand para estado global | Mínima superficie, sin boilerplate de Redux |
| Docker multi-stage para frontends | Imágenes de producción livianas (solo Nginx + assets) |
| Nginx como API Gateway | Centraliza routing, facilita futuro SSL sin código adicional |

---

## 11. Infraestructura y Contenedores

### 11.1 Diagrama Docker Compose

```
docker network: ruta-ia-net (bridge)
┌──────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
│                                                          │
│  ┌────────────┐   ┌──────────────────┐                  │
│  │  postgres  │◄──│  hub-backend     │                  │
│  │  :5432     │◄──│  :8006 ← :8005   │                  │
│  │ alpine 16  │◄──│                  │                  │
│  │            │   │  joz-backend     │                  │
│  │  3 DBs     │◄──│  :8003           │                  │
│  │            │   └──────────────────┘                  │
│  │ Volume:    │                                          │
│  │ postgres_  │   ┌──────────────────┐                  │
│  │ data       │◄──│ serviparamo-     │                  │
│  └────────────┘   │ backend  :8001   │                  │
│                   │ (msodbcsql18)    │                  │
│                   └────────┬─────────┘                  │
│                            │                            │
│                   ┌────────▼─────────┐                  │
│                   │ serviparamo-     │                  │
│                   │ frontend :9021   │                  │
│                   │ (nginx)          │                  │
│                   └──────────────────┘                  │
│                                                          │
│  ┌──────────────────┐    ┌──────────────────┐           │
│  │ joz-frontend     │    │  Volume:         │           │
│  │ :9023 (nginx)    │    │  huggingface_    │           │
│  └──────────────────┘    │  cache           │           │
│                           └──────────────────┘          │
└──────────────────────────────────────────────────────────┘
```

### 11.2 Nginx Gateway (bare-metal)

```
Puerto 9005 (host)
├── /                   → Hub Frontend
├── /api/               → Hub Backend
├── /serviparamo        → ServiPáramo Frontend
├── /api/serviparamo/   → ServiPáramo Backend
├── /joz                → Joz Frontend
└── /api/joz/           → Joz Backend
```

### 11.3 Puertos y Mapeo de Servicios

| Servicio | Puerto Host | Puerto Contenedor | Protocolo |
|---|---|---|---|
| Nginx Gateway (host) | 9005 | — | HTTP |
| Hub Backend | 8006 | 8005 | HTTP (Gunicorn) |
| ServiPáramo Backend | 8001 | 8001 | HTTP (Gunicorn) |
| ServiPáramo Frontend | 9021 | 80 | HTTP (Nginx) |
| Joz Backend | 8003 | 8003 | HTTP (Gunicorn) |
| Joz Frontend | 9023 | 80 | HTTP (Nginx) |
| PostgreSQL | — | 5432 | TCP (interno) |

### 11.4 Build Docker Frontend (multi-stage)

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

### 11.5 Build Docker Backend

```dockerfile
FROM python:3.11-slim
RUN pip install -r requirements.txt
# ServiPáramo: + instalación de msodbcsql18 via apt

# entrypoint.sh:
# python manage.py migrate --noinput
# gunicorn core.wsgi:application --bind 0.0.0.0:PORT --workers 2
```

---

## 12. Configuración y Despliegue

### 12.1 Variables de Entorno Requeridas

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

# Joz
JOZ_DB_USER=joz
JOZ_DB_PASSWORD=...
JOZ_API_URL=https://ia.elpenon.pa
JOZ_API_USUARIO=SuperEfectivo
JOZ_API_PASSWORD=...
JOZ_API_TOKEN=...
```

### 12.2 Comandos de Gestión (Makefile)

```bash
make setup                # Build completo e inicio de servicios
make up                   # Iniciar todos los contenedores
make down                 # Detener y eliminar contenedores
make logs                 # Ver logs en tiempo real
make deploy-nginx         # Aplicar configuración de Nginx
make deploy-ngrok         # Configurar túnel HTTPS
make migrate-hub          # Migraciones del Hub
make migrate-serviparamo  # Migraciones de ServiPáramo
make etl                  # Disparar ETL de ServiPáramo
```

### 12.3 Configuración Regional

Todos los backends Django comparten:

```python
LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Bogota'
USE_I18N = True
USE_TZ = True
```

### 12.4 Ruta hacia Producción

| Configuración actual | Producción recomendada |
|---|---|
| Docker Compose en un host | Kubernetes o Docker Swarm |
| Gunicorn 2 workers | Gunicorn 4+ workers + autoscaling |
| Sin caché | Redis para respuestas frecuentes |
| Nginx bare-metal | Load balancer + SSL termination |
| Sin monitoreo | Prometheus + Grafana |
| ETL manual | Celery + Redis Beat para ETL programado |
| localStorage tokens | httpOnly cookies + refresh tokens |

---

## 13. Glosario

| Término | Definición |
|---|---|
| SKU | Stock Keeping Unit — código único que identifica un producto |
| ERP | Enterprise Resource Planning — sistema de gestión empresarial (SQL Server en ServiPáramo) |
| ETL | Extract, Transform, Load — proceso de sincronización de datos entre sistemas |
| Embedding | Representación vectorial de texto generada por IA para comparación semántica |
| Familia | Agrupación de SKUs del ERP por tipo de producto |
| Anomalía | Transacción financiera que se desvía del comportamiento esperado |
| Severidad | Nivel de urgencia de una alerta (alta / media / baja) |
| Sucursal | Punto físico de operación de la empresa Joz / SuperEfectivo |
| Token | Credencial de sesión que autoriza el acceso a los servicios protegidos |
| BFF | Backend for Frontend — patrón donde el backend sirve exactamente lo que su frontend necesita |
| RBAC | Role-Based Access Control — control de acceso basado en roles de usuario |
| Hub | Servicio central de autenticación y descubrimiento de servicios de la plataforma |
