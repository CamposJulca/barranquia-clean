# ServiPáramo — Documentación Técnica

> Sprint 1 completado. Módulo integrado al monorepo BarranquIA Hub.

---

## 1. Arquitectura general

```
┌────────────────────────────────────────────────────────────────┐
│                  ERP SQL Server (externo)                       │
│           ts1.serviparamo.com.co:1433  DB=PRUEBA               │
└───────────────────────────┬────────────────────────────────────┘
                            │ ODBC Driver 18 · pyodbc
                            ▼ ETL (full-refresh)
┌────────────────────────────────────────────────────────────────┐
│              PostgreSQL (barranquia_hub)                        │
│  serviparamo_catalogosku        127 090 SKUs                   │
│  serviparamo_rawcategoria       staging categorías ERP         │
│  serviparamo_rawfamilia         staging familias ERP           │
│  serviparamo_raworden*          staging órdenes de compra      │
│  serviparamo_rawpedido*         staging pedidos                │
│  serviparamo_rawpresupuesto*    staging presupuestos           │
│  serviparamo_rawkardex          staging movimientos inventario │
│  serviparamo_etllog             historial de ejecuciones ETL   │
└───────────────────────────┬────────────────────────────────────┘
                            │ Django ORM
                            ▼
┌────────────────────────────────────────────────────────────────┐
│           Django REST Framework (hub backend)                   │
│           gunicorn · 127.0.0.1:8005 · 3 workers               │
│                                                                 │
│  /api/serviparamo/skus/            lista paginada de SKUs      │
│  /api/serviparamo/skus/<id>/       detalle de SKU              │
│  /api/serviparamo/categorias/      catálogo ERP                │
│  /api/serviparamo/familias/        familias normalizadas        │
│  /api/serviparamo/ordenes/         órdenes de compra           │
│  /api/serviparamo/pedidos/         pedidos de compra           │
│  /api/serviparamo/buscar/          búsqueda semántica          │
│  /api/serviparamo/duplicados/      grupos de duplicados IA     │
│  /api/serviparamo/aprobar/         aprobación de SKU           │
│  /api/serviparamo/fusionar/        fusión de familias          │
│  /api/serviparamo/etl/status/      estado del ETL              │
│  /api/serviparamo/etl/run/         disparo manual del ETL      │
│  /api/serviparamo/stats/           KPIs del módulo             │
└───────────────────────────┬────────────────────────────────────┘
                            │ HTTP proxy
                            ▼
┌────────────────────────────────────────────────────────────────┐
│     Nginx (systemd · puerto 9005)                              │
│                                                                 │
│  /api/          → 127.0.0.1:8005  (gunicorn)                  │
│  /serviparamo/  → dist/ estáticos  (React SPA)                │
│  /static/       → staticfiles/    (Django admin, DRF)          │
│  /              → staticfiles/frontend/  (Hub SPA)             │
└───────────────────────────┬────────────────────────────────────┘
                            │ ngrok tunnel
                            ▼
              https://barranquia-hub.ngrok.io
```

---

## 2. Base de datos

### 2.1 Tablas creadas (migración 0003_staging_tables)

| Tabla                             | Filas actuales | Descripción                          |
|-----------------------------------|---------------|--------------------------------------|
| `serviparamo_catalogosku`         | 127 090        | SKUs del ERP con embeddings 384-dim  |
| `serviparamo_rawcategoria`        | 0*             | Categorías (tabla `inv_ina01_categoria`) |
| `serviparamo_rawfamilia`          | 0*             | Familias (tabla ERP)                 |
| `serviparamo_raworden_encabezado` | 0*             | Encabezado órdenes de compra         |
| `serviparamo_raworden_detalle`    | 0*             | Ítems por orden                      |
| `serviparamo_rawpedido_encabezado`| 0*             | Encabezado pedidos                   |
| `serviparamo_rawpedido_detalle`   | 0*             | Ítems por pedido                     |
| `serviparamo_rawpresupuesto_det`  | 0*             | Detalle presupuestos                 |
| `serviparamo_rawpresupuesto_res`  | 0*             | Resumen presupuestos                 |
| `serviparamo_rawkardex`           | 0*             | Movimientos de inventario (kardex)   |
| `serviparamo_etllog`              | —              | Historial de ejecuciones ETL         |

