# Plan de Implementación - Joz/1-3-modulo-alertas

## Objetivo
Corregir la funcionalidad del módulo Alertas: filtros (nivel de riesgo y almacén), buscador, y visualización del tipo de anomalía solo como etiqueta.

## Branch de trabajo
- `Joz/1-3-modulo-alertas`

---

## Diagnóstico previo — bugs confirmados en código

> Esta sección fue elaborada leyendo el código real. No requiere diagnóstico adicional.

### Bug 1 — Filtro por nivel de riesgo nunca aplica (`views.py` línea 196-199)

**Causa**: El frontend envía `nivel_riesgo=Alto` (con mayúscula, en español). El backend hace:

```python
sev_inverso = {v: k for k, v in RIESGO_MAP.items()}
# resultado: {'low': 'baja', 'medium': 'media', 'high': 'critica'}
sev = sev_inverso.get(nivel_riesgo)  # sev_inverso.get('Alto') → None
```

`sev_inverso` tiene keys `'low'`, `'medium'`, `'high'` (valores en inglés), no `'Alto'`. El filtro nunca se activa.

**Fix**: Cambiar los `value` del Select de nivel en `Alerts.tsx` a los valores en inglés que ya usa el backend (`high`, `medium`, `low`). El backend no necesita cambios.

```tsx
// Alerts.tsx — Select de riesgo
<SelectItem value="high">Alto</SelectItem>
<SelectItem value="medium">Medio</SelectItem>
<SelectItem value="low">Bajo</SelectItem>
```

---

### Bug 2 — Filtro por almacén no está implementado en backend (`views.py` línea 186-205)

**Causa**: El view `alertas` no lee ni aplica ningún parámetro de almacén. El frontend envía `tienda=ALMACEN 01` (nombre formateado) pero el backend lo ignora completamente.

**Fix en dos partes**:

**a) Backend** — agregar campo `almacen_codigo` al resultado y el filtro:

```python
# En el view alertas, sección GET — después del filtro de estado existente:
almacen = request.GET.get('almacen', '').strip()
if almacen:
    qs = qs.filter(transaccion__almacen=almacen)
```

Y en cada resultado serializado agregar:
```python
'almacen_codigo': tx.almacen if tx else None,
```

**b) Frontend `Alerts.tsx`** — usar `almacen_codigo` para construir la lista de tiendas y enviar como parámetro al filtrar:

```tsx
// Mapeo al formatear resultados
almacenCodigo: a.almacen_codigo ?? null,

// Lista de tiendas única por código (no por nombre)
const stores = Array.from(
  new Map(alerts.filter(a => a.almacenCodigo != null)
    .map(a => [a.almacenCodigo, a.store])).entries()
)
// stores = [[1, 'ALMACEN 01'], [2, 'ALMACEN 02'], ...]

// En el Select de tiendas:
{stores.map(([codigo, nombre]) => (
  <SelectItem key={codigo} value={String(codigo)}>{nombre}</SelectItem>
))}

// En el fetch params:
almacen: storeFilter !== 'all' ? storeFilter : undefined,
// (reemplazar 'tienda' por 'almacen')
```

---

### Bug 3 — Buscador sin implementación en backend (`views.py`)

**Causa**: El frontend envía `q=<término>` en `getAlertas(params)`, pero el view `alertas` no tiene ningún filtro `q`. El parámetro se ignora.

**Fix en backend** — agregar después de los filtros existentes:

```python
q = request.GET.get('q', '').strip()
if q:
    qs = qs.filter(
        Q(tipo__icontains=q) |
        Q(descripcion__icontains=q) |
        Q(transaccion__almacen__icontains=q)
    )
```

Requiere `from django.db.models import Q` (ya importado en `views.py` línea 4).

---

### Bug 4 — `AlertsTable.tsx` usa colores del tema claro, no del dark theme

**Causa**: La tabla usa `bg-white`, `bg-gray-50`, `bg-green-100`, `text-green-800`, etc. El resto de la UI usa slate/amber.

**Fix en `AlertsTable.tsx`**:
- Header: `bg-slate-800 border-amber-500/20` + texto `text-amber-200/70`
- Filas: `bg-slate-900 hover:bg-slate-800/60` + texto `text-slate-200`
- Bordes: `divide-amber-500/10`
- Badges de riesgo:
  ```ts
  const riskColors = {
    low:    'bg-green-500/15 text-green-300 border-green-500/30',
    medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    high:   'bg-red-500/15 text-red-300 border-red-500/30',
  }
  ```
