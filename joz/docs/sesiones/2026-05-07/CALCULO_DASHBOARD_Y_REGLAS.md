# JOZ — Cómo se calculan Dashboard, Alertas, Riesgos y Reglas

**Fecha del informe:** 2026-05-07
**Rango ejemplo:** 2026-05-05 → 2026-05-06
**Fuente:** PostgreSQL `joz` en contenedor Docker `barranquia_postgres` *(la BD que sirve el dashboard, NO el `localhost:5432` local)*

> Este documento explica las cuatro vistas principales de JOZ — **Dashboard**, **Alertas**, **Riesgos** y **Reglas** — usando como ejemplo el rango 5-6 de mayo de 2026. La idea es que cualquier persona del equipo o auditor pueda reproducir cada número viendo la BD.

**Tablas involucradas:**
- `joz_transacciones` — todos los movimientos extraídos del ERP de SuperEfectivo (23,247 filas, rango global 27-mar → 5-may).
- `joz_alertas` — anomalías generadas por el motor de detección (2,653 filas, todas en estado `abierta` hoy).
- `joz_riesgos` — score por almacén calculado en post-proceso (31 registros: 28 alto, 1 medio, 2 bajo).
- `joz_reglas_deteccion` — las 3 reglas administrables (zscore, conteo, ratio).
- `joz_etl_log` — auditoría de cada corrida del ETL.

---

## 1. Dashboard (`/dashboard`)

Vista ejecutiva del flujo financiero. Backend: `joz/backend/joz/views.py::stats`. Frontend: `joz/frontend/src/pages/Dashboard.tsx`.

### 1.1 Filtro base — operaciones internas excluidas

Toda agregación financiera del dashboard excluye las **operaciones internas** del cajero (no son flujo de cliente):

```sql
NOT (
     lower(descripcion) LIKE 'apertura%'         -- apertura de caja
  OR lower(descripcion) LIKE 'cierre%'            -- cierre de caja
  OR lower(descripcion) LIKE '%traslado%'         -- traslados entre puntos
  OR lower(descripcion) LIKE '%transferencia entre%'
  OR lower(descripcion) LIKE '%movimiento entre almac%'
)
```

Las aperturas/cierres y traslados se exponen aparte en el bloque `operaciones_internas` para transparencia.

### 1.2 Cómo se calcula cada KPI

| KPI dashboard | Cálculo |
|---|---|
| `total_transacciones` | `COUNT(*)` en el rango (incluye operaciones internas) |
| `total_monto` | `SUM(monto)` (sin filtro) |
| `total_entrada` / `total_salida` | `SUM(entrada/salida) FILTER (NOT internas)` |
| `aportes_count`, `aportes_monto` | `tipo='Aporte' AND NOT internas` (suma `entrada`) |
| `retiros_count`, `retiros_monto` | `tipo='Retiro' AND NOT internas` (suma `salida`) |
| `por_almacen[].total` | `SUM(monto) FILTER (NOT internas)` por almacén |
| `por_almacen[].cantidad` | `COUNT(DISTINCT referencia) + COUNT(filas sin referencia)` — el ERP descompone una operación en varios asientos contables; deduplicar por `referencia` reconstruye la operación real |
| `por_tipo[*]` | Agrupado por categoría inferida de la descripción (Empeño, Retiro empeño, Abono/Interés, Western, Apertura, Cierre, Traslado, Otro) |
| `anomalias_detectadas`, `alertas_*` | `joz_alertas` filtradas por la fecha de la transacción asociada |
| `distribucion_riesgo` | Conteo de `joz_riesgos.nivel` (calculado por el post-proceso del motor) |

### 1.3 Verificación numérica — 5-6 mayo 2026

#### KPIs globales

| Indicador | Valor |
|---|---:|
| Filas brutas (incluye internas) | 2,849 |
| **Operaciones netas** | **2,612** |
| Aportes (count) | 1,781 |
| Retiros (count) | 831 |
| Aperturas/cierres excluidas | 194 |
| Traslados excluidos | 43 |
| **Total monto neto** | **USD 316,705.24** |
| **Total entrada neto** | **USD 164,143.82** |
| **Total salida neto** | **USD 152,561.42** |

#### Por almacén — la suma cuadra con el global

