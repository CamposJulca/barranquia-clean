# Arquitectura de Software — BarranquIA Hub
**Versión:** 1.0
**Fecha:** 2026-03-14

---

## 1. Estilo Arquitectónico

BarranquIA Hub adopta un estilo de **Micro-Frontend + Microservicios** con un hub de autenticación centralizado.

Cada módulo de negocio (Avantika, Joz, ServiPáramo) es una aplicación independiente —frontend y backend— que se integra al ecosistema mediante:
1. Autenticación compartida vía token (Hub como Identity Provider)
2. Enrutamiento por prefijo de URL (Nginx como API Gateway)
3. Convención de puertos por módulo

Este patrón permite que equipos independientes desarrollen, desplieguen y escalen cada módulo sin afectar a los demás.

---

## 2. Vista de Contexto (C4 — Nivel 1)

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET / LAN                           │
│                                                                 │
│   Usuarios                                                      │
│      │                                                          │
│      │  HTTPS (ngrok) / HTTP (LAN)                             │
│      ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  BarranquIA Hub                          │   │
│  │  (Plataforma centralizada de servicios IA)               │   │
│  │                                                          │   │
│  │  • Autenticación unificada                               │   │
│  │  • Catálogo de servicios                                 │   │
│  │  • Enrutamiento a módulos                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │              │              │              │        │
│       Avantika          Joz        ServiPáramo      Power BI   │
│    (Inventario)      (Alertas)    (Catálogo)         (BI)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Vista de Contenedores (C4 — Nivel 2)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  BarranquIA Hub — Sistema completo                                           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Nginx  :9005  (API Gateway + Proxy Inverso + Servidor estático)    │    │
│  │                                                                     │    │
│  │  /         →  React SPA (archivos estáticos en disco)               │    │
│  │  /api/*    →  Django/Gunicorn :8005                                 │    │
│  │  /avantika → FastAPI :9001  (planificado)                           │    │
│  │  /joz/*    → FastAPI :9003  (planificado)                           │    │
│  │  /serviparamo/* → FastAPI :9002  (planificado)                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│         │               │                                                    │
│         ▼               ▼                                                    │
│  ┌─────────────┐  ┌─────────────────────────────────────────────────────┐   │
│  │  Hub React  │  │  Django REST Framework (Hub Backend)  :8005         │   │
│  │  SPA        │  │                                                     │   │
│  │  React 18   │  │  • POST /api/login/      → genera token             │   │
│  │  Vite       │  │  • POST /api/logout/     → invalida token           │   │
│  │  Axios      │  │  • GET  /api/health/     → health check             │   │
│  │             │  │  • GET  /api/services/   → catálogo de módulos      │   │
│  │  Páginas:   │  │  • GET  /api/verify-token/ → valida sesión          │   │
│  │  - Login    │  │                                                     │   │
│  │  - Servicios│  │  ORM: Django ORM                                    │   │
│  └─────────────┘  │  Auth: DRF Token Authentication                    │   │
│                   └────────────────────────┬────────────────────────────┘   │
│                                            │                                │
│                                            ▼                                │
│                                   ┌──────────────┐                          │
│                                   │   SQLite3    │                          │
│                                   │   db.sqlite3 │                          │
│                                   │              │                          │
│                                   │  • authtoken │                          │
│                                   │  • auth_user │                          │
│                                   └──────────────┘                          │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Módulo Avantika  (App independiente)                                 │  │
│  │                                                                       │  │
│  │  ┌───────────────────────────────────┐  ┌─────────────────────────┐  │  │
│  │  │  Avantika Frontend  :5175         │  │  Avantika Backend       │  │  │
│  │  │  React 19 + TypeScript            │  │  FastAPI  :9001         │  │  │
│  │  │  Tailwind, Zustand, Recharts      │  │  (PLANIFICADO)          │  │  │
│  │  │                                   │  │                         │  │  │
│  │  │  Páginas:                         │  │  • SKU CRUD             │  │  │
│  │  │  - Vista General (dashboard)      │  │  • Forecast engine      │  │  │
│  │  │  - SKUs (inventario)              │  │  • Alertas              │  │  │
│  │  │  - Forecast (pronóstico)          │  │                         │  │  │
│  │  │  - Alertas (Joz stub)             │  │  DB: PostgreSQL / SQLite│  │  │
│  │  │  - Catálogo (ServiPáramo stub)    │  │  (planificado)          │  │  │
│  │  └───────────────────────────────────┘  └─────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Flujo de Red y Autenticación

```
Usuario
  │
  │  1. GET https://barranquia-hub.ngrok.io
  ▼
ngrok tunnel
  │
  │  HTTP → localhost:9005
  ▼
Nginx :9005
  │
  ├── Ruta: /  (o /static/)
  │     └── Sirve archivos estáticos React SPA
  │           (hub/backend/staticfiles/frontend/)
  │
  ├── Ruta: /api/*
  │     └── proxy → Django/Gunicorn :8005
  │           │
  │           ├── POST /api/login/
  │           │     → valida credenciales
  │           │     → crea/retorna DRF Token
  │           │     → cliente guarda en localStorage
  │           │
  │           └── GET /api/services/
  │                 → retorna lista de módulos activos
  │                 → requiere token en Authorization header
  │
  ├── Ruta: /avantika/*
  │     └── proxy → FastAPI :9001 (planificado)
  │
  └── Ruta: /joz/*, /serviparamo/*
        └── proxy → FastAPI :9002, :9003 (planificado)
```

### Flujo de Autenticación entre Hub y Módulo Hijo

```
[Hub - React]           [Nginx :9005]          [Django :8005]
     │                        │                       │
     │── POST /api/login/ ───►│──────────────────────►│
     │                        │                       │ valida credentials
     │◄──── { token, user } ──│◄──────────────────────│
     │                        │                       │
     │  localStorage.setItem('token', token)          │
     │                        │                       │
     │  [usuario clic en Avantika]                    │
     │                        │
[Avantika - React]            │
     │                        │
     │  localStorage.getItem('token')                 │
     │── GET /api/verify-token/ ──────────────────────►│
     │                        │                       │ válido: 200
     │◄───────── 200 ─────────│◄──────────────────────│
     │                        │
     │  renderiza app completa
```

---

## 5. Vista de Componentes — Hub Frontend

```
App.jsx
  │
  ├── (sin token) → Login.jsx
  │                   │
  │                   └── POST /api/login/
  │                         → token guardado
  │                         → handleLogin(token, username)
  │
  └── (con token) → Panel de Servicios
                      │
                      ├── Header (username, health indicator, logout)
                      │
                      └── ServiceGrid
                            └── ServiceCard (×N)
                                  • ícono, nombre, descripción
                                  • color, estado
                                  • link → URL del módulo
```

---

## 6. Vista de Componentes — Avantika Frontend

```
main.tsx
  └── RouterProvider (react-router-dom v7)
        └── AuthGuard
              │── GET /api/verify-token/ → válido: renderiza
              │                          → inválido: redirect Hub
              └── DashboardLayout
                    ├── Sidebar (navegación por módulo)
                    ├── Header (búsqueda, notificaciones)
                    └── <Outlet> (contenido de ruta activa)
                          │
                          ├── /avantika     → VistaGeneral.jsx
                          │     ├── StatCard ×4  (KPIs)
                          │     ├── ForecastChart.tsx
                          │     ├── InventoryTable (resumen)
                          │     ├── AlertsPanel
                          │     └── CategoryBars
                          │
                          ├── /avantika/skus → Skus.jsx
                          │     └── SkusTable.tsx
                          │           └── filas: SKU[]
                          │                 badge: crítico|bajo|normal
                          │
                          ├── /avantika/forecast → Forecast.jsx
                          │     ├── ModelMetrics ×4
                          │     ├── ForecastChart.tsx
                          │     │     └── Recharts AreaChart
                          │     │           • prediccion (azul)
                          │     │           • demandaReal (verde)
                          │     │           • banda confianza (relleno)
                          │     └── PerformanceTable (MAE, RMSE, R²)
                          │
                          ├── /joz/alertas   → Alertas.jsx (stub)
                          └── /serviparamo/catalogo → Catalogo.jsx (stub)
```

---

## 7. Patrón de Capas — Backend Hub

```
┌─────────────────────────────────┐
│          Cliente HTTP           │  (React, curl, etc.)
└────────────────┬────────────────┘
                 │ HTTP/JSON
┌────────────────▼────────────────┐
│         Nginx (Proxy)           │  Puerto 9005
└────────────────┬────────────────┘
                 │ HTTP interno
┌────────────────▼────────────────┐
│      Capa de Presentación       │  Django REST Framework
│      (api/views.py)             │  Endpoints: login, logout,
│                                 │  health, services, verify-token
└────────────────┬────────────────┘
                 │
┌────────────────▼────────────────┐
│       Capa de Serialización     │  api/serializers.py
│                                 │  Validación de entrada/salida
└────────────────┬────────────────┘
                 │
┌────────────────▼────────────────┐
│       Capa de Negocio           │  DRF Token Auth
│                                 │  Validación de credenciales
│                                 │  Registro de servicios
└────────────────┬────────────────┘
                 │
┌────────────────▼────────────────┐
│       Capa de Datos             │  Django ORM + SQLite3
│                                 │  Tablas: auth_user, authtoken_token
└─────────────────────────────────┘
```

---

## 8. Patrón de Capas — Avantika Frontend

```
┌─────────────────────────────────┐
│       Capa de Presentación      │
│  pages/ + layouts/ + components/│  React 19, Tailwind CSS
│  StatCard, ForecastChart,       │
│  SkusTable, Sidebar, Header     │
└────────────────┬────────────────┘
                 │ props / hooks
┌────────────────▼────────────────┐
│       Capa de Estado            │  Zustand (store/)
│                                 │  localStorage (token de sesión)
│       Capa de Lógica            │  hooks/ (useFetch, etc.)
└────────────────┬────────────────┘
                 │ llamadas async
┌────────────────▼────────────────┐
│       Capa de Servicios         │  services/api.js
│                                 │  Axios instance
│                                 │  Interceptor: inyecta token
└────────────────┬────────────────┘
                 │ HTTP/JSON
┌────────────────▼────────────────┐
│       Backend / Mock Data       │  FastAPI :9001 (planificado)
│                                 │  mock/skus.json (actual)
│                                 │  mock/forecast.json (actual)
└─────────────────────────────────┘
```

---

## 9. Estructura de Datos de Dominio

### Modelo de Servicio (Hub Registry)
```
Service
  ├── id          : string (slug único)
  ├── name        : string
  ├── description : string
  ├── icon        : string (emoji)
  ├── color       : string (hex)
  ├── path        : string (prefijo de ruta)
  └── active      : boolean
```

### Modelo SKU (Avantika)
```
SKU
  ├── id                  : string
  ├── nombre              : string
  ├── categoria           : string
  ├── stock               : number
  ├── precio              : number (COP)
  ├── demandaPromedio     : number (unidades/día)
  ├── nivelReorden        : number
  ├── proveedor           : string
  └── ultimaActualizacion : date
```

### Modelo Forecast (Avantika)
```
ForecastDataPoint
  ├── fecha           : date
  ├── demandaReal     : number | null (pasado)
  ├── prediccion      : number
  ├── limiteInferior  : number
  └── limiteSuperior  : number
```

---

## 10. Decisiones Arquitectónicas

### DA-01: Hub como Identity Provider centralizado
**Decisión:** El hub Django gestiona todos los tokens. Los módulos hijos verifican tokens contra el hub.
**Razón:** Evitar duplicar lógica de autenticación en cada microservicio. Un solo punto de invalidación de sesiones.
**Tradeoff:** El hub se convierte en un punto de falla único para autenticación. Mitigado por SystemD con reinicio automático.

### DA-02: Nginx como API Gateway
**Decisión:** Nginx enruta por prefijo de URL a los microservicios en puertos locales.
**Razón:** Exponer un solo puerto al exterior, ocultar la topología interna, centralizar SSL termination.
**Tradeoff:** Nginx es un componente adicional a mantener.

### DA-03: Micro-Frontend por módulo
**Decisión:** Cada módulo (Avantika, Joz, ServiPáramo) es una SPA independiente.
**Razón:** Equipos pueden desarrollar e iterar de forma autónoma sin acoplamiento.
**Tradeoff:** Múltiples aplicaciones que arrancar en desarrollo; posible inconsistencia visual entre módulos.

### DA-04: SQLite en producción (Hub)
**Decisión:** El hub usa SQLite para almacenar usuarios y tokens.
**Razón:** El hub no maneja datos de negocio complejos; SQLite es suficiente para autenticación con baja concurrencia.
**Tradeoff:** No apto para múltiples instancias simultáneas del backend. Migrar a PostgreSQL al escalar.

### DA-05: Mock data en Avantika (estado actual)
**Decisión:** El frontend de Avantika usa datos JSON estáticos hasta que el backend FastAPI esté disponible.
**Razón:** Permite validar la UI y el flujo de usuario sin bloquear el avance por la API.
**Tradeoff:** Los datos no reflejan estado real del inventario.

---

## 11. Topología de Despliegue

```
Servidor físico: 192.168.0.101
├── OS: Linux Ubuntu
├── Usuario de servicio: desarrollo
│
├── Proceso: Nginx :9005
│     └── Configuración: hub/nginx.conf
│
├── Proceso: Gunicorn :8005 (gestionado por SystemD)
│     ├── Workers: 3
│     ├── Timeout: 120s
│     └── App: hub/backend/barranquia/wsgi.py
│
├── Proceso: Vite dev server :5175 (Avantika, desarrollo)
│
└── Proceso: ngrok → :9005
      └── Dominio: barranquia-hub.ngrok.io

Almacenamiento:
├── hub/backend/db.sqlite3          (base de datos)
├── hub/backend/staticfiles/        (assets compilados)
└── hub/venv/                       (entorno Python)
```

---

## 12. Convención de Puertos

| Puerto | Servicio | Estado |
|---|---|---|
| 9005 | Nginx (entrada pública) | Activo |
| 8005 | Django/Gunicorn (Hub API) | Activo |
| 5174 | Vite Dev — Hub Frontend | Desarrollo |
| 5175 | Vite Dev — Avantika Frontend | Desarrollo |
| 9001 | FastAPI — Avantika Backend | Planificado |
| 9002 | FastAPI — ServiPáramo Backend | Planificado |
| 9003 | FastAPI — Joz Backend | Planificado |

---

## 13. Diagrama de Secuencia — Carga de Avantika

```
Browser          Nginx           Django           Avantika
   │               │               │                │
   │─GET /──────►  │               │                │
   │               │  static file  │                │
   │◄──── HTML ────│               │                │
   │               │               │                │
   │ (React SPA carga, AuthGuard se ejecuta)        │
   │               │               │                │
   │─GET /api/verify-token/──────► │                │
   │               │               │ válido: 200    │
   │◄──── 200 ─────│◄──────────────│                │
   │               │               │                │
   │ (renderiza DashboardLayout + VistaGeneral)      │
   │               │               │                │
   │ (carga datos mock de /mock/skus.json)           │
   │ (carga datos mock de /mock/forecast.json)       │
   │               │               │                │
   │ [FUTURO] ─GET /avantika/api/skus/──────────────►│
   │◄─────────────────────────────────── skus JSON ─│
```

---

## 14. Principios de Diseño Aplicados

| Principio | Aplicación |
|---|---|
| **Separación de responsabilidades** | Hub = autenticación; módulos = lógica de negocio |
| **Bajo acoplamiento** | Módulos hijos solo dependen del endpoint `/api/verify-token/` del Hub |
| **Alta cohesión** | Cada módulo agrupa su propio frontend y backend |
| **Convention over configuration** | Puertos asignados por convención (900X), prefijos de ruta por nombre de módulo |
| **Fail fast** | AuthGuard redirige inmediatamente si el token no es válido |
| **Stateless API** | Cada request del backend incluye el token; no se mantiene estado de sesión en servidor |
