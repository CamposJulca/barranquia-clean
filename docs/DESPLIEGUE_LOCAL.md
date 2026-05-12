# BarranquIA — Guía de Despliegue Local y Pruebas

## Tabla de contenidos

1. [Prerequisitos](#1-prerequisitos)
2. [Clonar el repositorio](#2-clonar-el-repositorio)
3. [Configurar variables de entorno](#3-configurar-variables-de-entorno)
4. [Levantar los contenedores](#4-levantar-los-contenedores)
5. [Cargar datos de demostración](#5-cargar-datos-de-demostración)
6. [Verificar el despliegue](#6-verificar-el-despliegue)
7. [Probar las APIs](#7-probar-las-apis)
8. [Probar los frontends](#8-probar-los-frontends)
9. [Comandos útiles](#9-comandos-útiles)
10. [Arquitectura del proyecto](#10-arquitectura-del-proyecto)
11. [Solución de problemas](#11-solución-de-problemas)

---

## 1. Prerequisitos

Instala las siguientes herramientas antes de comenzar:

| Herramienta | Versión mínima | Descarga |
|---|---|---|
| Git | 2.x | https://git-scm.com/ |
| Docker Desktop | 4.x | https://www.docker.com/products/docker-desktop/ |

> **Docker Desktop** incluye Docker Compose. No es necesario instalar Compose por separado.

Verifica que todo esté instalado:

```bash
git --version
docker --version
docker compose version
```

---

## 2. Clonar el repositorio

```bash
git clone https://github.com/<tu-usuario>/barranquIA-clean.git
cd barranquIA-clean
```

---

## 3. Configurar variables de entorno

El archivo `.env` no está versionado (contiene credenciales). Créalo manualmente en la **raíz del proyecto**:

```bash
# Desde la raíz del proyecto
touch .env
```

Pega el siguiente contenido en `.env`:

```env
# ── PostgreSQL ────────────────────────────────────────────────────────────────
POSTGRES_DB=barranquia_hub
POSTGRES_USER=barranquia
POSTGRES_PASSWORD=Barranquia2024Hub

DB_NAME=barranquia_hub
DB_USER=barranquia
DB_PASSWORD=Barranquia2024Hub
DB_HOST=postgres
DB_PORT=5432

# ── Django Hub ────────────────────────────────────────────────────────────────
SECRET_KEY=barranquia-hub-secret-key-change-in-production-2024
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://localhost,http://127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1

# ── Gunicorn ──────────────────────────────────────────────────────────────────
GUNICORN_WORKERS=2
GUNICORN_TIMEOUT=120

# ── ERP ServiPáramo (SQL Server externo) ─────────────────────────────────────
SERVIPARAMO_ERP_HOST=ts1.serviparamo.com.co
SERVIPARAMO_ERP_PORT=1433
SERVIPARAMO_ERP_DB=PRUEBA
SERVIPARAMO_ERP_USER=Test20Indicadores26
SERVIPARAMO_ERP_PASS=JspTa2i4axlm60

# ── ServiPáramo Backend ───────────────────────────────────────────────────────
SERVIPARAMO_DB_USER=serviparamo
SERVIPARAMO_DB_PASSWORD=serviparamo2024
SERVIPARAMO_SECRET_KEY=serviparamo-secret-key-local-2024

# ── Avantika Backend ─────────────────────────────────────────────────────────
AVANTIKA_DB_USER=avantika
AVANTIKA_DB_PASSWORD=avantika2024
AVANTIKA_SECRET_KEY=avantika-secret-key-local-2024

# ── Joz Backend ───────────────────────────────────────────────────────────────
JOZ_DB_USER=joz
JOZ_DB_PASSWORD=joz2024
JOZ_SECRET_KEY=joz-secret-key-local-2024
```

---

## 4. Levantar los contenedores

Todos los servicios se orquestan desde la carpeta `shared/`:

```bash
cd shared
docker compose up --build -d
```

> La **primera vez** tarda entre 5 y 15 minutos dependiendo de tu conexión. Docker descarga las imágenes base, instala dependencias Python y compila los frontends React.

Monitorea el progreso:

```bash
docker compose logs -f
```

Espera hasta ver en los logs algo como:

```
barranquia_serviparamo_backend  | [INFO] Booting worker with pid: ...
barranquia_joz_backend          | [INFO] Booting worker with pid: ...
barranquia_hub_backend          | [INFO] Booting worker with pid: ...
```

Verifica que todos los contenedores estén corriendo:

```bash
docker compose ps
```

Deberías ver estos servicios en estado `Up`:

| Contenedor | Puerto host |
|---|---|
| barranquia_postgres | — (interno) |
| barranquia_hub_backend | 8006 |
| barranquia_serviparamo_backend | 8001 |
| barranquia_serviparamo_frontend | 9021 |
| barranquia_avantika_backend | 8012 |
| barranquia_avantika_frontend | 9022 |
| barranquia_joz_backend | 8003 |
| barranquia_joz_frontend | 9023 |

---

## 5. Cargar datos de demostración

Una vez los contenedores estén corriendo, carga los datos iniciales:

### ServiPáramo — Catálogo ERP de demostración

```bash
docker exec barranquia_serviparamo_backend python manage.py seed_serviparamo
```

Carga:
- 26 SKUs (productos del catálogo, incluyendo un duplicado de prueba)
- 8 categorías y 16 familias
- 8 órdenes de compra con 14 ítems de detalle
- 6 pedidos internos con presupuestos
- 20 movimientos de kardex (compras, salidas, devoluciones)

### Joz — Transacciones SuperEfectivo

JOZ opera bajo el principio **"datos reales del subdata del ERP"** (ver §11.5 del documento técnico v2.1). No hay seed sintético en el repo. Para poblar un entorno local de JOZ:

1. **Restaurar un dump reciente del subdata** coordinado con el administrador del proyecto, o
2. **Ejecutar el ETL manualmente** contra la API de SuperEfectivo cuando las credenciales y el whitelisting estén disponibles.

> Para volver a cargar ServiPáramo desde cero agrega `--clear`:
> ```bash
> docker exec barranquia_serviparamo_backend python manage.py seed_serviparamo --clear
> ```

---

## 6. Verificar el despliegue

Comprueba que todos los servicios respondan con HTTP 200:

```bash
# Hub
curl -o /dev/null -w "%{http_code}\n" http://localhost:8006/

# ServiPáramo
curl -o /dev/null -w "%{http_code}\n" http://localhost:8001/api/serviparamo/skus/
curl -o /dev/null -w "%{http_code}\n" http://localhost:8001/api/serviparamo/docs/

# Joz
curl -o /dev/null -w "%{http_code}\n" http://localhost:8003/api/joz/stats/
curl -o /dev/null -w "%{http_code}\n" http://localhost:8003/api/joz/docs/
```

Todos deben retornar `200`.

---

## 7. Probar las APIs

### Opción A — Swagger UI (navegador)

Abre en tu navegador:

| Servicio | Swagger UI | ReDoc |
|---|---|---|
| ServiPáramo | http://localhost:8001/api/serviparamo/docs/ | http://localhost:8001/api/serviparamo/redoc/ |
| Joz | http://localhost:8003/api/joz/docs/ | http://localhost:8003/api/joz/redoc/ |

Desde el Swagger UI puedes ejecutar cada endpoint directamente con el botón **"Try it out"**.

---

### Opción B — Postman

1. Abre Postman
2. Importa la colección: `docs/barranquia-api.postman_collection.json`
3. Importa el entorno: `docs/barranquia-local.postman_environment.json`
4. Selecciona el entorno **"BarranquIA — Local"** en el selector superior derecho
5. Ejecuta cualquier request de la colección

---

### Endpoints principales ServiPáramo

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/serviparamo/skus/` | Lista el catálogo de SKUs |
| GET | `/api/serviparamo/skus/?q=rodamiento` | Búsqueda por texto |
| GET | `/api/serviparamo/skus/?familia=Rod` | Filtrar por familia |
| GET | `/api/serviparamo/skus/duplicados/` | SKUs con código duplicado |
| GET | `/api/serviparamo/categorias/` | Catálogo de categorías |
| GET | `/api/serviparamo/familias/` | Catálogo de familias |
| GET | `/api/serviparamo/ordenes/` | Órdenes de compra |
| GET | `/api/serviparamo/pedidos/` | Pedidos internos |
| GET | `/api/serviparamo/kardex/` | Movimientos de inventario |
| POST | `/api/serviparamo/etl/run/` | Ejecutar ETL contra ERP |
| GET | `/api/serviparamo/etl/status/` | Estado del último ETL |

**Ejemplo de búsqueda semántica:**
```bash
curl "http://localhost:8001/api/serviparamo/semantica/buscar/?q=rodamiento+para+motor"
```

---

### Endpoints principales Joz

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/joz/stats/` | Dashboard principal (KPIs) |
| GET | `/api/joz/historial/` | Historial de transacciones |
| GET | `/api/joz/historial/?fecha=2026-03-27` | Filtrar por fecha |
| GET | `/api/joz/historial/?almacen=2` | Filtrar por almacén |
| GET | `/api/joz/alertas/` | Alertas de anomalías |
| GET | `/api/joz/riesgos/` | Riesgos calculados |
| GET | `/api/joz/anomalias-por-dia/` | Gráfico de anomalías |
| POST | `/api/joz/etl/run/` | Ejecutar ETL contra SuperEfectivo |
| GET | `/api/joz/etl/status/` | Estado del último ETL |

**Ejemplo — consultar stats:**
```bash
curl http://localhost:8003/api/joz/stats/
```

**Ejemplo — historial de un almacén:**
```bash
curl "http://localhost:8003/api/joz/historial/?almacen=2&fecha=2026-03-27"
```

---

## 8. Probar los frontends

Abre en tu navegador:

| Frontend | URL |
|---|---|
| Hub principal | http://localhost:9005 |
| ServiPáramo | http://localhost:9021 |
| Avantika | http://localhost:9022 |
| Joz | http://localhost:9023 |

> El Hub en `localhost:9005` es el punto de entrada principal y enlaza a todos los módulos.

---

## 9. Comandos útiles

### Ver logs de un servicio

```bash
docker logs barranquia_serviparamo_backend -f
docker logs barranquia_joz_backend -f
docker logs barranquia_hub_backend -f
```

### Entrar a la shell de Django

```bash
# ServiPáramo
docker exec -it barranquia_serviparamo_backend python manage.py shell

# Joz
docker exec -it barranquia_joz_backend python manage.py shell
```

### Ejecutar migraciones manualmente

```bash
docker exec barranquia_serviparamo_backend python manage.py migrate
docker exec barranquia_joz_backend python manage.py migrate
```

### Reiniciar un servicio

```bash
docker restart barranquia_serviparamo_backend
docker restart barranquia_joz_backend
```

### Reconstruir un servicio (tras cambios en código)

```bash
cd shared
docker compose up --build -d serviparamo-backend
docker compose up --build -d joz-backend
```

### Detener todo

```bash
cd shared
docker compose down          # conserva los datos (volúmenes)
docker compose down -v       # borra también los datos
```

---

## 10. Arquitectura del proyecto

```
barranquIA-clean/
├── hub/                        # Backend central Django (puerto 8006)
│   ├── backend/
│   └── infra/
├── serviparamo/                # Microservicio ServiPáramo
│   ├── backend/                # Django REST API (puerto 8001)
│   │   └── serviparamo/
│   │       ├── etl.py          # ETL → SQL Server ERP
│   │       ├── models.py       # CatalogoSKU, Raw*, ETLLog
│   │       ├── views.py        # Endpoints REST
│   │       └── management/
│   │           └── commands/
│   │               └── seed_serviparamo.py
│   └── frontend/               # React SPA (puerto 9021)
├── joz/                        # Microservicio Joz / SuperEfectivo
│   ├── backend/                # Django REST API (puerto 8003)
│   │   └── joz/
│   │       ├── etl.py          # ETL → API SuperEfectivo
│   │       ├── models.py       # Transaccion, Alerta, Riesgo, ETLLog
│   │       ├── views.py        # Endpoints REST
│   │       └── management/
│   │           └── commands/
│   │               ├── detectar_anomalias.py
│   │               └── calcular_riesgos.py
│   └── frontend/               # React SPA (puerto 9023)
├── avantika/                   # Microservicio Avantika (puerto 8012/9022)
├── shared/
│   ├── docker-compose.yml      # Orquestación completa
│   └── postgres/
│       └── init.sh             # Crea BDs y usuarios al iniciar
└── docs/
    ├── DESPLIEGUE_LOCAL.md     # Este documento
    ├── barranquia-api.postman_collection.json
    └── barranquia-local.postman_environment.json
```

**Flujo de datos:**

```
ERP SQL Server ──ETL──► ServiPáramo PostgreSQL ──► API REST ──► Frontend React
API SuperEfectivo ─ETL─► Joz PostgreSQL ──────────► API REST ──► Frontend React
```

---

## 11. Solución de problemas

### Los contenedores no arrancan

```bash
cd shared
docker compose logs postgres   # verificar que la BD inicie correctamente
docker compose logs hub-backend
```

Si hay error de puerto ocupado, cambia el puerto en `shared/docker-compose.yml`.

### Error "relation does not exist" (migraciones pendientes)

```bash
docker exec barranquia_serviparamo_backend python manage.py migrate
docker exec barranquia_joz_backend python manage.py migrate
```

### El seed falla con "already exists"

El seed de ServiPáramo es idempotente — volver a ejecutarlo sin `--clear` omite los registros existentes. Si quieres datos frescos:

```bash
docker exec barranquia_serviparamo_backend python manage.py seed_serviparamo --clear
```

> JOZ no tiene comando de seed: para datos frescos, restaurar un dump del subdata o correr el ETL manual. Ver §11.5 del documento técnico v2.1.

### Docker Desktop dice "out of memory"

En Docker Desktop → Settings → Resources, aumenta la memoria a mínimo **4 GB**.

### El frontend carga en blanco

Limpia la caché del navegador o abre en modo incógnito. Si persiste:

```bash
cd shared
docker compose up --build -d serviparamo-frontend joz-frontend
```

### Puerto 9005 no responde (Hub)

El Hub en el servidor de desarrollo está detrás de nginx del sistema operativo (no Docker). En local, el hub-backend corre en el puerto **8006** directamente.