| Almacén | Operaciones | Total (USD) | Entrada (USD) | Salida (USD) |
|---:|---:|---:|---:|---:|
| 17 | 145 | 46,555.28 | 18,349.29 | 28,205.99 |
|  5 | 123 | 44,294.38 | 30,268.54 | 14,025.84 |
|  3 |  73 | 21,387.78 |  8,977.81 | 12,409.97 |
|  2 | 142 | 18,068.03 | 10,830.19 |  7,237.84 |
| 12 | 152 | 17,845.71 |  9,450.94 |  8,394.77 |
|  6 | 118 | 15,688.54 |  9,359.75 |  6,328.79 |
| 16 |  95 | 13,099.20 |  4,875.85 |  8,223.35 |
| 25 |  55 | 12,293.44 |  5,002.26 |  7,291.18 |
| 15 | 153 | 10,894.80 |  7,589.55 |  3,305.25 |
| 22 |  52 |  9,943.05 |  6,196.60 |  3,746.45 |
| 19 |  56 |  9,301.06 |  6,570.80 |  2,730.26 |
|  9 |  84 |  8,996.97 |  4,947.22 |  4,049.75 |
| 21 |  61 |  8,154.24 |  4,045.72 |  4,108.52 |
|  7 |  57 |  8,150.31 |  4,373.29 |  3,777.02 |
| 13 |  76 |  6,972.18 |  2,185.00 |  4,787.18 |
| 18 |  68 |  6,704.37 |  3,813.37 |  2,891.00 |
| 14 |  56 |  6,159.66 |  3,128.66 |  3,031.00 |
| 10 |  91 |  5,800.57 |  2,900.17 |  2,900.40 |
|  4 |  63 |  5,511.59 |  3,287.59 |  2,224.00 |
| 20 |  55 |  5,373.26 |  2,559.97 |  2,813.29 |
| 27 |  19 |  4,629.25 |  3,193.67 |  1,435.58 |
|  8 |  40 |  4,299.35 |  1,710.53 |  2,588.82 |
| 26 |  57 |  4,124.56 |  1,963.59 |  2,160.97 |
|  1 |  28 |  4,055.70 |  1,977.70 |  2,078.00 |
| 30 |  54 |  3,895.93 |  2,091.21 |  1,804.72 |
| 11 |  37 |  3,887.81 |  1,723.49 |  2,164.32 |
| 29 |  41 |  3,849.71 |  1,558.55 |  2,291.16 |
| 24 |  27 |  2,535.75 |    739.75 |  1,796.00 |
| 23 |  29 |  2,232.76 |    472.76 |  1,760.00 |
| 70 |   1 |  2,000.00 |      0.00 |  2,000.00 |
| **Σ** | **2,058** | **316,705.24** | **164,143.82** | **152,561.42** |

> **Cuadre OK.** La suma del campo `total` por almacén = USD 316,705.24, idéntica al `total_monto` neto global. Igual para entrada y salida. La diferencia entre las 2,058 operaciones contadas con `COUNT(DISTINCT referencia)` y las 2,612 transacciones netas se debe a que existen filas **sin referencia** (que se cuentan una a una) y filas con referencia compartida del mismo asiento contable (que se deduplican). Los dos valores son correctos para sus respectivos propósitos.

---

## 2. Alertas (`/alertas`)

Bandeja de anomalías generadas por las 3 reglas de detección. Backend: `joz/backend/joz/views.py::alertas`. Frontend: `joz/frontend/src/pages/Alerts.tsx`.

### 2.1 Modelo de datos — `joz_alertas`

Cada alerta es una fila ligada a una `Transaccion`:

| Campo | Tipo | Significado |
|---|---|---|
| `transaccion_id` | FK | La transacción donde se detectó la anomalía |
| `tipo` | string | Nombre de la regla que la generó (ej. "Monto inusual") |
| `severidad` | enum | `baja` / `media` / `alta` / `critica` |
| `estado` | enum | `abierta` / `en_revision` / `resuelta` / `descartada` |
| `score_anomalia` | float (0-100) | Qué tan anómala es la transacción según la regla |
| `descripcion` | text | Texto explicando por qué saltó (incluye montos, cliente, almacén) |
| `generado_en` | timestamp | Cuándo el motor creó la alerta (no es la fecha de la transacción) |
| `actualizado_en` | timestamp | Cuándo cambió el estado por última vez |

### 2.2 Estados y flujo de trabajo

```
[Motor de detección]
        ↓
    abierta  ────────────────────────────────────┐
        │                                          │
        ├─→ en_revision (analista la está mirando)
        │           │
        │           ├──→ resuelta   (anomalía confirmada — fue real)
        │           │
        │           └──→ descartada (falso positivo — el motor se equivocó)
        │
        └─→ resuelta   (atajo)
        └─→ descartada (atajo)
```

Hoy en la BD las **2,653 alertas están en `abierta`** porque ningún analista las ha tocado todavía. Cuando se empiece a curar la bandeja, los estados `resuelta`/`descartada` serán el feedback que entrene la IA supervisada (sección 5).

### 2.3 Filtros disponibles en la página

| Filtro frontend | Param backend | Comportamiento |
|---|---|---|
| Búsqueda libre | `q` | Match contra `tipo` y `descripcion` (icontains) |
| Nivel de riesgo | `nivel_riesgo` | `low`/`medium`/`high` se traduce a severidades: `low`→`baja`, `medium`→`media`, `high`→`alta+critica` |
| Tipo de anomalía | `tipo` | Match exacto contra `Alerta.tipo` |
| Estado | `estado` | Filtra por uno de los 4 estados |
| Almacén | `almacen` | Filtro por código numérico (acepta "12" o "ALMACEN 12") |
| Fecha desde/hasta | `fecha_desde`, `fecha_hasta` | Filtro por **fecha de la transacción** (no por `generado_en`) |

