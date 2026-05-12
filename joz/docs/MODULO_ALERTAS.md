# Modulo: Alertas -- Gestion de Anomalias

**Ruta:** `/alerts`
**Acceso:** Requiere autenticacion (token)
**URL:** https://joz-ccb.ngrok.io/alerts

---

## 1. Descripcion General

Centro de gestion de alertas generadas por el motor de deteccion de anomalias. Permite visualizar, filtrar, inspeccionar y cambiar el estado de cada alerta. Las alertas se generan automaticamente al ejecutar el comando `detectar_anomalias` (manual o programado via scheduler cada hora).

Total actual: **1,600 alertas** (989 alta, 551 media, 60 critica) sobre 6,230 transacciones de 30 tiendas y 114 cajeros.

---

## 2. Motor de Deteccion -- 11 reglas en 5 categorias

El motor analiza las transacciones importadas desde SuperEfectivo y aplica 11 reglas de deteccion agrupadas en 5 categorias. Incluye 8 reglas de deteccion directa, 2 reglas de post-proceso (reincidencia) y 1 regla de scoring por tienda.

### 2.1 Coherencia Transaccional

| Regla | Nombre | Logica | Severidad |
|-------|--------|--------|-----------|
| Sin partida doble | Movimiento cruzado sin contraparte | Cuando `almorigen != almdestino` (transferencia entre tiendas), debe existir un retiro con `doccruce` que vincule al aporte. Si no existe -> alerta. | Alta |
| Desbalance cruzado | Diferencia >2% en pares cruzados | Para pares vinculados por `doccruce`, se comparan montos. Si difieren mas de 2% -> alerta. | Media (>2%), Alta (>5%) |
| Duplicidad cruzada | `doccruce` duplicado | Un `doccruce` no debe tener mas de un retiro asociado. Si hay duplicados -> alerta. | Alta |

### 2.2 Cuadre de Caja

| Regla | Nombre | Logica | Severidad |
|-------|--------|--------|-----------|
| Cuadre de caja anomalo | Desviacion del balance diario | Balance neto por almacen/dia = sum(entradas) - sum(salidas). Se calcula Z-score contra el promedio historico del almacen. Si Z-score > 2 y diferencia > $10,000 -> alerta. | Media ($10K-$50K), Alta (>$50K) |

### 2.3 Comportamiento

| Regla | Nombre | Logica | Severidad |
|-------|--------|--------|-----------|
| Desviacion de monto | Z-score por almacen | Transacciones cuyo monto se desvia significativamente del promedio de su almacen. Z-score calculado con media y desviacion estandar por almacen. | Media (Z>2), Alta (Z>3), Critica (Z>4) |
| Horario atipico | Fuera de horario operativo | Transacciones antes de las 06:00 o despues de las 21:00 (hora local). Excluye Western Union (cliente `99999`). | Media (05-06h / 21-23h), Alta (<04h o >23h) |
| Concentracion de cajero | Volumen anormal por cajero | Cajero cuyo volumen diario supera 2x el promedio global de transacciones por cajero/dia. | Media (2x-3x), Alta (>3x) |

### 2.4 Score Global

| Regla | Nombre | Logica | Severidad |
|-------|--------|--------|-----------|
| Score alto de riesgo | Score compuesto por transaccion | Combina: factor monto (0-0.5) + factor hora (0-0.3) + factor concentracion (0-0.2). Solo genera alerta si score > 0.5. | Media (0.5-0.8), Alta (>0.8) |

### 2.5 Post-proceso

| Regla | Nombre | Logica | Severidad |
|-------|--------|--------|-----------|
| Reincidencia de tienda | Tasa de anomalias por almacen | `alertas / transacciones` por almacen. Si supera 5% -> alerta. | Alta |
| Reincidencia de cajero | Tasa de anomalias por cajero | `alertas / transacciones` por cajero. Si supera 3% -> alerta. | Alta |
| Score por tienda | Riesgo agregado por almacen | Actualiza la tabla `Riesgo` con score ponderado: 40% tasa anomalia + 30% score promedio + 30% tasa de criticas. Niveles: bajo (<0.4), medio (0.4-0.7), alto (>0.7). | -- (alimenta modulo Riesgos) |

### 2.6 Distribucion actual de alertas

