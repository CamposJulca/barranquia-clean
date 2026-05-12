# Módulo: SQL Console — Consultas Directas

**Ruta:** `/sql`
**Acceso:** Requiere autenticación (token)
**URL:** https://joz-ccb.ngrok.io/sql

---

## 1. Descripción General

Editor SQL interactivo que permite ejecutar consultas directas contra la base de datos PostgreSQL local (copia de SuperEfectivo). Herramienta de análisis ad-hoc para reportes personalizados, validación de datos y exploración libre.

---

## 2. Estructura Visual

### 2.1 Esquema de Tablas (colapsable)

Panel que muestra las tablas disponibles con columnas, tipos y nullability:

| Tabla | Descripción |
|-------|-------------|
| `joz_transacciones` | Transacciones importadas de SuperEfectivo |
| `joz_alertas` | Alertas generadas por el motor de detección |
| `joz_riesgos` | Scoring de riesgo por almacén |
| `joz_etl_log` | Registro de ejecuciones ETL |
| `joz_config_deteccion` | Configuración de umbrales (singleton) |

### 2.2 Diagrama Entidad-Relación (colapsable)

Diagrama ER interactivo (componente `ERDiagram`) que muestra:
- Tablas con sus campos
- Relaciones FK (líneas sólidas)
- Relaciones lógicas (líneas punteadas)
- Draggable para reorganizar

### 2.3 Editor SQL

- Textarea con fuente monoespaciada
- Atajo: **Ctrl+Enter** para ejecutar
- 8 queries de ejemplo pre-armadas como botones

### 2.4 Queries de Ejemplo

| Nombre | Descripción |
|--------|-------------|
| Resumen por almacén | Agrupado por almacén + tipo con conteo y montos |
| Top 20 transacciones más altas | Ordenado por monto DESC |
| Alertas críticas abiertas | JOIN alertas + transacciones, severidad alta/critica |
| Riesgos por almacén | Tabla de riesgos ordenada por probabilidad |
| Transacciones por día (30d) | Agrupado por fecha con aportes/retiros |
| Clientes con más operaciones | Top 30 clientes por volumen |
| Distribución de alertas | Agrupado por tipo + severidad + estado |
| Historial ETL | Últimas 20 ejecuciones del pipeline |

### 2.5 Resultados

| Elemento | Descripción |
|----------|-------------|
| Conteo | "N filas" |
| Truncado | Badge rojo si se alcanzó el límite (500) |
| Tiempo | Segundos de ejecución |
| Copiar | Copia al clipboard como TSV |
| CSV | Descarga como archivo `consulta_joz.csv` |
| Tabla | Columnas dinámicas, filas con hover, NULL en itálica |

### 2.6 Historial de queries

Últimas 20 queries ejecutadas en la sesión (en memoria, no persiste). Click para reutilizar.

---

## 3. Endpoints consumidos

| Endpoint | Método | Uso |
|----------|--------|-----|
| `POST /api/joz/sql/execute/` | POST | Ejecutar consulta SQL |
| `GET /api/joz/sql/schema/` | GET | Esquema de tablas |

### `POST /api/joz/sql/execute/`

**Body:**
```json
{
  "query": "SELECT * FROM joz_transacciones LIMIT 10",
  "limit": 500
}
```

**Respuesta:**
```json
{
  "columns": ["id", "fecha", "almacen", "monto", ...],
  "rows": [{"id": 1, "fecha": "2026-04-21", ...}],
  "count": 10,
  "truncated": false,
  "elapsed": 0.023
}
```

---

## 4. Seguridad

| Restricción | Detalle |
|-------------|---------|
| Solo SELECT | El backend bloquea INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE |
| Límite de filas | Máximo 500 filas por consulta |
| Timeout | 30 segundos (configurado en el frontend) |
| Autenticación | Requiere token válido |

---

## 5. Notas Técnicas

- **Archivo frontend:** `joz/frontend/src/pages/SqlConsole.tsx`
- **Componente ER:** `joz/frontend/src/components/ERDiagram.tsx`
- **Archivo backend:** `joz/backend/joz/views.py` (funciones `sql_execute`, `sql_schema`)
- **Descarga CSV:** Generada en frontend (no requiere endpoint adicional)