> El dropdown de "Tipo de anomalía" merge los tipos históricos de `joz_alertas` con los nombres de las reglas activas. Así, si se activa una regla nueva que aún no ha generado alertas, igual aparece en el filtro.

### 2.4 Acciones disponibles

| Acción | Endpoint | Efecto |
|---|---|---|
| Cambiar estado de una | `PATCH /alertas/{id}/` con `{estado}` | Actualiza `estado` y `actualizado_en` |
| Cambiar estado masivo | `PATCH /alertas/` con `{ids:[…], estado}` | Bulk update sobre IDs seleccionados |
| Eliminar una | `DELETE /alertas/{id}/` | Borra la fila |
| Eliminar masivo | `DELETE /alertas/` con `{ids:[…]}` | Bulk delete |
| Eliminar TODO | `DELETE /alertas/` con `{todos:true}` | Borra todas las alertas (ojo, destructivo) |
| Recalcular | `POST /detectar-anomalias/` con `{limpiar, dias}` | Lanza `manage.py detectar_anomalias` en thread aparte |

### 2.5 Verificación numérica — 5-6 mayo 2026

**268 alertas vigentes** ligadas a transacciones de ese rango (después del recálculo del 7-mayo):

Por severidad:

| Severidad | Cantidad |
|---|---:|
| Crítica | 28 |
| Alta | 55 |
| Media | 185 |
| **Total** | **268** |

Por regla:

| Regla | Crítica | Alta | Media | Total |
|---|---:|---:|---:|---:|
| Monto inusual | 28 | 47 | 120 | **195** |
| Concentración de cajero |  — |  8 | 44 |  **52** |
| Fraccionamiento de operaciones | — |  — | 21 |  **21** |
| **Σ** | **28** | **55** | **185** | **268** |

> **Nota:** Cuando este informe se generó por primera vez había 210 alertas en el rango. Después de correr `python manage.py detectar_anomalias --dias 2` (sin `--limpiar`) se sumaron 58 nuevas → 268.

---

## 3. Riesgos (`/riesgos`)

Vista de scoring operativo por almacén — combina volumen de anomalías, calidad del score y proporción de alertas graves para priorizar auditorías. Backend: `joz/backend/joz/views.py::riesgos` (+ `riesgo_detalle`). Frontend: `joz/frontend/src/pages/Risks.tsx`.

### 3.1 Modelo de datos — `joz_riesgos`

Una fila por almacén (categoría = `"ALMACEN XX"`):

| Campo | Tipo | Significado |
|---|---|---|
| `categoria` | string | `"ALMACEN 02"`, `"ALMACEN 17"`, etc. |
| `nivel` | enum | `bajo` / `medio` / `alto` |
| `probabilidad` | float (0-1) | El score normalizado (lo usa el dashboard como % de riesgo) |
| `impacto_estimado` | decimal | `SUM(monto)` del almacén (impacto financiero potencial) |
| `descripcion` | text | Resumen legible: txns, alertas, score, tasa anomalía |
| `calculado_en` | timestamp | Última vez que se actualizó este registro |

### 3.2 Quién calcula los riesgos

Hay **dos** funciones que escriben en `joz_riesgos`. La que produce los registros visibles en el dashboard hoy es la del post-proceso de detección de anomalías. La otra (`calcular_riesgos.py`) es solo manual.

#### Fórmula activa — `detectar_anomalias.py::_actualizar_riesgo_tiendas()`

Esta función corre automáticamente al final de cada `python manage.py detectar_anomalias`. Para cada almacén:

```
total_txns   = COUNT(*) en joz_transacciones (todas las filas, sin filtro de fecha)
alertas      = COUNT(joz_alertas) ligadas al almacén (todas las severidades, todos los estados)
criticas     = COUNT(joz_alertas) con severidad in ('alta','critica')
avg_score    = AVG(score_anomalia)  -- score por alerta, escala 0-100

tasa         = alertas  / total_txns
tasa_crit    = criticas / total_txns

score = 0.40 · min(tasa · 10, 1)
      + 0.30 · (avg_score / 100)
      + 0.30 · min(tasa_crit · 20, 1)

nivel = 'alto'  si score ≥ 0.55  ó  tasa_crit ≥ 0.03
      = 'medio' si score ≥ 0.30  ó  tasa_crit ≥ 0.01
      = 'bajo'  en otro caso

probabilidad     = score (redondeado a 4 decimales)
impacto_estimado = SUM(monto) del almacén
descripcion      = "{N} txns, {A} alertas ({C} altas/críticas). Score: {s}. Tasa anomalía: {t}%."
```

**Lectura intuitiva de los pesos:**
- **40%** mira la **frecuencia de alertas** (saturada cuando 1 de cada 10 transacciones genera alerta).
- **30%** mira la **calidad/severidad promedio** de cada alerta (su `score_anomalia`).
- **30%** mira la **proporción de alertas graves** (saturada cuando 1 de cada 20 es alta o crítica).