\* Pendientes de ejecutar ETL para estas tablas. Confirmar nombres exactos de columnas con James (TI ServiPáramo).

### 2.2 Modelo principal: CatalogoSKU

```python
class CatalogoSKU(models.Model):
    codigo            = CharField(max_length=100, unique=True)
    nombre            = CharField(max_length=500)
    familia_raw       = CharField(max_length=200)   # familia tal como viene del ERP
    familia_normalizada = CharField(max_length=200) # familia corregida por IA
    descripcion       = TextField(blank=True)
    unidad_medida     = CharField(max_length=50)
    precio_referencia = DecimalField(...)
    es_duplicado      = BooleanField(default=False)
    aprobado          = BooleanField(default=False)
    grupo_duplicado   = IntegerField(null=True)      # índice K-Means cluster
    embedding         = ArrayField(FloatField(), size=384, null=True)  # all-MiniLM-L6-v2
    raw_data          = JSONField(default=dict)       # fila ERP completa
```

### 2.3 Tablas de staging (patrón común)

```python
class RawCategoria(models.Model):
    categoria_id   = CharField(max_length=50, unique=True)
    nombre         = CharField(max_length=300)
    codigo         = CharField(max_length=100, blank=True)
    activo         = BooleanField(default=True)
    raw_data       = JSONField(default=dict)  # fila ERP completa sin parsear
    fecha_sync     = DateTimeField(auto_now=True)
```

El `raw_data` almacena la fila ERP completa en JSON, lo que permite agregar nuevos campos del ERP sin migraciones adicionales.

---

## 3. ETL

### 3.1 Diseño

- **Estrategia**: full-refresh por tabla (truncate + insert).
- **Ejecución**: manual (botón en UI) o vía `make etl`. Corre en un thread secundario para no bloquear la API.
- **Conexión ERP**: `pyodbc` con ODBC Driver 18 for SQL Server.

### 3.2 Configuración de conexión

```
SERVER=ts1.serviparamo.com.co,1433
DATABASE=PRUEBA
UID=Test20Indicadores26
PWD=<variable SERVIPARAMO_ERP_PASS en .env>
Encrypt=yes
TrustServerCertificate=yes
```

### 3.3 Tablas ERP mapeadas

| Tabla Django         | Tabla ERP                      | Estado    |
|----------------------|--------------------------------|-----------|
| `CatalogoSKU`        | `inv_ina01`                    | ✅ Activo  |
| `RawCategoria`       | `inv_ina01_categoria`          | ⏳ Pendiente confirmar columnas |
| `RawFamilia`         | pendiente confirmar con James  | ⏳         |
| `RawOrden*`          | pendiente confirmar con James  | ⏳         |
| `RawPedido*`         | pendiente confirmar con James  | ⏳         |
| `RawPresupuesto*`    | pendiente confirmar con James  | ⏳         |
| `RawKardex`          | pendiente confirmar con James  | ⏳         |

### 3.4 Comandos ETL

```bash
# Via make (Docker)
make etl                         # todas las tablas
make etl-skus                    # solo CatalogoSKU
make etl-catalogo                # RawCategoria + RawFamilia

# Directo en bare-metal
cd backend/hub
python serviparamo/etl.py
python serviparamo/etl.py --tablas CatalogoSKU RawCategoria
```

---

## 4. Detección de duplicados (IA)

### 4.1 Pipeline

```
Nombre SKU
    │
    ▼  sentence-transformers (all-MiniLM-L6-v2)
Embedding 384-dim
    │
    ▼  K-Means clustering (k dinámico, ≈ n/150 grupos)
Grupo asignado
    │
    ▼  Cosine similarity entre pares del mismo grupo
    │  threshold: 0.92
    ▼
SKUs marcados como es_duplicado=True
```

### 4.2 Estado actual

