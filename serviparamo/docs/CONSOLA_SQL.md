# Consola SQL — Documento Técnico

**Módulo:** ServiPáramo  
**URL:** https://barranquia-hub.ngrok.io/serviparamo/query  
**Fecha:** 2026-04-08  
**Versión:** 1.0.0

---

## 1. Descripción general

La Consola SQL es una herramienta de exploración y validación de datos integrada al módulo ServiPáramo. Permite ejecutar consultas `SELECT` directamente sobre la base de datos PostgreSQL local, que contiene todos los datos sincronizados desde el ERP SQL Server de ServiPáramo (≈6.5 millones de filas). Está orientada al equipo técnico y de análisis de datos para validar cargas ETL, explorar la estructura de los datos y construir consultas para los dashboards.

---

## 2. Arquitectura

```
Usuario (Browser)
      │
      ▼
React SPA — QueryConsole.tsx
      │  POST /api/serviparamo/query/
      │  { "sql": "SELECT ..." }
      ▼
Django REST — views.query_console()
      │  _validate_query() → solo SELECT
      │  Inyecta LIMIT 1000 si no viene
      ▼
PostgreSQL (barranquia_postgres)
      │  Tablas: serviparamo_*
      ▼
Respuesta JSON
{ ok, columns, rows, row_count, elapsed_ms }
```

---

## 3. Backend

### 3.1 Endpoint

| Campo        | Valor                              |
|--------------|------------------------------------|
| Método       | `POST`                             |
| URL          | `/api/serviparamo/query/`          |
| Content-Type | `application/json`                 |
| Auth         | Ninguna (red interna)              |

### 3.2 Request

```json
{
  "sql": "SELECT familia, COUNT(*) AS total FROM serviparamo_catalogo_skus GROUP BY familia ORDER BY total DESC"
}
```

### 3.3 Response exitosa

```json
{
  "ok": true,
  "columns": ["familia", "total"],
  "rows": [
    ["EQUIPOS", 20645],
    ["DIFUSORES Y REJILLAS", 14646]
  ],
  "row_count": 2,
  "elapsed_ms": 23
}
```

### 3.4 Response con error

```json
{
  "ok": false,
  "error": "Solo se permiten consultas SELECT."
}
```

### 3.5 Validaciones de seguridad

La función `_validate_query()` aplica las siguientes reglas antes de ejecutar:

| Regla | Detalle |
|---|---|
| Solo SELECT | La primera palabra del SQL debe ser `SELECT` |
| Bloqueo de escritura | Rechaza `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER`, `CREATE` |
| Bloqueo de sistema | Rechaza `GRANT`, `REVOKE`, `EXEC`, `EXECUTE`, `COPY`, `pg_` |
| Límite automático | Si no hay `LIMIT` en la query, se inyecta `LIMIT 1000` |
| Query vacía | Retorna error si el campo `sql` está vacío |

### 3.6 Serialización de tipos

Los tipos no-JSON se convierten automáticamente antes de retornar:

| Tipo Python | Conversión |
|---|---|
| `datetime`, `date` | `.isoformat()` → string |
| `None` | `null` en JSON |
| Otros no serializables | `str(val)` |

### 3.7 Archivo fuente

```
serviparamo/backend/serviparamo/views.py  (línea 423 en adelante)
serviparamo/backend/serviparamo/urls.py   → path('query/', views.query_console)
```

---

## 4. Frontend

### 4.1 Componente

**Archivo:** `serviparamo/frontend/src/pages/QueryConsole.tsx`  
**Ruta React:** `/query`  
**Sidebar:** Consola SQL (ícono `Terminal`)

### 4.2 Funcionalidades

| Funcionalidad | Detalle |
|---|---|
| Editor SQL | `<textarea>` con fondo oscuro (`bg-gray-950`) y texto verde (`text-green-300`) |
| Atajo de teclado | `Ctrl+Enter` / `Cmd+Enter` ejecuta la query |
| Tecla Tab | Inserta 2 espacios (no cambia de campo) |
| Botón Ejecutar | Llama al endpoint POST con el SQL del editor |
| Botón Reset | Limpia editor, resultado y error |
| Menú Ejemplos | 7 consultas precargadas (ver sección 4.3) |
| Tabla de resultados | Scroll horizontal y vertical, primera columna con número de fila |
| Celdas null | Se muestran en gris itálico |
| Celdas numéricas | Se muestran en azul con fuente monospace |
| Truncado de celda | Textos > 80 caracteres se truncan con `…` y tooltip con valor completo |
| Badge filas | Muestra conteo de filas retornadas |
| Badge tiempo | Muestra `elapsed_ms` del servidor |
| Manejo de errores | Bloque rojo con el mensaje de error del servidor |
| Estado de carga | Botón cambia a "Ejecutando…" y se deshabilita |