| Tipo de anomalia | Cantidad | % del total |
|------------------|----------|-------------|
| Desviacion de monto | 444 | 27.8% |
| Reincidencia de cajero | 419 | 26.2% |
| Score alto de riesgo | 316 | 19.8% |
| Horario atipico | 230 | 14.4% |
| Reincidencia de tienda | 120 | 7.5% |
| Concentracion de cajero | 39 | 2.4% |
| Sin partida doble | 16 | 1.0% |
| Duplicidad cruzada | 16 | 1.0% |
| **Total** | **1,600** | **100%** |

*Datos al 2026-04-21.*

---

## 3. Estructura Visual del Frontend

### 3.1 Header

- Titulo "Alertas" con icono
- Subtitulo: "Gestion completa de alertas - Auto-refresh 30s"
- Boton "Actualizar" con spinner durante carga

### 3.2 Barra de Filtros

| Filtro | Tipo | Opciones | Parametro API |
|--------|------|----------|---------------|
| Busqueda | Input texto | Busca en `tipo` y `descripcion` | `q` |
| Riesgo | Select | Todos / Alto / Medio / Bajo | `nivel_riesgo` |
| Tienda | Select (dinamico) | Lista de almacenes presentes en los resultados | `almacen` |
| Limpiar | Boton | Resetea todos los filtros | -- |

### 3.3 Tabla de Alertas

| Columna | Campo API | Descripcion |
|---------|-----------|-------------|
| ID | `id` | Identificador de la alerta |
| Fecha | `date` | Fecha de generacion (`generado_en`) |
| Tienda | `store` | Nombre del almacen (ej: "ALMACEN 06") |
| Tipo de Anomalia | `anomalyType` | Nombre de la regla que genero la alerta |
| Monto | `amount` | Monto de la transaccion asociada (USD) |
| Riesgo | `riskLevel` | Nivel mapeado: `baja`->low, `media`->medium, `alta/critica`->high |
| Estado | `estado` | Estado actual de gestion |
| Accion | -- | Boton "Ver" -> abre modal de detalle |

### 3.4 Modal de Detalle de Alerta

Al hacer clic en "Ver", se abre un modal con:

| Seccion | Contenido |
|---------|-----------|
| Header | ID de alerta + Badge de nivel de riesgo |
| Info grid (2x2) | Fecha, Almacen, Tipo de anomalia, Monto |
| Score de anomalia | Barra de progreso visual (verde <50, amber 50-80, rojo >80) + valor numerico |
| Descripcion | Texto completo generado por el motor de deteccion, detallando la logica y datos especificos |
| Cambiar estado | 4 botones: Abierta, En revision, Resuelta, Descartada |

---

## 4. Flujo de Estados de una Alerta

```
                +----------+
                |  Abierta |  <- Estado inicial (generada por el motor)
                +----+-----+
                     |
              +------+------+
              v              v
        +-----------+  +-----------+
        | En revision|  | Descartada |  <- Falso positivo
        +-----+-----+  +-----------+
              |
              v
        +-----------+
        |  Resuelta  |  <- Accion tomada
        +-----------+
```

**Estados disponibles:**

| Estado | Valor BD | Significado |
|--------|----------|-------------|
| Abierta | `abierta` | Recien generada, pendiente de revision |
| En revision | `en_revision` | Analista la esta investigando |
| Resuelta | `resuelta` | Se tomo accion correctiva |
| Descartada | `descartada` | Falso positivo o no aplica |

El cambio de estado se ejecuta via `PATCH /api/joz/alertas/{id}/` con body `{ "estado": "resuelta" }`.

---

## 5. Endpoints consumidos

| Endpoint | Metodo | Uso |
|----------|--------|-----|
| `GET /api/joz/alertas/` | GET | Listado paginado con filtros |
| `PATCH /api/joz/alertas/{id}/` | PATCH | Cambiar estado de una alerta |

### 5.1 GET `/api/joz/alertas/`

**Parametros query:**

| Param | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| `page` | int | 1 | Pagina actual |
| `page_size` | int | 50 | Registros por pagina (max 200) |
| `q` | string | -- | Busqueda en tipo y descripcion |
| `severidad` | string | -- | Filtro exacto: `baja`, `media`, `alta`, `critica` |
| `estado` | string | -- | Filtro exacto: `abierta`, `en_revision`, `resuelta`, `descartada` |
| `nivel_riesgo` | string | -- | Filtro por nivel: `low`->baja, `medium`->media, `high`->alta+critica |
| `almacen` | string | -- | Codigo de almacen (ej: `6` o `ALMACEN 06`) |

**Respuesta:**