**Umbrales de nivel** — son disyunciones; basta con cumplir una de las dos condiciones:
- `tasa_crit ≥ 3%` ⇒ `alto` directamente (1 de cada ~33 transacciones genera alerta crítica/alta).
- `tasa_crit ≥ 1%` ⇒ `medio` directamente.

#### Fórmula alternativa — `calcular_riesgos.py` (sólo si se ejecuta a mano)

```
pct_volumen = txns_almacen / max_txns_global
score = 0.30·pct_volumen + 0.40·min(tasa,1) + 0.30·min(tasa_crit·5, 1)
nivel = 'alto' si score ≥ 0.55 o tasa_crit ≥ 0.15
      = 'medio' si score ≥ 0.30 o tasa_crit ≥ 0.05
      = 'bajo' en otro caso
```

Pondera el tamaño del almacén (`pct_volumen`) en lugar del severity-score promedio. Se mantiene como utilidad de fallback cuando el motor de detección no está activo.

### 3.3 Página Riesgos — qué muestra

La pantalla tiene 4 secciones:

1. **Distribución de riesgos** (pie chart): conteo de tiendas por nivel `alto`/`medio`/`bajo`.
2. **Ranking inteligente**: top-5 almacenes ordenados por `anomalias_count` desc; cada uno muestra nivel, monto total, e impacto clasificado por umbrales heurísticos del frontend (`>50k`=Crítico, `>20k`=Alto, `>5k`=Medio, resto=Bajo).
3. **Tabla "Riesgos Operativos (Modelo)"**: lista completa de `joz_riesgos` con `categoria`, `nivel`, `probabilidad` (en %), `impacto_estimado`. Botón "Ver detalle" abre modal con tipos de alerta más frecuentes del almacén.
4. **Grilla de tarjetas (`RiskCard`)**: una por almacén, mostrando nombre + nivel + cantidad de anomalías.

### 3.4 Botón "Recalcular riesgos"

Lanza `POST /detectar-anomalias/` con `{limpiar: true}`. Esto:
1. Borra TODAS las alertas (`Alerta.objects.all().delete()`).
2. Re-ejecuta las 3 reglas sobre todas las transacciones.
3. Re-popula `joz_riesgos` con el post-proceso `_actualizar_riesgo_tiendas`.

> **Cuidado:** "Recalcular" desde la página borra el histórico de alertas. Si el equipo ya marcó alertas como `resuelta`/`descartada`, ese feedback se pierde. Usar con criterio.

### 3.5 Verificación numérica — riesgos para el rango 5-6 mayo

> Los registros que ves en `joz_riesgos` hoy fueron escritos sumando datos de **todo el histórico** (27-mar → 5-may). Para mostrar cómo se vería el riesgo si se aplicara la fórmula a SOLO los 2 días, recalculé manualmente. Eso es lo que pasaría si se corriera `detectar_anomalias --dias 2 --limpiar`.

#### Ejemplo detallado: ALMACEN 05 (top en el rango)

Datos de entrada para 5-6 mayo:

| Variable | Valor | De dónde sale |
|---|---:|---|
| `total_txns` | 140 | `COUNT(*)` filas en `joz_transacciones` con `almacen=5` y `fecha BETWEEN '2026-05-05' AND '2026-05-06'` |
| `alertas` | 14 | `COUNT(*)` en `joz_alertas` ligadas a esas 140 transacciones |
| `criticas` | 7 | severidad `IN ('alta','critica')` |
| `avg_score` | 81.9 | `AVG(score_anomalia)` de esas 14 alertas |

Paso 1 — tasas:
```
tasa      = 14 / 140 = 0.1000   (10% de las txns generan alerta)
tasa_crit =  7 / 140 = 0.0500   (5% generan alerta alta/crítica)
```

Paso 2 — componentes (cada uno acotado a 1):
```
componente_frecuencia = min(0.10  · 10, 1) = 1.000   ← saturado
componente_severidad  = 81.9 / 100         = 0.819
componente_gravedad   = min(0.05 · 20, 1)  = 1.000   ← saturado
```

Paso 3 — combinar con los pesos:
```
score = 0.40·1.000 + 0.30·0.819 + 0.30·1.000
      = 0.400 + 0.246 + 0.300
      = 0.946   →  redondeado a 0.9457
```

Paso 4 — clasificar nivel:
```
score (0.9457) ≥ 0.55  ✓   →  nivel = alto
tasa_crit (5%) ≥ 3%    ✓   →  también empuja a alto (basta con una)
```

Paso 5 — qué se guarda:
```
categoria        = 'ALMACEN 05'
nivel            = 'alto'
probabilidad     = 0.9457
impacto_estimado = USD 44,294.38   (mismo monto que muestra el dashboard)
descripcion      = "140 txns, 14 alertas (7 altas/críticas). Score: 0.95. Tasa anomalía: 10.0%."
```