| Métrica              | Valor          |
|----------------------|----------------|
| SKUs con embedding   | 127 090 (100%) |
| Grupos K-Means       | 848            |
| SKUs duplicados      | 114 647 (90%)  |
| Grupos de duplicados | 16 454         |
| SKUs aprobados       | 0              |

---

## 5. API REST

### Endpoints principales

```
GET  /api/serviparamo/stats/
     → KPIs del módulo (total_items, duplicados, grupos, etc.)

GET  /api/serviparamo/skus/?page=1&page_size=50&q=bomba&familia=Electricos
     → Lista paginada de SKUs con filtros

GET  /api/serviparamo/skus/<id>/
     → Detalle completo de un SKU

GET  /api/serviparamo/duplicados/?page=1&familia=Electricos
     → Grupos de duplicados con sus SKUs

POST /api/serviparamo/aprobar/
     body: {"sku_id": 1, "grupo_id": 42, "familia_normalizada": "Eléctricos"}
     → Aprueba un SKU como maestro del grupo

GET  /api/serviparamo/ordenes/?page=1&page_size=20
GET  /api/serviparamo/pedidos/?page=1&page_size=20

POST /api/serviparamo/etl/run/
     body: {"tablas": ["CatalogoSKU"]}  (null = todas)
     → Dispara ETL en background thread

GET  /api/serviparamo/etl/status/
     → Estado de última ejecución por tabla
```

---

## 6. Frontend React

### 6.1 Stack

| Tecnología        | Versión | Uso                             |
|-------------------|---------|---------------------------------|
| React             | 19      | UI                              |
| Vite              | 5       | Bundler, dev server             |
| TypeScript        | 5       | Tipado estático                 |
| Tailwind CSS      | 3       | Estilos                         |
| Radix UI          | —       | Componentes accesibles          |
| Recharts          | —       | Gráficas                        |
| Zustand           | —       | Estado global                   |
| React Router      | 6       | Navegación SPA                  |
| Axios             | —       | HTTP client                     |

### 6.2 Configuración de rutas

El frontend se despliega bajo el sub-path `/serviparamo/`. Esto requiere:

```javascript
// vite.config.js
export default defineConfig({
  base: '/serviparamo/',        // todos los assets generados usan este prefijo
  server: {
    proxy: { '/api': 'http://localhost:8005' }  // solo en dev
  }
})

// router.jsx
createBrowserRouter([...], { basename: '/serviparamo' })
```

### 6.3 Páginas

| Ruta                    | Componente            | Datos                          |
|-------------------------|-----------------------|--------------------------------|
| `/serviparamo/`         | `Dashboard.tsx`       | `GET /api/serviparamo/stats/`  |
| `/serviparamo/catalog`  | `CatalogManager.tsx`  | `GET /api/serviparamo/skus/`   |
| `/serviparamo/duplicate`| `DuplicateDetection.tsx` | `GET /api/serviparamo/duplicados/` |
| `/serviparamo/purchases`| `PurchasesAnalytics.tsx` | `GET /api/serviparamo/ordenes/` |
| `/serviparamo/settings` | `Settings.tsx`        | ETL status + run               |

### 6.4 Build y despliegue

```bash
# Build de producción
cd frontend/serviparamo
npm run build
# → genera dist/ con base '/serviparamo/'

# Copiar dist al servidor de archivos estáticos (bare-metal)
# Nginx sirve alias /home/desarrollo/barranquIA-clean/frontend/serviparamo/dist/
```

---

## 7. Infraestructura de despliegue

### 7.1 Topología actual (bare-metal + Docker legacy)

```
Puerto 9005 — systemd nginx (producción)
  ├── /api/         → gunicorn 127.0.0.1:8005 (barranquia-hub.service)
  ├── /serviparamo/ → dist/ estáticos
  └── /static/      → staticfiles/

Puerto 9006 — Docker nginx (barranquia-hub legacy)
  ├── /api/         → django_backend:8000 (contenedor legacy)
  └── /serviparamo/ → frontend_serviparamo:80 (contenedor con dist nuevo)

Puerto 8005 — Gunicorn (systemd barranquia-hub.service)
  └── Django + ServiPáramo API (código nuevo)
```

