# Modulo: IA -- Deteccion de Anomalias con Machine Learning

**Ruta:** `/ia`
**Acceso:** Requiere autenticacion (token)
**URL:** https://joz-ccb.ngrok.io/ia

---

## 1. Descripcion General

Modulo de inteligencia artificial para deteccion de anomalias no supervisada en transacciones financieras. Utiliza Isolation Forest de scikit-learn para identificar patrones atipicos. El diseno es limpio y accionable: sin graficas pesadas ni tablas extensas. Presenta un boton de entrenamiento, parrafo de analisis dinamico, recomendaciones priorizadas, descarga CSV y prompt listo para ChatGPT.

Resultados actuales: **312 anomalias detectadas** de 6,230 transacciones (tasa 5.01%).

---

## 2. Estructura Visual

### 2.1 Boton de Entrenamiento

| Elemento | Detalle |
|----------|---------|
| Boton | "Entrenar modelo" / "Reentrenar modelo" segun estado |
| Estado | Muestra si el modelo esta entrenado o no, con fecha del ultimo entrenamiento |
| Progreso | Spinner durante el entrenamiento (~10 segundos para 6K transacciones) |
| KPIs post-entrenamiento | Transacciones analizadas (6,230), anomalias detectadas (312), tasa (5.01%) |

### 2.2 Parrafo de Analisis (dinamico)

Texto generado automaticamente a partir de los datos del modelo. Describe:
- Cantidad total de transacciones analizadas y anomalias encontradas
- Almacen con mayor tasa de anomalia (nombre, tasa, score promedio)
- Patrones principales detectados
- Contexto operativo relevante

Este parrafo se regenera cada vez que se entrena el modelo con datos actualizados.

### 2.3 Recomendaciones (dinamicas, priorizadas)

Lista de recomendaciones generadas a partir del analisis, clasificadas por prioridad:

| Prioridad | Color | Significado |
|-----------|-------|-------------|
| Urgente | Rojo | Requiere atencion inmediata (almacenes con tasa > 30%) |
| Importante | Naranja | Debe atenderse pronto (patrones recurrentes significativos) |
| Informativo | Azul | Contexto y sugerencias de mejora continua |

Las recomendaciones son especificas con datos concretos (nombres de almacenes, porcentajes, montos).

### 2.4 Descarga CSV

Boton para descargar un archivo CSV con dos secciones:
- **Anomalias detectadas:** Lista de las 312 transacciones anomalas con ID, almacen, tipo, monto, fecha y anomaly score
- **Ranking de almacenes:** Todos los almacenes ordenados por tasa de anomalia con transacciones, anomalias, tasa y score promedio

### 2.5 Prompt para ChatGPT

Bloque de texto listo para copiar y pegar en ChatGPT u otro LLM. Incluye:
- Contexto del negocio (Joyerias Joz, Panama, USD)
- Datos embebidos: totales, distribucion por almacen, top anomalias
- Pregunta estructurada para obtener analisis complementario
- Boton "Copiar prompt" que copia al clipboard

---

## 3. Modelo de Machine Learning

### Algoritmo: Isolation Forest

| Parametro | Valor |
|-----------|-------|
| Algoritmo | Isolation Forest (scikit-learn) |
| `n_estimators` | 200 |
| `contamination` | 0.05 (5% esperado de anomalias) |
| `random_state` | 42 |

### Features (9 caracteristicas)

| # | Feature | Descripcion |
|---|---------|-------------|
| 1 | `monto` | Monto de la transaccion |
| 2 | `entrada` | Valor de entrada |
| 3 | `salida` | Valor de salida |
| 4 | `hora_minutos` | Hora convertida a minutos del dia |
| 5 | `almacen` | Codigo numerico del almacen |
| 6 | `tipo_encoded` | Tipo de transaccion codificado |
| 7 | `dia_semana` | Dia de la semana (0=Lunes, 6=Domingo) |
| 8 | `es_cruzada` | Indicador de transaccion cruzada (0/1) |
| 9 | `ratio_entrada_monto` | Ratio entre entrada y monto |

### Proceso de Entrenamiento