#### Tabla completa — riesgo recalculado para 5-6 mayo

| Almacén | Txns | Alertas | Crít/Alta | avg_score | Tasa | Tasa crít | Score | Nivel |
|---:|---:|---:|---:|---:|---:|---:|---:|---|
|  5 | 140 | 14 | 7 | 81.9 | 10.0% |  5.00% | **0.9457** | alto |
| 17 | 193 | 20 | 9 | 77.0 | 10.4% |  4.66% | **0.9109** | alto |
| 19 |  79 |  7 | 5 | 79.9 |  8.9% |  6.33% | **0.8942** | alto |
| 12 | 203 | 17 | 9 | 79.3 |  8.4% |  4.43% | **0.8388** | alto |
| 22 |  68 |  4 | 3 | 80.9 |  5.9% |  4.41% | **0.7427** | alto |
| 20 |  78 |  7 | 2 | 75.8 |  9.0% |  2.56% | **0.7403** | alto |
|  3 |  91 |  9 | 2 | 69.9 |  9.9% |  2.20% | **0.7371** | alto |
| 11 |  50 |  5 | 1 | 65.6 | 10.0% |  2.00% | **0.7169** | alto |
|  9 | 110 |  9 | 3 | 73.5 |  8.2% |  2.73% | **0.7115** | alto |
| 13 | 106 |  8 | 3 | 74.8 |  7.6% |  2.83% | **0.6961** | alto |
| 25 |  76 |  6 | 2 | 73.9 |  7.9% |  2.63% | **0.6953** | alto |
|  8 |  58 |  5 | 1 | 74.0 |  8.6% |  1.72% | **0.6703** | alto |
| 27 |  24 |  1 | 1 | 84.0 |  4.2% |  4.17% | **0.6687** | alto |
|  2 | 211 | 15 | 5 | 79.1 |  7.1% |  2.37% | **0.6638** | alto |
| 14 |  81 |  6 | 2 | 72.0 |  7.4% |  2.47% | **0.6605** | alto |
|  7 |  76 |  4 | 2 | 78.2 |  5.3% |  2.63% | **0.6029** | alto |
| 16 | 130 |  8 | 3 | 71.4 |  6.2% |  2.31% | **0.5988** | alto |
| 18 |  87 |  7 | 1 | 67.2 |  8.0% |  1.15% | **0.5924** | alto |
| 10 | 136 |  8 | 3 | 73.0 |  5.9% |  2.21% | **0.5865** | alto |
|  6 | 175 | 13 | 2 | 70.5 |  7.4% |  1.14% | **0.5773** | alto |
| 15 | 214 | 14 | 3 | 71.5 |  6.5% |  1.40% | **0.5602** | alto |
|  4 |  89 |  8 | 0 | 63.5 |  9.0% |  0.00% | **0.5499** | medio |
| 30 |  68 |  4 | 1 | 67.8 |  5.9% |  1.47% | **0.5269** | medio |
| 29 |  46 |  2 | 1 | 73.2 |  4.4% |  2.17% | **0.5238** | medio |
| 21 |  76 |  5 | 0 | 61.6 |  6.6% |  0.00% | **0.4479** | medio |
| 26 |  67 |  1 | 1 | 94.2 |  1.5% |  1.49% | **0.4319** | medio |
|  1 |  39 |  2 | 0 | 61.6 |  5.1% |  0.00% | **0.3899** | medio |
| 23 |  38 |  1 | 0 | 61.8 |  2.6% |  0.00% | **0.2907** | bajo |
| 24 |  36 |  0 | 0 |    0 |  0.0% |  0.00% | **0.0000** | bajo |
| 70 |   4 |  0 | 0 |    0 |  0.0% |  0.00% | **0.0000** | bajo |

Restringido al rango 5-6: 21 almacenes en `alto`, 6 en `medio`, 3 en `bajo`. ALMACEN 24 y 70 quedan en `bajo` porque no tuvieron alertas (todos los componentes valen 0).

#### Por qué los riesgos del dashboard hoy son distintos a esta tabla

El dashboard muestra `joz_riesgos` calculados sobre **todo el histórico** de la BD (27-mar → 5-may, 23,247 transacciones, 2,653 alertas). Por eso ALMACEN 02 sale como `alto` con probabilidad 0.92 aunque en el subrango 5-6 mayo su score sea 0.66: las 1,877 transacciones acumuladas y las 234 alertas históricas pesan más que los 2 días aislados.

Para "ver el riesgo solo del rango 5-6 mayo" hay que correr (destructivo):

```bash
docker exec barranquia_joz_backend python manage.py detectar_anomalias --dias 2 --limpiar
```

---

## 4. Reglas de detección (`/configuracion`)

Las 3 reglas activas que generan las alertas. Backend: `joz/backend/joz/views.py::reglas_deteccion` + `joz/backend/joz/management/commands/detectar_anomalias.py`. Tabla: `joz_reglas_deteccion`. Frontend: `joz/frontend/src/pages/Settings.tsx`.