### 7.2 Servicios systemd

```bash
# Backend Django
systemctl status barranquia-hub       # gunicorn en 127.0.0.1:8005
systemctl restart barranquia-hub      # restart completo
kill -HUP <PID master>               # reload sin downtime

# Ngrok (pendiente activar)
systemctl status barranquia-ngrok     # túnel → barranquia-hub.ngrok.io
```

Archivos de configuración:

| Archivo systemd                                   | Descripción                  |
|---------------------------------------------------|------------------------------|
| `/etc/systemd/system/barranquia-hub.service`      | gunicorn Django              |
| `/etc/systemd/system/barranquia-ngrok.service`    | ngrok tunnel (instalar con `sudo bash scripts/deploy-ngrok.sh`) |

### 7.3 Configuración nginx

| Archivo                                            | Descripción                     |
|----------------------------------------------------|---------------------------------|
| `/etc/nginx/sites-enabled/barranquia-hub`          | Config activa en producción     |
| `infra/nginx/barranquia-hub.conf`                  | Fuente versionada (aplicar con `sudo bash scripts/deploy-nginx.sh`) |
| `infra/nginx/docker.conf`                          | Config para despliegue Docker   |

### 7.4 Docker Compose

```bash
make setup          # primer arranque (build + up)
make up             # levantar servicios
make down           # detener
make rebuild        # rebuild sin caché
make logs           # logs en vivo
```

Servicios Docker:

| Servicio              | Imagen                     | Puerto  |
|-----------------------|----------------------------|---------|
| `postgres`            | postgres:16-alpine         | 5432    |
| `hub-backend`         | Dockerfile.backend         | 8005    |
| `serviparamo-frontend`| Dockerfile.frontend        | 80      |
| `nginx`               | nginx:alpine               | 9005    |

---

## 8. Variables de entorno (.env)

```env
# PostgreSQL
DB_NAME=barranquia_hub
DB_USER=barranquia
DB_PASSWORD=<contraseña>
DB_HOST=postgres        # "postgres" en Docker, "localhost" en bare-metal

# Django
SECRET_KEY=<clave única por entorno>
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,barranquia-hub.ngrok.io,192.168.0.101

# ERP ServiPáramo
SERVIPARAMO_ERP_HOST=ts1.serviparamo.com.co
SERVIPARAMO_ERP_PORT=1433
SERVIPARAMO_ERP_DB=PRUEBA
SERVIPARAMO_ERP_PASS=<contraseña ERP>
```

---

## 9. Operaciones de mantenimiento

### Recargar backend sin downtime

```bash
# Encontrar PID master de gunicorn
pgrep -a -f "gunicorn barranquia.wsgi" | head -1

# Enviar SIGHUP (graceful reload)
kill -HUP <PID>

# O con make
make reload-backend
```

### Rebuild frontend y publicar

```bash
cd frontend/serviparamo
npm run build

# Luego recargar nginx (los archivos dist/ son servidos directamente por nginx)
sudo systemctl reload nginx
# o:
sudo bash scripts/deploy-nginx.sh
```

### Activar ngrok

1. Obtener authtoken válido en https://dashboard.ngrok.com/get-started/your-authtoken
2. `ngrok config add-authtoken <nuevo-token>`
3. `sudo bash scripts/deploy-ngrok.sh`

El dominio `barranquia-hub.ngrok.io` debe estar reservado en la cuenta ngrok.

---

## 10. Pendientes Sprint 2

- [ ] Confirmar nombres de columnas ERP con James (TI ServiPáramo) para tablas de órdenes, pedidos, presupuestos y kardex
- [ ] Ejecutar ETL para las tablas de staging pendientes
- [ ] Implementar gráficas de compras en `PurchasesAnalytics.tsx` (datos vacíos hasta ETL)
- [ ] Configurar ngrok con authtoken válido y habilitar servicio systemd
- [ ] Aplicar config nginx producción: `sudo bash scripts/deploy-nginx.sh`
- [ ] Configurar ETL programado (cron o celery beat) para sincronización automática
