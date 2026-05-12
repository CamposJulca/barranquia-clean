# Módulo: Historial — Explorador de Transacciones

**Ruta:** `/history`
**Acceso:** Requiere autenticación (token)
**URL:** https://joz-ccb.ngrok.io/history

---

## 1. Descripción General

Explorador paginado de todas las transacciones importadas desde la API de SuperEfectivo. Permite buscar, filtrar por origen y navegar por las páginas. Cada fila muestra los datos crudos tal como llegaron de la API.

---

## 2. Estructura Visual

### 2.1 Barra de Filtros

| Filtro | Tipo | Parámetro API | Descripción |
|--------|------|---------------|-------------|
| Búsqueda | Input texto (debounce 300ms) | `q` | Busca en cliente, referencia, cédula, descripción |
| Origen | Select | `origen` | `todos`, `real` (estado=cargado), `prueba` (estado=seed) |

### 2.2 Tabla de Transacciones

| Columna | Campo API | Ejemplo |
|---------|-----------|---------|
| Ref | `referencia` | EM205225, AE118309, RE151324 |
| Fecha | `date` | 2026-04-21 |
| Almacén | `store` | ALMACEN 06 |
| Operación | Clasificada por heurística | Empeño, Retiro, Abono, Apertura, Cierre, Otro |
| Cliente | `cliente` | YAMISELL JIMENEZ JIMENEZ |
| Descripción | `descripcion` (truncada) | PAGA 1 MES DE INTERÉS... |
| Cajero | `analista` (campo `usuario_cajero`) | ERODRIGUEZ |
| Entrada | `entrada` | USD 2 (verde) |
| Salida | `salida` | USD 50 (rojo) |

Marca `[prueba]` en la referencia si `estado = 'seed'`.

### 2.3 Clasificación de operación (heurística frontend)

| Tipo | Regla | Color |
|------|-------|-------|
| Empeño | `descripcion` contiene "empeño" | Púrpura |
| Retiro | `descripcion` contiene "retira" | Rojo |
| Abono | `descripcion` contiene "abona" o "paga" | Azul |
| Apertura | `descripcion` contiene "apertura" | Esmeralda |
| Cierre | `descripcion` contiene "cierre" | Gris |
| Otro | Todo lo demás | Gris oscuro |

### 2.4 Paginación

- **50 registros por página** (constante `PAGE_SIZE`)
- Muestra: "Página X de Y · Z registros"
- Botones Anterior / Siguiente

---

## 3. Prefijos de referencia (tipos de documento SuperEfectivo)

| Prefijo | Significado |
|---------|-------------|
| EM | Empeños y pagos de interés |
| AE | Pagos cruzados entre tiendas (Super Pago) |
| RE | Western Union (pagos y reembolsos) |

---

## 4. Endpoint consumido

### `GET /api/joz/historial/`

**Parámetros query:**
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `page` | int | 1 | Página actual |
| `page_size` | int | 50 | Registros por página (máx 200) |
| `q` | string | — | Búsqueda en cliente, referencia, cédula, descripción |
| `tipo` | string | — | Filtro por tipo (Aporte/Retiro) |
| `almacen` | int | — | Código de almacén |
| `origen` | string | — | `real` (estado=cargado) o `prueba` (estado=seed) |
| `fecha_desde` | date | — | Fecha inicio (YYYY-MM-DD) |
| `fecha_hasta` | date | — | Fecha fin (YYYY-MM-DD) |

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "results": [
      {
        "id": 1,
        "date": "2026-04-21",
        "store": "ALMACEN 06",
        "anomalyType": "Aporte",
        "amount": 2.30,
        "entrada": 2.30,
        "salida": 0.0,
        "estado": "cargado",
        "analista": "ERODRIGUEZ",
        "referencia": "EM205225",
        "cliente": "YAMISELL JIMENEZ JIMENEZ",
        "numero_identificacion": "8957499",
        "descripcion": "PAGA 1 MES(ES) DE INTERÉS...",
        "hora_minutos": 653
      }
    ],
    "count": 6230,
    "page": 1,
    "page_size": 50
  }
}
```

---

## 5. Datos Actuales

- **Total transacciones:** 6,230
- **Almacenes:** 30
- **Cajeros:** 114
- **Moneda:** USD

---

## 6. Notas Técnicas

- **Archivo frontend:** `joz/frontend/src/pages/History.tsx`
- **Archivo backend:** `joz/backend/joz/views.py` (función `historial`)
- **Modelo:** `joz/backend/joz/models.py` → tabla `joz_transacciones`
- **Ordenamiento:** Fecha DESC, hora DESC (más recientes primero)
- **Moneda:** USD
