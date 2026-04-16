# Plan de Implementación - Joz/1-4-modulo-riesgos

## Objetivo
Implementar una vista de detalle por riesgo en JOZ (modal), mostrando motivo del riesgo, datos asociados y contexto de la anomalía.

## Branch de trabajo
- `Joz/1-4-modulo-riesgos`

## Alcance (Checklist 1.4)
- [ ] Crear una vista de detalle para cada riesgo.
- [ ] Incluir: motivo del riesgo, datos asociados, contexto de la anomalía.
- [ ] Implementación mediante **modal** (decisión tomada).

---

## Diagnóstico del código — estado real

### Distinción importante: tiendas vs modelo Riesgo

`Risks.tsx` actualmente muestra **tiendas/almacenes** obtenidos de `getStats()` (endpoint `/stats/`), NO los registros del modelo `Riesgo`. Son dos cosas distintas:

- **Tiendas con riesgo** (`stats.tiendas`): almacenes con `nivel_riesgo` calculado por volumen de transacciones. Estos se muestran en `RiskCard` y en el ranking.
- **Modelo `Riesgo`** (`joz_riesgos`): entidades de riesgo operativo con `categoria`, `descripcion`, `nivel`, `probabilidad`, `impacto_estimado`, `calculado_en`. Actualmente **no se muestran en ninguna parte del frontend**.

El detalle pedido por el cliente se refiere al **modelo `Riesgo`** (vista de detalle por cada riesgo operativo). Esto requiere:
1. Agregar una sección en `Risks.tsx` que liste los registros del modelo `Riesgo` (llamando a `getRiesgos()` que ya existe en `api.js`).
2. Añadir botón "Ver detalle" por cada riesgo de esa lista.
3. **No modificar** la sección existente de tiendas/almacenes.

### Estado actual de archivos relevantes

| Archivo | Estado |
|---|---|
| `Risks.tsx` | Muestra tiendas de stats. No consume `getRiesgos()`. Sin detalle. |
| `RiskCard.tsx` | Sin callback de detalle. **Usa tema claro** (`bg-green-100`, `bg-orange-100`, `bg-red-100`). |
| `api.js` | `getRiesgos()` ya existe (`GET /riesgos/`). Falta `getRiesgoDetalle(id)`. |
| `views.py` | `GET /riesgos/` existe. **No existe** `GET /riesgos/<id>/`. |
| `urls.py` | No tiene ruta `riesgos/<int:pk>/`. |
| `models.py` | `Riesgo` tiene: `categoria`, `descripcion`, `nivel`, `probabilidad`, `impacto_estimado`, `calculado_en`. **Sin FK a `Alerta` ni `Transaccion`**. |

### Modelo `Riesgo` (campos disponibles)
```python
categoria        = CharField(max_length=200)
descripcion      = TextField(blank=True)
nivel            = CharField  # 'bajo' | 'medio' | 'alto'
probabilidad     = FloatField(null=True)
impacto_estimado = DecimalField(null=True)
calculado_en     = DateTimeField(auto_now_add=True)
```

---

## Diseño funcional del detalle

El modal muestra tres secciones:

### 1. Motivo del riesgo
- `categoria` → título principal
- `descripcion` → texto explicativo (fallback `—`)

### 2. Datos asociados
- `nivel` → badge con color (`bajo/medio/alto`)
- `probabilidad` → porcentaje (e.g. `0.72` → `72%`), fallback `—`
- `impacto_estimado` → formato moneda COP, fallback `—`
- `calculado_en` → fecha formateada

### 3. Contexto de la anomalía
Como `Riesgo` no tiene FK directa a `Alerta`, el backend construye el contexto así:

**Mapeo nivel → severidad Alerta:**
```python
NIVEL_A_SEVERIDAD = {
    'alto':  ['alta', 'critica'],
    'medio': ['media'],
    'bajo':  ['baja'],
}
```

**Datos a retornar:**
```python
severidades = NIVEL_A_SEVERIDAD.get(riesgo.nivel, [])
alertas_qs  = Alerta.objects.filter(severidad__in=severidades)

contexto = {
    'total_alertas_nivel':  alertas_qs.count(),
    'alertas_abiertas':     alertas_qs.filter(estado='abierta').count(),
    'tipos_frecuentes':     list(
        alertas_qs.values_list('tipo', flat=True)
        .distinct()[:5]
    ),
}
```

---

## Payload del endpoint `GET /riesgos/<id>/`

```json
{
  "ok": true,
  "data": {
    "id": 1,
    "motivo_riesgo": {
      "categoria": "Concentración operativa",
      "descripcion": "Varios almacenes superan umbral de transacciones."
    },
    "datos_asociados": {
      "nivel": "alto",
      "nivel_riesgo": "high",
      "probabilidad": 0.72,
      "impacto_estimado": 15000000.00,
      "calculado_en": "2026-04-10T14:30:00Z"
    },
    "contexto_anomalia": {
      "total_alertas_nivel": 34,
      "alertas_abiertas": 12,
      "tipos_frecuentes": ["Retiro atípico", "Aporte duplicado", "Monto fuera de rango"]
    }
  }
}
```

---

