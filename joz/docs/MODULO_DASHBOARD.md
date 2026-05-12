# Modulo: Dashboard -- Panel de Control

**Ruta:** `/dashboard`
**Acceso:** Requiere autenticacion (token)
**URL:** https://joz-ccb.ngrok.io/dashboard

---

## 1. Descripcion General

Panel principal de monitoreo que consolida toda la informacion operativa y de anomalias del sistema JOZ. Presenta KPIs financieros, distribucion por tipo de operacion, graficas de tendencia, tabla de anomalias por dia y un mapa de actividad por almacen.

---

## 2. Estructura Visual

### 2.1 KPIs Financieros (fila 1 -- 4 tarjetas)

Datos consumidos del endpoint `GET /api/joz/stats/`.

| Tarjeta | Campo del API | Descripcion | Valor actual |
|---------|--------------|-------------|--------------|
| Transacciones | `total_transacciones` | Total acumulado de transacciones importadas | 6,230 |
| Volumen Total | `total_monto` | Suma de todos los montos (USD) | USD 2,477,226 |
| Aportes | `aportes_count` | Cantidad de transacciones tipo "Aporte" | 3,050 |
| Retiros | `retiros_count` | Cantidad de transacciones tipo "Retiro" | 1,530 |

**Nota:** Estos KPIs muestran el **acumulado total historico** (sin filtro de fecha). Incluyen todas las transacciones desde la primera importacion ETL.

### 2.2 KPIs de Anomalias (fila 2 -- 4 tarjetas)

| Tarjeta | Campo del API | Descripcion | Valor actual |
|---------|--------------|-------------|--------------|
| Anomalias Detectadas | `anomalias_detectadas` | Total de alertas generadas (todos los estados) | 1,600 |
| Alertas Abiertas | `alertas_abiertas` | Alertas en estado `abierta` (sin gestionar) | 1,600 |
| Criticas | `alertas_criticas` | Alertas con severidad `critica` + estado `abierta` | 60 |
| Alertas Hoy | `alertas_hoy` | Alertas cuyo `generado_en` es la fecha actual | 1,600 |

**Nota sobre "Alertas Hoy":** Refleja las alertas generadas en la fecha actual del servidor. Tras una regeneracion masiva (`--limpiar`), este valor igualara al total. En operacion normal, muestra solo las alertas nuevas del dia.

### 2.3 Distribucion por Tipo de Operacion (fila 3 -- 6 tarjetas)

Se clasifican las transacciones del historial por tipo de operacion, parseando el campo `descripcion` con heuristicas de texto:

| Tipo | Regla de clasificacion |
|------|----------------------|
| Empeno | `descripcion` empieza con "empeno" |
| Retiro de empeno | `descripcion` empieza con "retira" |
| Abono / Interes | `descripcion` empieza con "abona" o "paga" |
| Apertura de caja | `descripcion` empieza con "apertura" |
| Cierre de caja | `descripcion` empieza con "cierre" |
| Otro | Cualquier otra descripcion |

Cada tarjeta muestra:
- **Cantidad** de transacciones de ese tipo
- **Monto total** en USD

**Fuente de datos:** Endpoint `GET /api/joz/historial/?page_size=500` -- se procesan las primeras 500 transacciones. No es el total completo de la base de datos.

### 2.4 Grafica: Transacciones Diarias (Aportes vs Retiros)

Grafica de barras (Recharts `BarChart`) que muestra la evolucion diaria:
- **Barra verde:** Aportes (suma de `entrada` por dia)
- **Barra roja:** Retiros (suma de `salida` por dia)

**Fuente:** Calculada en frontend a partir de las primeras 500 transacciones del historial. El eje X muestra fechas formateadas como "21 Abr".

### 2.5 Tabla: Anomalias por Dia

Datos consumidos del endpoint `GET /api/joz/anomalias-por-dia/` (ultimos 30 dias).

| Columna | Campo | Descripcion |
|---------|-------|-------------|
| Fecha | `date` | Fecha de la transaccion (no de generacion de alerta) |
| Transacciones | `transacciones` | Total de transacciones en ese dia |
| Alertas | `alertas` | Total de alertas asociadas a transacciones de ese dia |
| Criticas | `criticas` | Alertas con severidad `critica` |
| Altas | `altas` | Alertas con severidad `alta` |
| % Anomalia | calculado | `(alertas / transacciones) * 100` |

La barra de porcentaje cambia de color:
- **Verde:** < 8%
- **Naranja:** 8% - 15%
- **Rojo:** > 15%

Se muestran los ultimos 15 dias con datos.

### 2.6 Almacenes (grid de tarjetas clickeables)

Muestra los 30 almacenes ordenados por volumen total (mayor a menor). Cada tarjeta:
- Nombre del almacen
- Monto total operado (USD)
- Cantidad de transacciones
- Nivel de riesgo (badge coloreado) proveniente del modelo `Riesgo`

**Interaccion:** Click en un almacen navega a `/store/{nombre}` (vista de detalle).

**Fuente:** Calculada en frontend desde las 500 transacciones del historial. El `nivel_riesgo` proviene del endpoint `/api/joz/stats/` que consulta la tabla `joz_riesgos`.

