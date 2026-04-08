# Base de Datos — Módulo ServiPáramo

**Versión:** 1.0
**Fecha:** 2026-04-06
**Proyecto:** BarranquIA Hub
**Módulo:** ServiPáramo

---

## Contenido

1. [Visión general](#1-visión-general)
2. [Conexión](#2-conexión)
3. [Esquema completo](#3-esquema-completo)
4. [Origen de los datos — ERP SQL Server](#4-origen-de-los-datos--erp-sql-server)
5. [Mapeo ERP → PostgreSQL](#5-mapeo-erp--postgresql)
6. [Pipeline de carga](#6-pipeline-de-carga)
7. [Configuración local](#7-configuración-local)
8. [Seed de desarrollo](#8-seed-de-desarrollo)
9. [Migraciones](#9-migraciones)
10. [Consultas de referencia](#10-consultas-de-referencia)

---

## 1. Visión general

ServiPáramo tiene su propia base de datos PostgreSQL aislada dentro del contenedor compartido `barranquia_postgres`. Los datos provienen de un ERP externo (SQL Server) y se sincronizan mediante un proceso ETL bajo demanda.

```
ERP SQL Server                     PostgreSQL (BD: serviparamo)
ts1.serviparamo.com.co:1433        contenedor: barranquia_postgres
BD: PRUEBA                         usuario: serviparamo
        │
        │  ETL (serviparamo/backend/serviparamo/etl.py)
        │  Disparo: POST /api/serviparamo/etl/run/
        │
        ▼
┌─────────────────────────────────────────────┐
│  Tablas RAW (espejo del ERP)                │
│  serviparamo_raw_*  (9 tablas)              │  ← copia fiel, sin transformar
├─────────────────────────────────────────────┤
│  Tablas procesadas                          │
│  serviparamo_catalogo_skus                  │  ← normalización + dedup
│  serviparamo_catalogo_embeddings            │  ← vectores semánticos 384-dim
├─────────────────────────────────────────────┤
│  Auditoría                                  │
│  serviparamo_etl_log                        │  ← registro de cada ejecución ETL
└─────────────────────────────────────────────┘
```

**Volumen de datos (Sprint 1, 2026-03-22):**

| Tabla | Filas |
|---|---|
| `serviparamo_catalogo_skus` | 127,090 |
| `serviparamo_catalogo_embeddings` | 127,090 |
| `serviparamo_raw_kardex` | variable |
| Resto de Raw* | variable |

---

## 2. Conexión

### Desde Docker (red interna)

```
Host:     postgres
Puerto:   5432
BD:       serviparamo
Usuario:  serviparamo
Password: serviparamo2024  (sobreescribir con SERVIPARAMO_DB_PASSWORD en .env)
```

### Desde el host (acceso directo al contenedor)

```bash
docker exec -it barranquia_postgres psql -U serviparamo -d serviparamo
```

### Desde un cliente externo (DBeaver, TablePlus, etc.)

El contenedor **no expone el puerto 5432 al host** por seguridad. Para acceder con un cliente gráfico, usar un túnel SSH o habilitar temporalmente el puerto en `docker-compose.yml`:

```yaml
# shared/docker-compose.yml — solo para desarrollo local
postgres:
  ports:
    - "127.0.0.1:5432:5432"   # agregar esta línea temporalmente
```

Luego conectar con:
```
Host:     127.0.0.1
Puerto:   5432
BD:       serviparamo
Usuario:  serviparamo
Password: serviparamo2024
```

---

## 3. Esquema completo

### 3.1 `serviparamo_catalogo_skus`

Catálogo maestro de SKUs. Es la tabla principal del módulo — resultado del ETL más las fases de normalización y deduplicación.

| Columna | Tipo | Nulo | Índice | Descripción |
|---|---|---|---|---|
| `id` | bigint (PK) | NO | PK | ID interno autoincremental |
| `codigo` | varchar(50) | NO | SI | Código SKU del ERP |
| `familia` | varchar(150) | NO | SI | Familia de producto (raw, tal como viene del ERP) |
| `familia_normalizada` | varchar(150) | NO | SI | Familia asignada por K-Means clustering |
| `categoria` | varchar(150) | NO | — | Categoría / subfamilia |
| `nombre` | varchar(500) | NO | — | Descripción principal del producto |
| `nombre1` | varchar(500) | NO | — | Descripción secundaria (puede estar vacía) |
| `unidad` | varchar(20) | NO | — | Unidad de medida (UND, KG, LT, etc.) |
| `cluster_id` | integer | SI | — | ID del cluster K-Means asignado |
| `es_duplicado` | boolean | NO | SI | `true` si similitud coseno ≥ 0.92 con otro SKU |
| `grupo_duplicado` | integer | SI | SI | ID del grupo de duplicados al que pertenece |
| `aprobado` | boolean | NO | — | `true` si fue marcado manualmente como SKU maestro |
| `cargado_en` | timestamptz | NO | — | Timestamp de inserción en el ETL |
| `actualizado_en` | timestamptz | NO | — | Timestamp de última modificación |

**Notas:**
- `familia` puede ser `'SIN FAMILIA'` cuando el ERP envía el campo vacío.
- `familia_normalizada` solo tiene valor después de correr `normalizer.py`. Hasta entonces es igual a `familia`.
- Un SKU con `es_duplicado = true` y `aprobado = false` representa una variante pendiente de revisión.

---

### 3.2 `serviparamo_catalogo_embeddings`

Vectores semánticos generados por el modelo `all-MiniLM-L6-v2`. Uno por SKU.

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | bigint (PK) | NO | ID interno |
| `sku_id` | bigint (FK) | NO | Referencia a `serviparamo_catalogo_skus.id` (OneToOne) |
| `vector` | jsonb | NO | Lista de 384 floats L2-normalizados |
| `texto_fuente` | text | NO | Texto que se vectorizó: `"{familia} {categoria} {nombre} {nombre1}"` |
| `generado_en` | timestamptz | NO | Timestamp de generación |

**Nota:** Los vectores están en `jsonb` (no `pgvector`). La búsqueda semántica actual es O(N) en Python. En Sprint 3 se migra a `pgvector` + índice HNSW.

---

### 3.3 `serviparamo_raw_categorias`

Espejo de `inv_ina01_categoria` del ERP.

| Columna | Tipo | Nulo | Índice | Descripción |
|---|---|---|---|---|
| `id` | bigint (PK) | NO | PK | — |
| `categoria_id` | varchar(50) | NO | — | Código de categoría del ERP |
| `nombre` | varchar(300) | NO | — | Nombre de la categoría |
| `raw_data` | jsonb | NO | — | Fila completa del ERP en JSON |
| `cargado_en` | timestamptz | NO | — | Timestamp de inserción |

---

### 3.4 `serviparamo_raw_familias`

Espejo de `inv_ina01_familia` del ERP.

| Columna | Tipo | Nulo | Índice | Descripción |
|---|---|---|---|---|
| `id` | bigint (PK) | NO | PK | — |
| `familia_id` | varchar(50) | NO | — | Código de familia del ERP |
| `nombre` | varchar(300) | NO | — | Nombre de la familia |
| `raw_data` | jsonb | NO | — | Fila completa del ERP en JSON |
| `cargado_en` | timestamptz | NO | — | Timestamp de inserción |

---

### 3.5 `serviparamo_raw_ordenes_encabezado`

Espejo de `com_orden01` — encabezados de órdenes de compra.

| Columna | Tipo | Nulo | Índice | Descripción |
|---|---|---|---|---|
| `id` | bigint (PK) | NO | PK | — |
| `numfac` | varchar(50) | NO | SI | Número de orden de compra |
| `proveedor_id` | varchar(50) | NO | — | Código del proveedor |
| `fecha_oc` | date | SI | — | Fecha de la orden |
| `estado` | varchar(50) | NO | — | Estado de la OC |
| `raw_data` | jsonb | NO | — | Fila completa del ERP en JSON |
| `cargado_en` | timestamptz | NO | — | Timestamp de inserción |

---

### 3.6 `serviparamo_raw_ordenes_detalle`

Espejo de `com_orden02` — líneas de órdenes de compra.

| Columna | Tipo | Nulo | Índice | Descripción |
|---|---|---|---|---|
| `id` | bigint (PK) | NO | PK | — |
| `numfac` | varchar(50) | NO | SI | Número de orden (FK lógica a encabezado) |
| `codigo_item` | varchar(50) | NO | — | Código SKU del producto |
| `descripcion` | varchar(500) | NO | — | Descripción del ítem |
| `cantidad` | decimal(18,4) | NO | — | Cantidad ordenada |
| `precio_unitario` | decimal(18,4) | NO | — | Precio unitario |
| `raw_data` | jsonb | NO | — | Fila completa del ERP en JSON |
| `cargado_en` | timestamptz | NO | — | Timestamp de inserción |

---

### 3.7 `serviparamo_raw_pedidos_encabezado`

Espejo de `com_peda01` — encabezados de pedidos/solicitudes.

| Columna | Tipo | Nulo | Índice | Descripción |
|---|---|---|---|---|
| `id` | bigint (PK) | NO | PK | — |
| `pedido` | integer | NO | SI | Número de pedido |
| `solicitante` | varchar(200) | NO | — | Nombre del solicitante |
| `fecha_pedido` | date | SI | — | Fecha del pedido |
| `estado` | varchar(50) | NO | — | Estado del pedido |
| `raw_data` | jsonb | NO | — | Fila completa del ERP en JSON |
| `cargado_en` | timestamptz | NO | — | Timestamp de inserción |

---

### 3.8 `serviparamo_raw_pedidos_detalle`

Espejo de `com_peda02` — líneas de pedidos.

| Columna | Tipo | Nulo | Índice | Descripción |
|---|---|---|---|---|
| `id` | bigint (PK) | NO | PK | — |
| `pedido` | integer | NO | SI | Número de pedido (FK lógica a encabezado) |
| `codigo_item` | varchar(50) | NO | — | Código SKU |
| `descripcion` | varchar(500) | NO | — | Descripción del ítem |
| `cantidad` | decimal(18,4) | NO | — | Cantidad solicitada |
| `raw_data` | jsonb | NO | — | Fila completa del ERP en JSON |
| `cargado_en` | timestamptz | NO | — | Timestamp de inserción |

---

### 3.9 `serviparamo_raw_presupuesto_detalle`

Espejo de `com_peda03` — presupuestos detallados por ítem.

| Columna | Tipo | Nulo | Índice | Descripción |
|---|---|---|---|---|
| `id` | bigint (PK) | NO | PK | — |
| `pedido` | integer | NO | SI | Número de pedido/presupuesto |
| `codigo_item` | varchar(50) | NO | — | Código SKU |
| `descripcion` | varchar(500) | NO | — | Descripción del ítem |
| `cantidad` | decimal(18,4) | NO | — | Cantidad |
| `precio` | decimal(18,4) | NO | — | Precio unitario presupuestado |
| `raw_data` | jsonb | NO | — | Fila completa del ERP en JSON |
| `cargado_en` | timestamptz | NO | — | Timestamp de inserción |

---

### 3.10 `serviparamo_raw_presupuesto_resumen`

Espejo de `com_peda03_mat` — resumen de presupuestos por familia.

| Columna | Tipo | Nulo | Índice | Descripción |
|---|---|---|---|---|
| `id` | bigint (PK) | NO | PK | — |
| `pedido` | integer | NO | SI | Número de pedido/presupuesto |
| `familia` | varchar(150) | NO | — | Familia de productos del grupo |
| `total` | decimal(18,4) | NO | — | Total presupuestado para esta familia |
| `raw_data` | jsonb | NO | — | Fila completa del ERP en JSON |
| `cargado_en` | timestamptz | NO | — | Timestamp de inserción |

---

### 3.11 `serviparamo_raw_kardex`

Espejo de `inv_ina02` — movimientos de inventario (entradas, salidas, traslados).

| Columna | Tipo | Nulo | Índice | Descripción |
|---|---|---|---|---|
| `id` | bigint (PK) | NO | PK | — |
| `numfac` | varchar(50) | NO | SI | Número de documento del movimiento |
| `nomsis` | varchar(100) | NO | — | Tipo de movimiento (ENTRADA, SALIDA, etc.) |
| `codigo_item` | varchar(50) | NO | — | Código SKU |
| `cantidad` | decimal(18,4) | NO | — | Cantidad del movimiento |
| `fecha_mov` | date | SI | — | Fecha del movimiento |
| `raw_data` | jsonb | NO | — | Fila completa del ERP en JSON |
| `cargado_en` | timestamptz | NO | — | Timestamp de inserción |

---

### 3.12 `serviparamo_etl_log`

Registro de auditoría de cada ejecución del ETL.

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | bigint (PK) | NO | ID interno |
| `tabla_destino` | varchar(100) | NO | Nombre del modelo Django cargado |
| `filas_insertadas` | integer | NO | Registros insertados exitosamente |
| `filas_error` | integer | NO | Registros que fallaron |
| `iniciado_en` | timestamptz | NO | Inicio de la carga |
| `finalizado_en` | timestamptz | SI | Fin de la carga (null si está corriendo) |
| `mensaje` | text | NO | Resultado o mensaje de error |

---

## 4. Origen de los datos — ERP SQL Server

| Parámetro | Valor |
|---|---|
| Servidor | `ts1.serviparamo.com.co` |
| Puerto | `1433` |
| Base de datos | `PRUEBA` |
| Usuario | `Test20Indicadores26` |
| Contraseña | variable de entorno `SERVIPARAMO_ERP_PASS` |
| Driver | ODBC Driver 18 for SQL Server |
| Cifrado | `Encrypt=yes; TrustServerCertificate=yes` |

> **Acceso restringido:** el servidor ERP solo es alcanzable desde la red interna de ServiPáramo y CIA S.C.A. Para correr el ETL desde fuera de esa red se necesita VPN o acceso directo.

---

## 5. Mapeo ERP → PostgreSQL

| Tabla SQL Server | Tabla PostgreSQL | Modelo Django | Tipo |
|---|---|---|---|
| `inv_ina01` | `serviparamo_catalogo_skus` | `CatalogoSKU` | Procesada |
| — | `serviparamo_catalogo_embeddings` | `CatalogoEmbedding` | Generada (ML) |
| `inv_ina01_categoria` | `serviparamo_raw_categorias` | `RawCategoria` | Raw |
| `inv_ina01_familia` | `serviparamo_raw_familias` | `RawFamilia` | Raw |
| `com_orden01` | `serviparamo_raw_ordenes_encabezado` | `RawOrdenEncabezado` | Raw |
| `com_orden02` | `serviparamo_raw_ordenes_detalle` | `RawOrdenDetalle` | Raw |
| `com_peda01` | `serviparamo_raw_pedidos_encabezado` | `RawPedidoEncabezado` | Raw |
| `com_peda02` | `serviparamo_raw_pedidos_detalle` | `RawPedidoDetalle` | Raw |
| `com_peda03` | `serviparamo_raw_presupuesto_detalle` | `RawPresupuestoDetalle` | Raw |
| `com_peda03_mat` | `serviparamo_raw_presupuesto_resumen` | `RawPresupuestoResumen` | Raw |
| `inv_ina02` | `serviparamo_raw_kardex` | `RawKardex` | Raw |

### ¿Por qué existen tablas Raw?

Las tablas `Raw*` son espejos sin transformar del ERP. Sirven para:

1. **Auditoría** — siempre se puede rastrear qué llegó exactamente del ERP.
2. **Re-procesamiento** — si cambia la lógica de negocio, se puede reprocesar sin reconectar al ERP.
3. **Depuración** — cuando un dato en `CatalogoSKU` parece incorrecto, se consulta el `raw_data` para comparar con la fuente.

Cada fila Raw guarda el registro original completo en el campo `raw_data` (jsonb), independientemente de qué campos se hayan mapeado explícitamente.

---

## 6. Pipeline de carga

El flujo completo desde el ERP hasta los datos disponibles en la API tiene tres fases secuenciales:

```
[ERP SQL Server]
      │
      │  Fase 1 — ETL  (etl.py)
      │  • Conecta vía pyodbc
      │  • Trunca tablas destino
      │  • Inserta en lotes de 2,000 registros
      │  • Detecta duplicados por código (Counter)
      │  • Normaliza familia: title() + '' → 'SIN FAMILIA'
      │  • Registra en ETLLog
      ▼
[serviparamo_catalogo_skus]  +  [serviparamo_raw_*]
      │
      │  Fase 2 — Embeddings  (embeddings.py)
      │  • Carga modelo all-MiniLM-L6-v2 (~90MB, primera vez)
      │  • Genera texto: "{familia} {categoria} {nombre} {nombre1}"
      │  • Vectoriza en lotes de 512 → vector de 384 floats, L2-normalizado
      │  • Inserta en lotes de 500
      │  • Modo incremental por defecto (solo SKUs sin embedding)
      ▼
[serviparamo_catalogo_embeddings]
      │
      │  Fase 3 — Normalización  (normalizer.py)
      │  • Carga todos los vectores a numpy (N, 384)
      │  • K-Means: k = max(50, n_familias_únicas × 3)  → ~848 clusters
      │  • Asigna familia_normalizada por votación mayoritaria del cluster
      │  • Similitud coseno por bloques de 1,000 filas
      │  • Umbral ≥ 0.92 → es_duplicado = True, grupo_duplicado = N
      │  • bulk_update en lotes de 1,000
      ▼
[serviparamo_catalogo_skus — actualizado]
      │
      │  API REST
      ▼
[Endpoints /api/serviparamo/*]
```

**Tiempos estimados (127K SKUs):**

| Fase | Tiempo |
|---|---|
| ETL completo | 3–8 min |
| Embeddings (primera vez, descarga modelo) | 15–25 min |
| Embeddings (corridas siguientes) | 6–12 min |
| Normalización K-Means + dedup | 5–10 min |

---

## 7. Configuración local

### Prerequisitos

```bash
# ODBC Driver 18 (solo si corres el ETL fuera de Docker)
# En Ubuntu/Debian:
curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
curl https://packages.microsoft.com/config/ubuntu/22.04/prod.list \
  > /etc/apt/sources.list.d/mssql-release.list
apt-get update
ACCEPT_EULA=Y apt-get install -y msodbcsql18
```

Si usas Docker, el driver ya está instalado en la imagen del backend.

### Variables de entorno necesarias

En el archivo `.env` de la raíz del repo:

```bash
# PostgreSQL (BD de ServiPáramo)
SERVIPARAMO_DB_USER=serviparamo
SERVIPARAMO_DB_PASSWORD=serviparamo2024

# ERP SQL Server (necesario solo para correr el ETL)
SERVIPARAMO_ERP_PASS=<contraseña — solicitar al equipo>
```

### Levantar la infraestructura

```bash
cd shared
docker compose up -d

# Verificar que la BD está lista:
docker exec barranquia_postgres psql -U serviparamo -d serviparamo -c "\dt"
```

---

## 8. Seed de desarrollo

Como el ERP no es accesible desde todas las máquinas, existe un proceso para generar un dump de datos de desarrollo y distribuirlo al equipo.

### ¿Qué es el seed?

Un archivo SQL (`serviparamo_seed.sql`) que contiene un `COPY` de todas las tablas `serviparamo_*` con datos reales del ERP. Permite poblar la BD local **sin necesitar acceso al ERP**.

El archivo **no está en el repositorio** (está en `.gitignore` — puede pesar +100MB). Se distribuye por Drive o sftp.

### Generar el seed (requiere acceso al ERP)

```bash
# Desde la raíz del repo, en una máquina con acceso a la red de ServiPáramo:
bash serviparamo/scripts/generar_seed.sh
```

El script:
1. Verifica que los contenedores estén corriendo
2. Verifica conectividad al ERP
3. Dispara el ETL y espera que termine
4. Genera el dump con `pg_dump --data-only` de las 10 tablas `serviparamo_*`
5. Copia el resultado a `serviparamo/docs/serviparamo_seed.sql`

### Cargar el seed (sin acceso al ERP)

```bash
# 1. Obtener serviparamo_seed.sql del equipo y colocarlo en:
#    serviparamo/docs/serviparamo_seed.sql

# 2. Ejecutar:
bash serviparamo/scripts/cargar_seed.sh
```

El script:
1. Verifica que los contenedores estén corriendo
2. Limpia las tablas existentes (`TRUNCATE ... RESTART IDENTITY CASCADE`)
3. Carga el seed
4. Muestra el conteo de filas por tabla como verificación

### Verificar la carga

```bash
docker exec barranquia_postgres psql -U serviparamo -d serviparamo -c "
SELECT tablename,
  (xpath('/row/c/text()',
    query_to_xml('SELECT COUNT(*) AS c FROM ' || quote_ident(tablename), false, true, ''))
  )[1]::text::int AS filas
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'serviparamo_%'
ORDER BY filas DESC;"
```

---

## 9. Migraciones

Las migraciones están en `serviparamo/backend/serviparamo/migrations/`.

| Migración | Fecha | Cambios |
|---|---|---|
| `0001_initial.py` | 2026-03-18 | Crea `CatalogoSKU` y `CatalogoEmbedding` |
| `0002_campos_reales.py` | 2026-03-18 | Renombra subfamilia→categoria, descrip1→nombre, descrip2→nombre1 |
| `0003_staging_tables.py` | 2026-03-18 | Crea las 9 tablas `Raw*` y `ETLLog` |

### Aplicar migraciones

```bash
# Dentro del contenedor (se aplican automáticamente al iniciar):
docker exec barranquia_serviparamo_backend python manage.py migrate

# O manualmente:
docker exec barranquia_serviparamo_backend python manage.py showmigrations serviparamo
```

### Crear nueva migración tras cambiar un modelo

```bash
docker exec barranquia_serviparamo_backend python manage.py makemigrations serviparamo
docker exec barranquia_serviparamo_backend python manage.py migrate
```

---

## 10. Consultas de referencia

### Resumen general del catálogo

```sql
SELECT
  COUNT(*)                                         AS total_skus,
  COUNT(*) FILTER (WHERE es_duplicado = true)      AS duplicados,
  COUNT(*) FILTER (WHERE aprobado = true)          AS aprobados,
  COUNT(*) FILTER (WHERE familia = 'SIN FAMILIA')  AS sin_familia,
  COUNT(DISTINCT familia_normalizada)              AS familias_unicas,
  COUNT(DISTINCT cluster_id)                       AS clusters
FROM serviparamo_catalogo_skus;
```

### SKUs sin embedding generado

```sql
SELECT s.codigo, s.nombre
FROM serviparamo_catalogo_skus s
LEFT JOIN serviparamo_catalogo_embeddings e ON e.sku_id = s.id
WHERE e.id IS NULL
LIMIT 20;
```

### Top familias por cantidad de SKUs

```sql
SELECT familia_normalizada, COUNT(*) AS total
FROM serviparamo_catalogo_skus
GROUP BY familia_normalizada
ORDER BY total DESC
LIMIT 20;
```

### Grupos de duplicados más grandes

```sql
SELECT grupo_duplicado, COUNT(*) AS variantes
FROM serviparamo_catalogo_skus
WHERE grupo_duplicado IS NOT NULL
GROUP BY grupo_duplicado
ORDER BY variantes DESC
LIMIT 10;
```

### Última ejecución del ETL

```sql
SELECT tabla_destino, filas_insertadas, filas_error,
       iniciado_en, finalizado_en, mensaje
FROM serviparamo_etl_log
ORDER BY iniciado_en DESC
LIMIT 10;
```

### Ver el raw_data de un SKU específico

```sql
-- Útil para debugear discrepancias entre el ERP y lo que se cargó
SELECT raw_data
FROM serviparamo_raw_kardex
WHERE codigo_item = '00010'
LIMIT 5;
```

### Órdenes de compra recientes

```sql
SELECT e.numfac, e.proveedor_id, e.fecha_oc, e.estado,
       COUNT(d.id) AS lineas,
       SUM(d.cantidad * d.precio_unitario) AS total
FROM serviparamo_raw_ordenes_encabezado e
JOIN serviparamo_raw_ordenes_detalle d ON d.numfac = e.numfac
GROUP BY e.numfac, e.proveedor_id, e.fecha_oc, e.estado
ORDER BY e.fecha_oc DESC
LIMIT 10;
```

---

*Módulo ServiPáramo — BarranquIA Hub*
*Ruta IA — Cámara de Comercio de Barranquilla × Boost Business Consulting*
*Última actualización: 6 de abril de 2026*