### 4.3 Consultas de ejemplo precargadas

| Nombre | Descripción |
|---|---|
| SKUs por familia | `GROUP BY familia` sobre catálogo de SKUs |
| Duplicados detectados | SKUs con `es_duplicado = true` |
| Órdenes de compra recientes | `com_orden01` ordenado por fecha DESC |
| Compras por proveedor | Ranking de proveedores por volumen de OC |
| Pedidos por estado | Distribución de estados en pedidos |
| Movimientos de Kardex | Últimos movimientos de inventario |
| Tablas disponibles | Lista todas las tablas `serviparamo_*` del schema público |

### 4.4 Flujo de la llamada

```
handleKeyDown (Ctrl+Enter) ──► run()
                                  │
                         setLoading(true)
                         setError(null)
                         setResult(null)
                                  │
                    api.post('/api/serviparamo/query/', { sql })
                                  │
                    ┌─────────────┴─────────────┐
                 data.ok                    error / !ok
                    │                           │
              setResult(data)            setError(mensaje)
                    │
           Renderiza tabla
```

---

## 5. Tablas consultables

Todas las tablas están en el schema `public` de PostgreSQL. Para listarlas:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'serviparamo_%'
ORDER BY table_name;
```

| Tabla PostgreSQL | Origen ERP (SQL Server) | Registros aprox. |
|---|---|---|
| `serviparamo_catalogo_skus` | `inv_ina01` | 127,090 |
| `serviparamo_raw_categorias` | `inv_ina01_categoria` | 523 |
| `serviparamo_raw_familias` | `inv_ina01_familia` | 26 |
| `serviparamo_raw_ordenes_encabezado` | `com_orden01` | 114,124 |
| `serviparamo_raw_ordenes_detalle` | `com_orden02` | 311,747 |
| `serviparamo_raw_pedidos_encabezado` | `com_peda01` | 112,447 |
| `serviparamo_raw_pedidos_detalle` | `com_peda02` | 583,555 |
| `serviparamo_raw_presupuesto_detalle` | `com_peda03` | 2,017,647 |
| `serviparamo_raw_presupuesto_resumen` | `com_peda03_mat` | 1,487,614 |
| `serviparamo_raw_kardex` | `inv_ina02` | 1,757,867 |
| `serviparamo_etl_log` | — (interno) | Variable |

---

## 6. Consultas útiles de referencia

### SKUs duplicados por familia
```sql
SELECT familia, COUNT(*) AS total_duplicados
FROM serviparamo_catalogo_skus
WHERE es_duplicado = true
GROUP BY familia
ORDER BY total_duplicados DESC
LIMIT 20;
```

### Órdenes de compra por estado
```sql
SELECT estado, COUNT(*) AS total
FROM serviparamo_raw_ordenes_encabezado
GROUP BY estado
ORDER BY total DESC;
```

### Top proveedores por volumen de órdenes
```sql
SELECT proveedor_id, COUNT(*) AS ordenes
FROM serviparamo_raw_ordenes_encabezado
GROUP BY proveedor_id
ORDER BY ordenes DESC
LIMIT 20;
```

### SKUs sin familia
```sql
SELECT codigo, nombre, categoria
FROM serviparamo_catalogo_skus
WHERE familia = '' OR familia IS NULL
LIMIT 50;
```

### Últimas ejecuciones del ETL
```sql
SELECT tabla_destino, filas_insertadas, iniciado_en, finalizado_en, mensaje
FROM serviparamo_etl_log
ORDER BY iniciado_en DESC
LIMIT 20;
```

### Movimientos de Kardex por tipo
```sql
SELECT nomsis, COUNT(*) AS movimientos
FROM serviparamo_raw_kardex
GROUP BY nomsis
ORDER BY movimientos DESC;
```

---

## 7. Restricciones y límites

| Parámetro | Valor |
|---|---|
| Tipo de operación permitida | Solo `SELECT` |
| Máximo de filas retornadas | 1,000 (inyectado automáticamente) |
| Timeout de conexión BD | Sin límite explícito (hereda Django) |
| Autenticación requerida | No (acceso restringido por red/ngrok) |
| Escritura en base de datos | Bloqueada por validación |

---

## 8. Consideraciones de seguridad

- La consola no está protegida con autenticación propia — el acceso está controlado a nivel de red (ngrok con token, red Docker interna).
- Solo permite operaciones de lectura. Cualquier intento de escritura o ejecución de comandos del sistema es rechazado antes de llegar a la base de datos.
- No tiene acceso al ERP SQL Server directamente — consulta únicamente la copia local en PostgreSQL.
- Para producción en entorno multiusuario se recomienda agregar autenticación por JWT o sesión antes de exponer este endpoint.
