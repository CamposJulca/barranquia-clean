# Módulo: Detalle de Almacén — Vista Individual

**Ruta:** `/store/:name`
**Acceso:** Requiere autenticación (token)
**URL:** https://joz-ccb.ngrok.io/store/ALMACEN%2006

---

## 1. Descripción General

Vista de detalle de un almacén individual. Se accede haciendo clic en una tarjeta de almacén desde el Dashboard. Muestra KPIs financieros del almacén y la tabla completa de sus transacciones.

---

## 2. Estructura Visual

### 2.1 Header

- Subtítulo: "Detalle por almacén"
- Título: "Almacén: ALMACEN XX" (tomado del parámetro de URL `:name`)

### 2.2 KPIs (4 tarjetas)

| Tarjeta | Cálculo | Descripción |
|---------|---------|-------------|
| Transacciones | `data.length` | Total de transacciones del almacén |
| Ingresos | `sum(entrada)` | Total de entradas en USD |
| Retiros | `sum(salida)` | Total de salidas en USD |
| Balance | `entradas - salidas` | Balance neto en USD |

### 2.3 Tabla de Transacciones

| Columna | Descripción |
|---------|-------------|
| Ref | Referencia del documento |
| Fecha | Fecha de la transacción |
| Operación | Tipo clasificado (Empeño, Retiro, Abono, etc.) con badge coloreado |
| Cliente | Nombre del cliente |
| Descripción | Texto libre del movimiento |
| Cajero | Usuario cajero que registró |
| Entrada | Monto de entrada en USD (verde) |
| Salida | Monto de salida en USD (rosa) |

---

## 3. Fuente de datos

Se consulta `GET /api/joz/historial/?page_size=500` y se filtra en frontend por `store === name`. Esto significa que:

- Solo se muestran las primeras 500 transacciones que coincidan
- Si el almacén tiene más de 500 transacciones en el historial global, se trunca
- No hay paginación en esta vista

---

## 4. Clasificación de operación

Misma heurística que History.tsx:

| Tipo | Regla |
|------|-------|
| Empeño | `descripcion` contiene "empeño" |
| Retiro | `descripcion` contiene "retira" |
| Abono | `descripcion` contiene "abona" o "paga" |
| Apertura | `descripcion` contiene "apertura" |
| Cierre | `descripcion` contiene "cierre" |
| Otro | Todo lo demás |

---

## 5. Notas Técnicas

- **Archivo frontend:** `joz/frontend/src/pages/StoreDetail.tsx`
- **Router:** `{ path: "store/:name", element: <StoreDetail /> }`
- **Navegación:** Desde Dashboard → clic en tarjeta de almacén → `navigate('/store/{nombre}')`
- **Moneda:** USD
- **Limitación:** Máximo 500 transacciones por la consulta `page_size=500`
