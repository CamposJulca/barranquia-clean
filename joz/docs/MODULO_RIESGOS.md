# Modulo: Riesgos -- Analisis de Riesgo por Almacen

**Ruta:** `/risks`
**Acceso:** Requiere autenticacion (token)
**URL:** https://joz-ccb.ngrok.io/risks

---

## 1. Descripcion General

Modulo de evaluacion de riesgo operativo que combina datos de transacciones, alertas y el modelo de scoring por tienda. Presenta distribucion grafica de niveles de riesgo, ranking inteligente de almacenes, tabla de riesgos operativos del modelo y tarjetas individuales por almacen.

Datos actuales: 30 almacenes evaluados, 1,600 alertas reales alimentando el scoring, distribucion de riesgo: 20 alto, 10 medio, 0 bajo.

---

## 2. Estructura Visual

### 2.1 Distribucion de Riesgos (grafica de pie)

Grafica circular (Recharts `PieChart`) que muestra la distribucion de los 30 almacenes por nivel:

| Nivel | Color | Cantidad | Calculo |
|-------|-------|----------|---------|
| Riesgo Alto | Rojo (`#ef4444`) | 20 | Almacenes con `nivel_riesgo = 'high'` |
| Riesgo Medio | Naranja (`#f97316`) | 10 | Almacenes con `nivel_riesgo = 'medium'` |
| Riesgo Bajo | Verde (`#22c55e`) | 0 | Almacenes con `nivel_riesgo = 'low'` |

**Fuente:** Tiendas del endpoint `GET /api/joz/stats/`, donde `nivel_riesgo` proviene del modelo `Riesgo` (scoring del motor de deteccion). El campo `anomalias_count` en cada tienda refleja alertas reales (no transacciones).

### 2.2 Ranking Inteligente (top 5 almacenes)

Muestra los 5 almacenes con mas alertas, cada uno con:

| Elemento | Descripcion |
|----------|-------------|
| Posicion | 1-5 en circulo dorado |
| Nombre | "ALMACEN XX" |
| Anomalias | Cantidad real de alertas (no transacciones) |
| Badge | Nivel de riesgo (Alto/Medio/Bajo) |
| Monto | Volumen operado en USD |
| Impacto | Calculado: `anomalias x monto`. Clasificacion: Bajo (<$5K), Medio ($5K-$20K), Alto ($20K-$50K), Critico (>$50K) |

### 2.3 Analisis Inteligente

Tarjeta con texto generado dinamicamente que describe al almacen de mayor riesgo con su cantidad de anomalias e impacto financiero.

### 2.4 Tabla: Riesgos Operativos (Modelo)

Datos de la tabla `joz_riesgos` (30 registros, uno por almacen), generados por la regla 11 del motor (Score por tienda).

| Columna | Campo | Descripcion |
|---------|-------|-------------|
| Categoria | `categoria` | "ALMACEN XX" + descripcion (txns, alertas, score, tasa) |
| Nivel | `nivel_riesgo` | Mapeado: `bajo`->low, `medio`->medium, `alto`->high |
| Probabilidad | `probabilidad` | Score 0-1, mostrado como porcentaje |
| Impacto | `impacto_estimado` | Monto total operado por el almacen (USD) |
| Accion | -- | Boton "Ver detalle" -> abre modal `RiskDetailModal` |

### 2.5 Modal de Detalle de Riesgo

Al hacer clic en "Ver detalle", se consulta `GET /api/joz/riesgos/{id}/` y muestra:
- Motivo del riesgo (categoria + descripcion)
- Datos asociados: nivel, probabilidad, impacto estimado, fecha de calculo
- Contexto: total alertas del nivel, alertas abiertas, tipos frecuentes

### 2.6 Tarjetas por Almacen (grid)

Grid de tarjetas `RiskCard` para los 30 almacenes, cada una con:
- Nombre del almacen
- Cantidad de anomalias (alertas reales, no transacciones)
- Indicador de nivel (punto coloreado + badge)

---

## 3. Endpoints consumidos

| Endpoint | Metodo | Datos utilizados |
|----------|--------|-----------------|
| `GET /api/joz/stats/` | GET | Tiendas (nombre, nivel_riesgo, anomalias_count) |
| `GET /api/joz/riesgos/` | GET | Riesgos del modelo (categoria, nivel, probabilidad, impacto) + tiendas |
| `GET /api/joz/riesgos/{id}/` | GET | Detalle de riesgo individual |
| `GET /api/joz/historial/?page_size=500` | GET | Montos por almacen (para calculo de impacto en ranking) |

### Ejemplo de respuesta `GET /api/joz/riesgos/`

```json
{
  "ok": true,
  "data": {
    "riesgos": [
      {
        "id": 1,
        "categoria": "ALMACEN 70 - 51 txns, 45 alertas, score 0.89, tasa 88.2%",
        "nivel_riesgo": "alto",
        "probabilidad": 0.89,
        "impacto_estimado": 125000.00,
        "created_at": "2026-04-21T14:30:00Z"
      }
    ],
    "tiendas": [
      {
        "nombre": "ALMACEN 70",
        "anomalias_count": 45,
        "nivel_riesgo": "high"
      }
    ]
  }
}
```

---

## 4. Calculo del Score de Riesgo por Tienda

El motor de deteccion calcula el score asi:

```
score = (tasa_anomalia x 0.4) + (score_promedio_alertas / 100 x 0.3) + (tasa_criticas x 5 x 0.3)
```

Donde:
- `tasa_anomalia` = alertas / transacciones del almacen (alertas reales, no transacciones)
- `score_promedio_alertas` = promedio de `score_anomalia` de las alertas del almacen
- `tasa_criticas` = alertas alta+critica / transacciones

Clasificacion:

| Score | Nivel |
|-------|-------|
| >= 0.7 o tasa_criticas >= 15% | Alto |
| >= 0.4 o tasa_criticas >= 5% | Medio |
| < 0.4 | Bajo |

---

## 5. Distribucion actual

| Nivel | Almacenes | Porcentaje |
|-------|-----------|------------|
| Alto | 20 | 66.7% |
| Medio | 10 | 33.3% |
| Bajo | 0 | 0% |
| **Total** | **30** | **100%** |

*Datos al 2026-04-21.*

---

## 6. Notas Tecnicas

- **Archivo frontend:** `joz/frontend/src/pages/Risks.tsx`
- **Componentes:** `RiskCard` (`joz/frontend/src/components/RiskCard.tsx`), `RiskDetailModal` (`joz/frontend/src/components/RiskDetailModal.tsx`)
- **Archivo backend:** `joz/backend/joz/views.py` (funciones `riesgos`, `riesgo_detalle`)
- **Modelo de datos:** `joz/backend/joz/models.py` -> tabla `joz_riesgos`
- **Motor de deteccion:** `joz/backend/joz/management/commands/detectar_anomalias.py` (regla Score por tienda)
- **Libreria graficas:** Recharts (`PieChart`, `Pie`, `Cell`, `Legend`, `Tooltip`)
- **Moneda:** USD (Balboas panamenos, equivalente 1:1)
- **Importante:** `anomalias_count` refleja alertas reales generadas por el motor de deteccion. `nivel_riesgo` proviene del modelo `Riesgo` con scoring ponderado, no de ratios de volumen.