> Las migraciones 0001-0010 están aplicadas, así que el motor administrable está operativo.

### 4.1 Modelo `ReglaDeteccion`

| Campo | Significado |
|---|---|
| `nombre` | Nombre visible de la regla |
| `tipo_motor` | `zscore` / `conteo` / `ratio` — define qué algoritmo evalúa |
| `habilitada` | Boolean para activar/desactivar sin borrar |
| `parametros` | JSON con umbrales (depende del motor) |
| `severidad_reglas` | JSON con condiciones de severidad |
| `descripcion_simple` / `descripcion_tecnica` / `formula` | Documentación que el frontend muestra al usuario |
| `es_sistema` | Si es `true`, el usuario no puede borrar la regla (sí desactivarla y editar parámetros) |

### 4.2 Categorización de la descripción

Antes de evaluar cualquier regla, el motor normaliza la descripción libre en una **categoría** estable. Patrones (regex case-insensitive):

| Patrón | Categoría |
|---|---|
| `^RETIRA POR VALOR` | Retiro empeño |
| `^ABONA A CAPITAL` | Abono a capital |
| `^PAGA \d+ MES.*INTERÉS` | Pago intereses |
| `^Empeño de:` | Empeño |
| `^APERTURA DE CAJA ENTRADA/SALIDA` | Apertura caja entrada/salida |
| `^CIERRE DE CAJA ENTRADA/SALIDA` | Cierre caja entrada/salida |
| `ENVIO/PAGO DE WESTERN` | Envío/Pago Western Union |
| `^RENOVACI[OÓ]N` | Renovación |
| `^VENTA` | Venta |
| (resto) | Otro |

Esto evita que cada texto libre sea tratado como un grupo distinto al calcular promedios.

### 4.3 Regla 1 — Monto inusual (motor `zscore`)

- **Idea.** Alertar transacciones cuyo monto se desvía mucho del promedio de su mismo `(almacén, tipo, categoría)`.
- **Fórmula.** `Z = (Monto − μ) / σ`, donde `μ` y `σ` son el promedio y desviación estándar de los montos del grupo.
- **Mínimo de muestras.** Sólo se evalúan grupos con `n ≥ 5`. Grupos con `σ=0` o `μ=0` se descartan.
- **Ventana temporal.** 60 días por defecto (`parametros.ventana_dias`).
- **Parámetros activos:**
  ```json
  { "zscore_media": 2.0, "zscore_alta": 3.0, "zscore_critica": 4.0 }
  ```
- **Severidad** y `score_anomalia` (escala 0-100):
  - `Z ≥ 4` → `crítica`, score `min(99, 85 + Z·2)`
  - `3 ≤ Z < 4` → `alta`, score `min(84, 70 + Z·5)`
  - `2 ≤ Z < 3` → `media`, score `min(69, 50 + Z·5)`
- **Texto típico:**
  > `Aporte [Empeño] por $5,500 en almacén 17 (2026-05-05). Z-score 4.2 vs Aporte [Empeño] (promedio $850, σ $1,100, n=42). Cliente: …`
- **Aporte en el rango 5-6:** 195 alertas (28 críticas, 47 altas, 120 medias).

### 4.4 Regla 2 — Fraccionamiento de operaciones (motor `conteo`)

- **Idea.** Detectar clientes que en lugar de hacer una operación grande hacen muchas pequeñas el mismo día (structuring/AML).
- **Fórmula.** `N = COUNT(txns)` agrupado por `(numero_identificacion, fecha, tipo, categoría, almacén)`.
- **Excluye** clientes "bulk" (`numero_identificacion='99999'`) y clientes sin identificación.
- **Parámetros activos:**
  ```json
  { "min_txns": 5, "min_txns_alta": 10, "min_txns_critica": 20 }
  ```
- **Severidad:**
  - `N ≥ 20` → `crítica`, score `min(99, 85 + N)`
  - `10 ≤ N < 20` → `alta`, score `min(84, 65 + N·2)`
  - `5 ≤ N < 10` → `media`, score `min(64, 45 + N·3)`
- **Texto típico:**
  > `JUAN PÉREZ realizó 6 Aporte [Empeño] en almacén 12 el 2026-05-05. Total: $4,250 (promedio $708/txn).`
- **Aporte en el rango 5-6:** 21 alertas (todas medias).

### 4.5 Regla 3 — Concentración de cajero (motor `ratio`)

- **Idea.** Detectar cajeros cuya carga de operaciones supera por mucho el promedio de los demás cajeros para el mismo `(tipo, categoría)`.
- **Fórmula.** `Ratio = N_cajero_día_tipo / μ_tipo`, donde `μ_tipo` es el promedio de operaciones por cajero por día para ese `(tipo, categoría)`.
- **Parámetros activos:**
  ```json
  { "ratio_media": 2.0, "ratio_alta": 3.0 }
  ```
- **Severidad:**
  - `Ratio ≥ 3` → `alta`, score `min(99, 55 + Ratio·10)`
  - `2 ≤ Ratio < 3` → `media`, score `min(99, 55 + Ratio·10)`