## Cambios técnicos

### Backend

**`joz/backend/joz/views.py`** — agregar vista de detalle:
```python
@api_view(['GET'])
def riesgo_detalle(request, pk):
    try:
        r = Riesgo.objects.get(pk=pk)
    except Riesgo.DoesNotExist:
        return _err('Riesgo no encontrado.', status.HTTP_404_NOT_FOUND)

    NIVEL_A_SEVERIDAD = {
        'alto':  ['alta', 'critica'],
        'medio': ['media'],
        'bajo':  ['baja'],
    }
    severidades = NIVEL_A_SEVERIDAD.get(r.nivel, [])
    alertas_qs  = Alerta.objects.filter(severidad__in=severidades)

    return Response(_ok({
        'id': r.id,
        'motivo_riesgo': {
            'categoria':   r.categoria,
            'descripcion': r.descripcion or '—',
        },
        'datos_asociados': {
            'nivel':             r.nivel,
            'nivel_riesgo':      NIVEL_MAP.get(r.nivel, 'low'),
            'probabilidad':      r.probabilidad,
            'impacto_estimado':  float(r.impacto_estimado) if r.impacto_estimado else None,
            'calculado_en':      r.calculado_en.isoformat(),
        },
        'contexto_anomalia': {
            'total_alertas_nivel': alertas_qs.count(),
            'alertas_abiertas':    alertas_qs.filter(estado='abierta').count(),
            'tipos_frecuentes':    list(
                alertas_qs.values_list('tipo', flat=True).distinct()[:5]
            ),
        },
    }))
```

**`joz/backend/joz/urls.py`** — agregar ruta:
```python
path('riesgos/<int:pk>/', views.riesgo_detalle, name='joz-riesgo-detalle'),
```

### Frontend

**`joz/frontend/src/services/api.js`** — agregar cliente:
```js
export const getRiesgoDetalle = async (id) => {
  const res = await api.get(`/riesgos/${id}/`)
  return unwrap(res)
}
```

**`joz/frontend/src/components/RiskDetailModal.tsx`** — crear componente nuevo con:
- Props: `riesgoId: number | null`, `onClose: () => void`
- Estados: `loading`, `error`, `data`
- Llama `getRiesgoDetalle(riesgoId)` al montar
- Muestra las tres secciones del detalle
- Dark theme: slate/amber
- Cierre con botón X y clic en overlay

**`joz/frontend/src/pages/Risks.tsx`** — agregar sección de riesgos del modelo:
- Llamar `getRiesgos()` en el `useEffect` ya existente (junto a `getStats` y `getHistorial`).
- Agregar estado `const [riesgos, setRiesgos] = useState([])` y `const [selectedRiesgoId, setSelectedRiesgoId] = useState<number | null>(null)`.
- Renderizar `<RiskDetailModal>` condicionalmente.
- Agregar sección nueva debajo del insight existente con tabla/lista de riesgos + botón "Ver detalle" por fila.
- **No modificar** las secciones existentes de distribución, ranking ni grid de tiendas.

**`joz/frontend/src/components/RiskCard.tsx`** — corregir tema:
- Reemplazar colores claros por dark theme:
  ```ts
  const riskConfig = {
    low:    { color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: 'Bajo',  dotColor: 'bg-emerald-400' },
    medium: { color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',      label: 'Medio', dotColor: 'bg-amber-400'   },
    high:   { color: 'bg-red-500/15 text-red-300 border-red-500/30',            label: 'Alto',  dotColor: 'bg-red-400'     },
  }
  ```
- Card: `className="bg-slate-800 border-amber-500/20 p-4 hover:bg-slate-700/60 transition-colors"`
- Texto principal: `text-slate-100`
- Subtexto: `text-amber-200/50`

---

## Pasos de implementación

### 1) Backend
- [ ] Implementar `riesgo_detalle` en `views.py`.
- [ ] Agregar ruta en `urls.py`.

### 2) Frontend — servicio
- [ ] Agregar `getRiesgoDetalle(id)` en `api.js`.

### 3) Frontend — modal
- [ ] Crear `RiskDetailModal.tsx` con estados loading/error/success, dark theme.

### 4) Frontend — Risks.tsx
- [ ] Agregar `getRiesgos()` al fetch inicial.
- [ ] Agregar estado `selectedRiesgoId` y renderizar modal.
- [ ] Agregar sección con lista de riesgos del modelo + botón "Ver detalle".

### 5) Frontend — RiskCard.tsx
- [ ] Migrar al dark theme.

### 6) Validación
- [ ] Abrir detalle de múltiples riesgos.
- [ ] Verificar las tres secciones (motivo, datos, contexto).
- [ ] Probar riesgo inexistente (404).
- [ ] Verificar que secciones existentes de Risks.tsx no regresionan.

---

## Criterios de aceptación
- Existe botón "Ver detalle" por cada riesgo del modelo listado.
- El detalle muestra motivo, datos asociados y contexto de anomalía.
- El modal abre y cierra correctamente.
- Las secciones existentes de Risks.tsx (tiendas, ranking, gráfico) no se ven afectadas.
- UI mantiene consistencia dark theme (slate/amber).