1. Se extraen todas las transacciones de la tabla `joz_transacciones` en PostgreSQL
2. Se calculan las 9 features a partir de los campos raw
3. Se entrena el modelo Isolation Forest con los datos completos
4. El modelo entrenado se serializa con `joblib` y se almacena en `ml_models/`
5. Se calculan los anomaly scores para todas las transacciones
6. Se generan el parrafo de analisis y las recomendaciones priorizadas

### Anomaly Score

| Rango | Significado | Color |
|-------|-------------|-------|
| 0 - 30 | Normal | Verde |
| 30 - 60 | Sospechoso | Amarillo |
| 60 - 80 | Anomalo | Naranja |
| 80 - 100 | Critico | Rojo |

El score se calcula usando `decision_function()` de scikit-learn, normalizado al rango 0-100.

---

## 4. Resultados Actuales (2026-04-21)

| Metrica | Valor |
|---------|-------|
| Transacciones analizadas | 6,230 |
| Anomalias detectadas | 312 |
| Tasa de anomalias | 5.01% |
| Almacenes evaluados | 30 |
| Cajeros en dataset | 114 |
| Tiempo de entrenamiento | ~10 segundos |

---

## 5. Endpoints consumidos

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/joz/ia/status/` | GET | Estado del modelo y estadisticas |
| `/api/joz/ia/entrenar/` | POST | Entrenar o reentrenar el modelo |
| `/api/joz/ia/anomalias/` | GET | Lista de anomalias detectadas |

### 5.1 GET `/api/joz/ia/status/`

```json
{
  "modelo_entrenado": true,
  "fecha_entrenamiento": "2026-04-21T14:30:00Z",
  "total_transacciones": 6230,
  "total_anomalias": 312,
  "tasa_anomalias": 5.01,
  "features": [
    "monto", "entrada", "salida", "hora_minutos",
    "almacen", "tipo_encoded", "dia_semana",
    "es_cruzada", "ratio_entrada_monto"
  ],
  "hiperparametros": {
    "n_estimators": 200,
    "contamination": 0.05,
    "random_state": 42
  }
}
```

### 5.2 POST `/api/joz/ia/entrenar/`

```json
{
  "status": "ok",
  "mensaje": "Modelo entrenado exitosamente",
  "transacciones_procesadas": 6230,
  "anomalias_detectadas": 312,
  "tasa_anomalias": 5.01,
  "tiempo_entrenamiento_seg": 9.8,
  "analisis": "Se analizaron 6,230 transacciones...",
  "recomendaciones": [
    { "prioridad": "urgente", "texto": "ALMACEN 70 presenta tasa de anomalia de 52.9%..." },
    { "prioridad": "importante", "texto": "Revisar patrones de concentracion..." },
    { "prioridad": "informativo", "texto": "La tasa global de 5.01% esta dentro..." }
  ]
}
```

### 5.3 GET `/api/joz/ia/anomalias/`

```json
{
  "total": 312,
  "anomalias": [
    {
      "id": 4521,
      "almacen": "ALMACEN 70",
      "tipo": "Empeno",
      "monto": 15200.00,
      "entrada": 15200.00,
      "salida": 0.00,
      "fecha": "2026-04-18T09:15:00Z",
      "anomaly_score": 92.3
    }
  ],
  "por_almacen": [
    {
      "almacen": "ALMACEN 70",
      "total_transacciones": 51,
      "anomalias": 27,
      "tasa_anomalia": 52.9,
      "score_promedio": 68.75
    }
  ]
}
```

---

## 6. Notas Tecnicas

- **Backend:** `joz/backend/joz/ml.py`
- **Frontend:** `joz/frontend/src/pages/AIModule.tsx`
- **Modelo almacenado:** Archivo `.joblib` en `ml_models/` dentro del contenedor backend
- **Libreria ML:** scikit-learn (Isolation Forest)
- **No requiere GPU:** Entrenamiento CPU-bound, ~10 segundos para 6K transacciones
- **El reentrenamiento reemplaza el modelo anterior**
- **Diseno:** Sin graficas pesadas ni tablas largas. Enfoque limpio y accionable: analisis textual, recomendaciones priorizadas, CSV descargable y prompt para LLM.
- **Moneda:** USD (Balboas panamenos, equivalente 1:1)