- **Texto típico:**
  > `Cajero MARIA G. procesó 18 Aporte [Empeño] el 2026-05-05 (3.2x el promedio de 6/cajero/día para Aporte [Empeño]). Monto: $12,800.`
- **Aporte en el rango 5-6:** 52 alertas (8 altas, 44 medias).

### 4.6 Resumen de configuración activa

| Regla | Motor | Habilitada | Parámetros |
|---|---|:---:|---|
| Monto inusual | zscore | ✓ | `{media:2, alta:3, crítica:4, ventana_dias:60, n≥5}` |
| Fraccionamiento de operaciones | conteo | ✓ | `{min:5, alta:10, crítica:20}` |
| Concentración de cajero | ratio | ✓ | `{media:2, alta:3}` |

> Las tres reglas son del sistema (`es_sistema=true`) — el usuario puede ajustar parámetros y desactivarlas, pero no eliminarlas. Para crear reglas nuevas se usa el endpoint `POST /api/joz/reglas-deteccion/`.

### 4.7 Cómo se ejecutan las reglas

Cuando se corre `python manage.py detectar_anomalias`:

1. Carga reglas habilitadas ordenadas por `orden, id`.
2. Filtra `Transaccion` por `--dias N` (si se pasa) o usa todas.
3. Para cada regla, ejecuta su motor (`_motor_zscore`, `_motor_conteo`, `_motor_ratio`).
4. Deduplica contra alertas existentes por `(transaccion_id, tipo)` para no insertar duplicados — a menos que se pase `--limpiar`, que borra todo antes.
5. Bulk-insert de alertas nuevas.
6. Post-proceso `_actualizar_riesgo_tiendas` que recalcula `joz_riesgos` (sección 3.2).

Endpoint REST equivalente: `POST /api/joz/detectar-anomalias/` con `{"limpiar": false, "dias": 2}` corre lo mismo en un thread aparte.

---

## 5. Cómo aplicar IA para que aprenda de estas anomalías

JOZ ya tiene el cimiento en `joz/backend/joz/ml.py`: un **Isolation Forest** (scikit-learn) que aprende patrones normales sin etiquetas y asigna `anomaly_score ∈ [0,100]` a cada transacción. Endpoints listos: `POST /api/joz/ia/entrenar/`, `GET /api/joz/ia/anomalias/`, `GET /api/joz/ia/status/`.

### 5.1 Fase 1 — Lo que ya funciona (no supervisado)

`IsolationForest(n_estimators=200, contamination=0.05, random_state=42)` con 10 features:

- `monto`, `entrada`, `salida`
- `hora_minutos` (0-1440)
- `almacen`, `tipo_encoded`, `descripcion_encoded`, `dia_semana`
- `es_cruzada` (almorigen ≠ almdestino)
- `ratio_entrada_monto`

Las features se escalan con `StandardScaler` antes de entrenar. Se necesitan ≥50 transacciones; con los 23,247 registros que tenemos hoy es más que suficiente.

### 5.2 Fase 2 — Convertir las 268 alertas en dataset etiquetado (supervisado)

Las alertas existentes son **oro puro como datos etiquetados** porque combinan la decisión de las reglas con el peso de la severidad. Permiten saltar de "detección no supervisada" a "clasificador entrenado con las decisiones reales del motor".

**Pipeline propuesto:**

```python
# Construir dataset etiquetado
X = features de TODA transacción (las 10 actuales + nuevas, ver 5.4)
y = 1 si la transacción tiene alerta abierta/confirmada, 0 si no
peso_severidad = {'baja': 1, 'media': 2, 'alta': 4, 'critica': 8}
sample_weight = peso_severidad[alerta.severidad] si y=1, sino 1
```

**Modelos candidatos:**
- **GradientBoosting / XGBoost / LightGBM** — clasificador binario con `predict_proba` interpretable.
- **Random Forest** — robusto al ruido de etiquetas (alertas que el analista descartó como falso positivo).

**Truco clave:** filtrar `Alerta.estado='resuelta'` (analista la confirmó) como positivos fuertes y `estado='descartada'` como **negativos fuertes** (falso positivo del motor). Así el modelo no sólo replica las reglas, **las corrige** según el criterio humano.

### 5.3 Fase 3 — Aprendizaje continuo con feedback del analista

```
Detección por reglas (recall alto, precisión baja)
        ↓
Alerta entra a la bandeja del analista
        ↓
Analista la marca como confirmada / descartada    ← feedback humano
        ↓
Reentreno semanal del clasificador supervisado
        ↓
El clasificador filtra las alertas antes de mostrarlas
        ↓
Sólo se muestran las de probabilidad > 0.7 (umbral configurable por tienda)
```

Las 3 reglas siguen ejecutándose (no se pierde cobertura), pero el modelo aprende qué alertas el analista realmente quiere ver y suprime las que el equipo ya descartó como ruido.