- Badges de estado:
  ```ts
  const statusColors = {
    pending:  'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    reviewed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    resolved: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  }
  ```

---

### Bug 5 — Tipo de anomalía muestra fallback de texto en lugar de solo etiqueta

**Causa**: `AlertsTable.tsx` línea 88 tiene:
```tsx
{alert.anomalyType || 'Sin descripción'}
```

**Fix**: Mostrar solo la etiqueta, sin texto alternativo descriptivo. Si no hay tipo, mostrar un badge neutro `—`.

```tsx
<Badge variant="outline" className="bg-slate-700/40 text-slate-300 border-slate-500/30 text-xs">
  {alert.anomalyType || '—'}
</Badge>
```

---

## Archivos a modificar

| Archivo | Cambios |
|---|---|
| `joz/frontend/src/pages/Alerts.tsx` | Valores del Select de riesgo (Bug 1), parámetro almacén en fetch (Bug 2b), tipo Alert extendido |
| `joz/frontend/src/components/AlertsTable.tsx` | Dark theme completo (Bug 4), etiqueta anomalía sin fallback texto (Bug 5) |
| `joz/backend/joz/views.py` | Filtro almacén (Bug 2a), filtro q buscador (Bug 3), campo `almacen_codigo` en resultados |

---

## Pasos de implementación

### 1. Backend — `joz/backend/joz/views.py`

En el view `alertas`, sección GET (a partir de línea 186):

1. Agregar lectura del parámetro `almacen` y filtro `transaccion__almacen`.
2. Agregar lectura del parámetro `q` con `Q(tipo__icontains=q) | Q(descripcion__icontains=q) | Q(transaccion__almacen__icontains=q)`.
3. Agregar `'almacen_codigo': tx.almacen if tx else None` en cada objeto serializado.

### 2. Frontend `Alerts.tsx`

1. Cambiar los `value` del Select de riesgo a `high`, `medium`, `low`.
2. Extender el tipo `Alert` con `almacenCodigo?: number | null`.
3. En el mapeo de resultados agregar `almacenCodigo: a.almacen_codigo ?? null`.
4. Cambiar la construcción de `stores` para usar `almacenCodigo` como clave y `store` como label.
5. En `SelectItem` de tiendas, usar el código numérico como `value`.
6. En `params` del fetch, cambiar `tienda` por `almacen`.

### 3. Frontend `AlertsTable.tsx`

1. Reemplazar todos los colores claros por equivalentes del dark theme (slate/amber).
2. Reemplazar la celda de `anomalyType` por un `Badge` sin texto alternativo descriptivo.

### 4. Validación manual

- [ ] Filtro "Alto" devuelve solo alertas con `severidad='alta'` o `'critica'`.
- [ ] Filtro "Medio" y "Bajo" funcionan correctamente.
- [ ] Filtrar por almacén devuelve solo alertas del almacén elegido.
- [ ] Combinar filtro nivel + almacén funciona.
- [ ] Buscador filtra por tipo de anomalía y descripción.
- [ ] Buscador con filtro activo no rompe resultados.
- [ ] UI de la tabla es legible en dark theme.
- [ ] Tipo de anomalía se muestra solo como etiqueta, sin texto `'Sin descripción'`.
- [ ] Estado vacío, carga y error funcionan correctamente.

---

## Criterios de aceptación (del checklist del cliente)

- El filtro por nivel funciona para `Alto`, `Medio` y `Bajo`.
- El filtro por almacén devuelve resultados consistentes con el almacén seleccionado.
- Los filtros de nivel y almacén pueden combinarse sin romper resultados.
- El buscador filtra correctamente.
- La UI no muestra descripciones ni ayudas visuales de tipo de anomalía.
- El tipo de anomalía se muestra solo como etiqueta.

## Notas

- `RIESGO_MAP` en `views.py` (`critica` → `high`) hace que la inversión del mapa omita `alta`. Si hay alertas con `severidad='alta'`, no aparecerán en el filtro `high`. Considerar si se debe filtrar `severidad__in=['alta', 'critica']` cuando el parámetro es `high`.
- El filtro de tiendas en frontend construye la lista a partir de los datos cargados (paginados). Si hay más de `page_size=50` alertas, las tiendas del resto no aparecen. Aceptable para este alcance.