### 2.7 Balance General (tarjeta final)

| Elemento | Campo del API | Descripcion |
|----------|--------------|-------------|
| Entradas | `total_entrada` | Suma de todos los campos `entrada` |
| Salidas | `total_salida` | Suma de todos los campos `salida` |
| Balance | calculado | `total_entrada - total_salida` |

---

## 3. Endpoints consumidos

| Endpoint | Metodo | Datos utilizados |
|----------|--------|-----------------|
| `/api/joz/stats/` | GET | KPIs financieros, KPIs de anomalias, balance, nivel_riesgo por tienda |
| `/api/joz/anomalias-por-dia/` | GET | Tabla de anomalias por dia (ultimos 30 dias) |
| `/api/joz/historial/?page_size=500` | GET | Tipos de operacion, grafica diaria, almacenes |

### Ejemplo de respuesta `/api/joz/stats/`

```json
{
  "ok": true,
  "data": {
    "total_transacciones": 6230,
    "total_monto": 2477226.14,
    "total_entrada": 1228470.89,
    "total_salida": 1248755.25,
    "aportes_count": 3050,
    "retiros_count": 1530,
    "anomalias_detectadas": 1600,
    "alertas_abiertas": 1600,
    "alertas_criticas": 60,
    "alertas_hoy": 1600,
    "tiendas": [
      {
        "nombre": "ALMACEN 06",
        "anomalias_count": 85,
        "nivel_riesgo": "high"
      }
    ]
  }
}
```

---

## 4. Logica del Backend (`/api/joz/stats/`)

### Consultas SQL ejecutadas:

```python
# Total transacciones
Transaccion.objects.count()

# Agregados financieros (SIN filtro de fecha -- acumulado total)
Transaccion.objects.aggregate(
    total_entrada=Sum('entrada'),
    total_salida=Sum('salida'),
    total_monto=Sum('monto'),
)

# Aportes y retiros
Transaccion.objects.filter(tipo='Aporte').count()
Transaccion.objects.filter(tipo='Retiro').count()

# Alertas (anomalias_count = alertas reales, no transacciones)
Alerta.objects.count()                                          # anomalias_detectadas
Alerta.objects.filter(estado='abierta').count()                 # alertas_abiertas
Alerta.objects.filter(severidad='critica', estado='abierta').count()  # alertas_criticas
Alerta.objects.filter(generado_en__date=hoy).count()            # alertas_hoy

# nivel_riesgo por tienda proviene del modelo Riesgo
Riesgo.objects.values('almacen', 'nivel_riesgo')
```

### Consultas SQL para anomalias por dia:

```python
# Transacciones agrupadas por fecha y tipo (ultimos 30 dias)
Transaccion.objects.filter(fecha__gte=desde)
    .values('fecha', 'tipo')
    .annotate(total=Count('id'), monto=Sum('monto'))

# Alertas agrupadas por fecha de transaccion y severidad
Alerta.objects.filter(transaccion__fecha__gte=desde)
    .values('transaccion__fecha', 'severidad')
    .annotate(n=Count('id'))
```

---

## 5. Validacion de datos (verificado contra BD)

| Metrica | Valor actual | Estado |
|---------|-------------|--------|
| total_transacciones | 6,230 | Correcto |
| total_monto | 2,477,226.14 | Correcto |
| total_entrada | 1,228,470.89 | Correcto |
| total_salida | 1,248,755.25 | Correcto |
| aportes_count | 3,050 | Correcto |
| retiros_count | 1,530 | Correcto |
| anomalias_detectadas | 1,600 | Correcto |
| alertas_abiertas | 1,600 | Correcto |
| alertas_criticas | 60 | Correcto |
| tiendas | 30 | Correcto |
| cajeros | 114 | Correcto |

*Validacion realizada el 2026-04-21.*

---

## 6. Limitaciones conocidas

1. **Tipos de operacion:** Se clasifican en frontend parseando `descripcion` con heuristicas de texto. No provienen de un campo estructurado del backend. Posible desclasificacion si la descripcion tiene formato inesperado.

2. **Muestra de 500 registros:** Las secciones de tipos, grafica diaria y almacenes se calculan sobre las primeras 500 transacciones (ordenadas por fecha DESC), no sobre el total. Para volumenes grandes esto puede subreportar datos de fechas antiguas.

3. **Sin filtro de rango temporal:** Los KPIs principales muestran el acumulado total historico. No existe selector de fecha para filtrar por periodo.

4. **Moneda:** Todos los montos se muestran en USD. SuperEfectivo opera en Panama donde USD y Balboa son equivalentes (1:1).

---

## 7. Notas tecnicas

- **Archivo fuente frontend:** `joz/frontend/src/pages/Dashboard.tsx`
- **Archivo fuente backend:** `joz/backend/joz/views.py` (funciones `stats`, `anomalias_por_dia`, `historial`)
- **Componentes utilizados:** `StatCard`, `AnomalyChart`, `Card`, `Badge`
- **Libreria de graficas:** Recharts (`BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`, `Legend`)
- **Auto-refresh:** No. Los datos se cargan una sola vez al montar el componente.
- **Severidad de alertas:** 989 alta, 551 media, 60 critica.