### 5.4 Features nuevas a agregar para enriquecer el modelo

| Feature | Por qué importa |
|---|---|
| `monto_z_score_almacen` | El Z-score precalculado de la regla 1 — convertirlo en feature explícita le da al modelo lo que ve la regla. |
| `txns_cliente_dia` | El conteo de la regla 2 hecho feature. |
| `txns_cajero_hora` y `txns_cajero_dia` | El ratio de la regla 3 hecho feature. |
| `pct_monto_diario_cliente` | % del flujo del cliente que representa esta txn. |
| `delta_monto_vs_promedio_cliente` | Distancia al promedio histórico de ese cliente específico. |
| `tiempo_desde_ultima_txn_cliente` | Segundos desde la última operación del mismo cliente. |
| `cantidad_alertas_previas_almacen_30d` | Cuán "ruidoso" es ese almacén — sirve para que el modelo aprenda contexto de tienda. |
| `categoria_descripcion_onehot` | Reemplazar el hash actual por one-hot estable de las 13 categorías de `_CATEGORIA_PATTERNS`. |

### 5.5 Hoja de ruta de implementación

1. **Inmediato (1-2 días)**
   - Reanudar el ETL para cerrar el día 6 de mayo y los siguientes.
   - Re-entrenar el Isolation Forest existente con `POST /api/joz/ia/entrenar/`.

2. **Corto plazo (1 semana)**
   - Crear `joz/backend/joz/ml_supervisado.py` con el clasificador binario (GradientBoosting o LightGBM).
   - Comando `python manage.py entrenar_clasificador` que use las alertas con estado `resuelta`/`descartada` como labels.
   - Endpoint `POST /api/joz/ia/predecir-supervisado/` que devuelva `probabilidad_anomalia` por transacción.

3. **Mediano plazo (1 mes)**
   - Métricas en `Settings.tsx` → bloque "Inteligencia Artificial": precision/recall/F1 sobre alertas pasadas, matriz de confusión.
   - Reentreno automático semanal vía `joz/scheduler.py`.
   - Threshold ajustable por almacén (ALMACEN 17 con 145 ops puede tolerar más falsos positivos que ALMACEN 70 con 1 op).

4. **Largo plazo**
   - Modelo por tienda o por cluster de tiendas (las 30 sucursales no se comportan igual: ALMACEN 17 mueve USD 46k/día, ALMACEN 70 sólo USD 2k).
   - Active learning: el sistema le pide al analista revisar las 5 alertas con `predict_proba` más cercana a 0.5 cada día — esas son las que más enseñan al modelo.
   - Embeddings de la descripción libre con un modelo de lenguaje liviano (sentence-transformers) para detectar patrones textuales: clientes que siempre escriben "EMPEÑO" mal, traslados sin documentar, descripciones idénticas en operaciones distintas (señal de copia-pega del cajero).

---

## 6. Comandos útiles

```bash
# Entrar a la BD de producción (la que sirve al dashboard)
docker exec -it barranquia_postgres psql -U joz -d joz

# Verificar el cuadre del rango 5-6 mayo contra la BD
docker exec barranquia_postgres psql -U joz -d joz -c "
WITH base AS (
  SELECT * FROM joz_transacciones
   WHERE fecha BETWEEN '2026-05-05' AND '2026-05-06'
     AND NOT (
          lower(descripcion) LIKE 'apertura%'
       OR lower(descripcion) LIKE 'cierre%'
       OR lower(descripcion) LIKE '%traslado%'
       OR lower(descripcion) LIKE '%transferencia entre%'
       OR lower(descripcion) LIKE '%movimiento entre almac%'
     )
)
SELECT COUNT(*) filas, SUM(monto) total, SUM(entrada) entrada, SUM(salida) salida
FROM base;
"

# Detectar anomalías (motor administrable de 3 reglas) — sin destruir histórico
docker exec barranquia_joz_backend python manage.py detectar_anomalias --dias 2

# Detectar y RESETEAR el histórico de alertas (destructivo)
docker exec barranquia_joz_backend python manage.py detectar_anomalias --dias 30 --limpiar

# Recalcular riesgos por tienda con la fórmula manual alternativa
docker exec barranquia_joz_backend python manage.py calcular_riesgos

# Entrenar el modelo de IA (Isolation Forest)
TOKEN=$(docker exec barranquia_postgres psql -U joz -d joz -tc \
  "SELECT t.key FROM authtoken_token t JOIN auth_user u ON u.id=t.user_id WHERE u.username='admin';" \
  | tr -d ' ')
docker exec barranquia_joz_backend python -c "
import requests
r = requests.post('http://localhost:8003/api/joz/ia/entrenar/',
                  json={'contamination': 0.05},
                  headers={'Authorization': 'Token $TOKEN'})
print(r.json())
"

# Reconstruir contenedores tras cambios de código
make rebuild-joz   # rebuild --no-cache de joz-backend + joz-frontend y up -d
make restart-joz   # solo restart sin rebuild
make logs-joz      # logs en vivo
```