```json
{
  "ok": true,
  "data": {
    "results": [
      {
        "id": 2847,
        "date": "2026-04-21",
        "store": "ALMACEN 06",
        "almacen_codigo": 6,
        "anomalyType": "Reincidencia de cajero",
        "amount": 5058.0,
        "riskLevel": "high",
        "estado": "abierta",
        "score": 85.3,
        "descripcion": "Cajero ERODRIGUEZ: 45 alertas / 148 transacciones = tasa 30.4%. Supera umbral de 3%."
      }
    ],
    "count": 1600,
    "page": 1,
    "page_size": 50
  }
}
```

### 5.2 PATCH `/api/joz/alertas/{id}/`

**Body:**

```json
{ "estado": "resuelta" }
```

**Respuesta:**

```json
{
  "ok": true,
  "data": { "id": 2847, "estado": "resuelta" }
}
```

---

## 6. Mapeo de Severidad -> Nivel de Riesgo

El backend almacena `severidad` (baja/media/alta/critica) y el API lo mapea a `riskLevel` para el frontend:

| Severidad (BD) | riskLevel (API) | Color en UI |
|----------------|-----------------|-------------|
| `baja` | `low` | Verde |
| `media` | `medium` | Amber/dorado |
| `alta` | `high` | Rojo |
| `critica` | `high` | Rojo |

---

## 7. Score de Anomalia

Cada alerta tiene un `score_anomalia` (0-100) que refleja la confianza del motor:

| Rango | Significado | Color barra |
|-------|-------------|-------------|
| 0 - 49 | Baja confianza | Verde |
| 50 - 79 | Confianza media | Amber |
| 80 - 100 | Alta confianza | Rojo |

---

## 8. Comportamiento del Frontend

| Aspecto | Detalle |
|---------|---------|
| Auto-refresh | Cada 30 segundos (`setInterval(fetchAlerts, 30_000)`) |
| Paginacion | 50 alertas por pagina (controlado por el backend) |
| Filtros | Se aplican al cambiar cualquier valor (debounce implicito en busqueda) |
| Modal | Se cierra con click en overlay, boton X, o tras cambiar estado exitosamente |
| Cambio de estado | Ejecuta PATCH -> cierra modal -> recarga la lista |

---

## 9. Ejecucion del Motor de Deteccion

### Manual:

```bash
docker exec joz_backend python manage.py detectar_anomalias --limpiar
```

### Opciones:

| Flag | Descripcion |
|------|-------------|
| `--limpiar` | Elimina todas las alertas existentes antes de regenerar |
| `--dry-run` | Solo muestra lo que detectaria, sin crear alertas |
| `--dias N` | Analiza solo los ultimos N dias (0 = todos) |

### Automatico:

El scheduler de APScheduler ejecuta el ETL cada hora. Tras importar transacciones nuevas, se ejecuta `detectar_anomalias` para generar alertas sobre los datos nuevos.

---

## 10. Modelo de Datos

### Tabla: `joz_alertas`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | int (PK) | Identificador auto-incremental |
| `transaccion_id` | FK -> `joz_transacciones` | Transaccion que origino la alerta (puede ser NULL) |
| `tipo` | varchar(200) | Nombre de la regla (ej: "Desviacion de monto") |
| `descripcion` | text | Descripcion detallada generada por el motor |
| `severidad` | varchar(20) | `baja`, `media`, `alta`, `critica` |
| `estado` | varchar(20) | `abierta`, `en_revision`, `resuelta`, `descartada` |
| `score_anomalia` | float | Score de confianza (0-100) |
| `generado_en` | datetime | Fecha/hora de creacion (auto) |
| `actualizado_en` | datetime | Fecha/hora de ultima modificacion (auto) |

---

## 11. Notas Tecnicas

- **Archivo frontend:** `joz/frontend/src/pages/Alerts.tsx`
- **Componente tabla:** `joz/frontend/src/components/AlertsTable.tsx`
- **Archivo backend:** `joz/backend/joz/views.py` (funcion `alertas`)
- **Motor de deteccion:** `joz/backend/joz/management/commands/detectar_anomalias.py`
- **Deduplicacion:** Al ejecutar sin `--limpiar`, el motor no crea alertas duplicadas (mismo `transaccion_id` + `tipo`).
- **Moneda:** USD (Balboas panamenos, equivalente 1:1).
- **Configuracion de reglas:** El modulo Settings (tab Deteccion) permite habilitar/deshabilitar cada una de las 11 reglas y ajustar sus umbrales.
