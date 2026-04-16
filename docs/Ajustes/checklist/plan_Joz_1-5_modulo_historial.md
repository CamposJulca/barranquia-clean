# Plan de Implementación - Joz/1-5-modulo-historial

## Objetivo
Ajustar el módulo **Historial** de JOZ: lógica de categorización de operaciones, filtro visual de datos reales vs prueba, paginación, debounce en buscador y estados de UX.

## Branch de trabajo
- `Joz/1-5-modulo-historial`

## Alcance (Checklist 1.5)
- [ ] Revisar y corregir la lógica implementada del historial.
- [ ] Validar la lógica contra los criterios acordados con el cliente.
- [ ] Ajustar reglas de registro en historial.
- [ ] Ajustar la validación de datos de prueba vs datos reales.

---

## Diagnóstico del código — estado real

### Backend `views.py` → `historial` (línea 354)

El endpoint ya está funcional con filtros por fecha, tipo, almacén y `q`. Hallazgos relevantes:

| Campo en respuesta | Valor actual | Problema |
|---|---|---|
| `anomalyType` | `t.tipo or 'Sin tipo'` | Correcto — contiene 'Aporte', 'Retiro'. Frontend lo ignora. |
| `resultado` | `'investigating'` hardcodeado | **No lo usa el frontend. Eliminar.** |
| `estado` | `t.estado` | **Ya está en la respuesta.** El frontend no lo usa pero es el campo clave para prueba vs real. |
| Filtro `origen` | No existe | Falta agregar: `origen=real` → `estado='cargado'`; `origen=prueba` → `estado='seed'`. |

**El `estado` ya se expone en el backend** — no requiere cambio de modelo ni nuevo campo. Solo falta el filtro y el uso en frontend.

Valores conocidos del campo `Transaccion.estado`:
- `'cargado'` → dato real (cargado por ETL).
- `'seed'` → dato de prueba (generado por seed).

### Frontend `History.tsx`

| Problema | Detalle |
|---|---|
| Ignora `anomalyType` (= `t.tipo`) | Usa heurística `categorizar(descripcion)` que infiere de texto libre — frágil. |
| Sin `loading` state | No hay spinner ni indicador mientras carga. |
| Sin `error` state | Si `getHistorial()` falla, la tabla queda vacía silenciosamente. |
| Sin estado vacío | No hay mensaje si no hay resultados. |
| Debounce ausente | `useEffect([searchTerm])` dispara fetch en cada tecla. |
| Sin paginación UI | Backend devuelve `count/page/page_size` pero frontend ignora `count` y pide `page_size: 100`. |
| Sin filtro de origen | No hay forma de ver solo datos reales o solo de prueba. |
| Padding de tabla | Headers `<th>` sin clases → tabla visualmente apretada. |

---

## Criterios funcionales definidos

- **Dato real**: `estado='cargado'` (origen: ETL).
- **Dato de prueba**: `estado='seed'` (origen: seed).
- **Tipos de operación válidos**: los que devuelve el campo `t.tipo` del ETL ('Aporte', 'Retiro'). La heurística sobre `descripcion` se mantiene solo como enriquecimiento opcional.
- **Campos a mostrar en tabla**: referencia, fecha, almacén, tipo de operación, cliente, descripción, cajero, entrada, salida.

---

## Cambios técnicos

### Backend — `joz/backend/joz/views.py`

**1. Agregar filtro `origen`** (después de los filtros existentes):

```python
origen = request.GET.get('origen', '').strip()
if origen == 'real':
    qs = qs.filter(estado='cargado')
elif origen == 'prueba':
    qs = qs.filter(estado='seed')
# 'todos' o vacío: sin filtro adicional
```

**2. Eliminar campo `resultado` hardcodeado** de los resultados serializados (línea 399):

```python
# Eliminar esta línea:
'resultado':   'investigating',
```

El campo `estado` ya está en la respuesta y es suficiente.

---

### Frontend — `joz/frontend/src/pages/History.tsx`

**1. Usar `anomalyType` directamente como categoría principal**

El backend ya retorna `anomalyType = t.tipo` ('Aporte', 'Retiro'). Usar ese valor. Mantener `categorizar(descripcion)` solo como fallback si `anomalyType` no tiene valor reconocido.

Actualizar `tipoColors` para incluir los valores reales del backend:

```ts
const tipoColors: Record<string, string> = {
  Aporte:   'bg-green-500/20 text-green-300 border border-green-500/30',
  Retiro:   'bg-red-500/20 text-red-300 border border-red-500/30',
  Empeño:   'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  Abono:    'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  Apertura: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  Cierre:   'bg-slate-600/40 text-slate-300 border border-slate-500/30',
  Otro:     'bg-slate-700/40 text-slate-400 border border-slate-600/30',
}
```

Lógica de resolución de categoría:

```ts
const resolverCategoria = (anomalyType: string, descripcion: string) => {
  if (anomalyType && anomalyType !== 'Sin tipo') return anomalyType
  return categorizar(descripcion)  // fallback heurístico
}
```

**2. Agregar estados `loading` y `error`**

```ts
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
```

Mostrar:
- Mientras carga: spinner o mensaje centrado con clase `text-amber-200/60`.
- En error: card roja con `AlertTriangle` y botón Reintentar (mismo patrón que `Alerts.tsx`).
- Sin resultados: mensaje centrado `"No se encontraron registros con los filtros aplicados."`.

**3. Debounce del buscador**

Implementar con `useRef` y `setTimeout`. **No usar librería externa.**

```ts
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

const handleSearch = (value: string) => {
  setSearchTerm(value)
  if (debounceRef.current) clearTimeout(debounceRef.current)
  debounceRef.current = setTimeout(() => {
    setDebouncedSearch(value)
  }, 300)
}
```

El `useEffect` de fetch debe depender de `debouncedSearch`, no de `searchTerm`.

**4. Filtro de origen (datos reales vs prueba)**

Agregar estado `const [origenFilter, setOrigenFilter] = useState('todos')` y `Select` con opciones:

```tsx
<SelectItem value="todos">Todos</SelectItem>
<SelectItem value="real">Solo reales</SelectItem>
<SelectItem value="prueba">Solo prueba</SelectItem>
```

Enviar en params:

```ts
origen: origenFilter !== 'todos' ? origenFilter : undefined,
```

**5. Paginación básica**

Agregar estado `const [page, setPage] = useState(1)` y leer `count` de la respuesta.

```ts
const [count, setCount] = useState(0)
const PAGE_SIZE = 50

// En fetch:
setCount(data.count ?? 0)

// UI bajo la tabla:
const totalPages = Math.ceil(count / PAGE_SIZE)
```

Controles prev/next:

```tsx
<div className="flex items-center justify-between px-4 py-3 border-t border-amber-500/10">
  <span className="text-xs text-amber-200/60">
    Página {page} de {totalPages} · {count} registros
  </span>
  <div className="flex gap-2">
    <Button size="sm" variant="outline" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
      Anterior
    </Button>
    <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
      Siguiente
    </Button>
  </div>
</div>
```

El `useEffect` debe incluir `page` en sus dependencias.

**6. Padding en tabla**

Headers y celdas deben tener `px-4 py-3`:

```tsx
<th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-amber-200/70">Ref</th>
// ídem para todas las columnas
```

**7. Indicador visual de origen en filas (opcional pero recomendado)**

Si `r.estado === 'seed'`, mostrar badge sutil en la fila:

```tsx
{r.estado === 'seed' && (
  <span className="ml-2 text-xs text-slate-400 italic">[prueba]</span>
)}
```

---

## Archivos a modificar

| Archivo | Cambios |
|---|---|
| `joz/backend/joz/views.py` | Filtro `origen`, eliminar `resultado: 'investigating'` |
| `joz/frontend/src/pages/History.tsx` | Todo lo listado arriba |

`api.js` no requiere cambios — `getHistorial(params)` ya acepta params genéricos.

---

## Pasos de implementación

### 1) Backend
- [ ] Agregar filtro `origen` en `historial` view.
- [ ] Eliminar campo `resultado: 'investigating'` de la respuesta.

### 2) Frontend
- [ ] Agregar estados `loading`, `error`, vacío.
- [ ] Implementar debounce con `useRef` + `setTimeout` (300ms).
- [ ] Agregar filtro de origen con `Select`.
- [ ] Actualizar `tipoColors` con 'Aporte' y 'Retiro'.
- [ ] Usar `resolverCategoria(anomalyType, descripcion)`.
- [ ] Agregar paginación básica con prev/next.
- [ ] Corregir padding en headers y celdas de tabla.
- [ ] Agregar badge `[prueba]` en filas con `estado='seed'`.

### 3) Validación
- [ ] Filtro `origen=real` devuelve solo transacciones con `estado='cargado'`.
- [ ] Filtro `origen=prueba` devuelve solo transacciones con `estado='seed'`.
- [ ] Buscador con debounce: no dispara fetch en cada tecla sino 300ms después de parar.
- [ ] Paginación correcta: página 2 devuelve registros distintos a página 1.
- [ ] Filtros combinados (`q` + `origen` + `página`) funcionan sin romper resultados.
- [ ] Estado de error visible si el backend no responde.
- [ ] Sin resultados muestra mensaje, no tabla vacía.

---

## Criterios de aceptación
- El historial distingue visualmente datos reales de datos de prueba.
- El filtro de origen funciona correctamente.
- El buscador tiene debounce y no satura el backend.
- La paginación funciona y muestra el total de registros.
- Los tipos de operación se muestran correctamente ('Aporte', 'Retiro').
- Los estados de loading, error y vacío son visibles.
- La tabla tiene padding correcto y es legible.
