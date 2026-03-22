# Documento Funcional — Módulo ServiPáramo
## Normalización Inteligente de Catálogo de SKUs

**Versión:** 1.0
**Fecha:** 2026-03-18
**Proyecto:** BarranquIA Hub
**Módulo:** ServiPáramo
**URL:** https://barranquia-hub.ngrok.io/serviparamo

---

## 1. Contexto del negocio

ServiPáramo es una empresa distribuidora de insumos y equipos industriales. Su catálogo de inventario cuenta con más de 127,000 registros en SQL Server, acumulados durante años de operación. Este catálogo presenta tres problemas críticos que impactan la operación diaria:

**1. Duplicados masivos:** El 68.7% de los registros son duplicaciones del mismo ítem —mismo producto cargado múltiples veces con variaciones mínimas en el nombre o código. Esto genera confusión en compras, errores en valoración de inventario y reportes incorrectos.

**2. Familias inconsistentes:** El mismo tipo de producto aparece bajo nombres de familia distintos según quién lo ingresó: `ELECTRICO`, `ELECTRICOS`, `Eléctrico`, `electrico`. Esto hace imposible filtrar o analizar el inventario por categoría de forma confiable.

**3. Descripciones no estructuradas:** Los campos `nombre` y `nombre1` son texto libre sin convención, lo que dificulta búsquedas y comparaciones.

El módulo ServiPáramo del BarranquIA Hub resuelve estos tres problemas de forma automatizada y asistida por IA.

---

## 2. Objetivos funcionales

| # | Objetivo | Indicador de éxito |
|---|---|---|
| 1 | Detectar todos los SKUs duplicados | Grupos de duplicados identificados con > 90% precisión |
| 2 | Unificar familias con variantes ortográficas | ≤ 22 familias únicas (vs 30+ actuales con duplicados) |
| 3 | Proveer búsqueda semántica del catálogo | El usuario encuentra "válvula esfera" buscando "válvula de bola" |
| 4 | Permitir aprobar consolidaciones de forma asistida | El equipo registra al menos 10 aprobaciones en la demo |
| 5 | Exponer datos limpios para Power BI | API consumible por Andrés en Sprint 3 |

---

## 3. Actores del módulo

| Actor | Descripción | Acciones principales |
|---|---|---|
| **Analista de inventario** | Empleado de ServiPáramo que revisa el catálogo | Buscar ítems, revisar duplicados, aprobar consolidaciones |
| **Jefe de compras** | Valida las normalizaciones antes de aplicarlas a producción | Aprobar grupos, renombrar familias |
| **Analista BI (Andrés)** | Consume la API para construir reportes en Power BI | Consultar `/stats/`, `/familias/`, `/duplicados/` |
| **Sistema ETL** | Proceso automático que extrae y carga el catálogo | Ejecutar ETL, embeddings, clustering |

---

## 4. Flujo principal de uso

```
1. Sistema extrae catálogo desde SQL Server (ETL automático)
        ↓
2. Sistema genera embeddings semánticos para cada ítem
        ↓
3. Sistema clusteriza y detecta duplicados automáticamente
        ↓
4. Analista revisa el Dashboard → entiende el estado del catálogo
        ↓
5. Analista usa el Buscador → encuentra ítems por descripción libre
        ↓
6. Analista revisa la vista Duplicados → valida grupos detectados
        ↓
7. Analista aprueba grupo (con o sin cambio de familia)
        ↓
8. Analista revisa la vista Familias → fusiona variantes ortográficas
        ↓
9. Andrés (BI) consume la API con datos normalizados → Power BI
```

---

## 5. Funcionalidades por vista

---

### 5.1 Dashboard — `/serviparamo/dashboard`

**Propósito:** Dar al analista una visión instantánea del estado del catálogo.

**Información mostrada:**

| KPI | Descripción |
|---|---|
| Total ítems | Registros cargados en el sistema |
| Duplicados % | Porcentaje del catálogo con duplicación detectada |
| Familias | Cantidad de familias normalizadas únicas |
| Sin familia | Ítems sin clasificación de familia |
| Aprobados | Ítems cuya normalización fue validada manualmente |
| Con embedding % | Progreso de vectorización semántica |
| Grupos duplicados | Número de grupos de ítems similares |

**Barras de progreso:**
- Embeddings generados (azul) — crece a medida que el proceso corre
- Ítems aprobados (verde) — crece con las aprobaciones del analista

**No requiere acción del usuario.** Solo lectura.

---

### 5.2 Buscador — `/serviparamo/buscar`

**Propósito:** Permitir al analista encontrar cualquier ítem del catálogo con lenguaje natural, sin necesidad de conocer el código exacto.

**Modos de búsqueda:**

| Modo | Cuándo activa | Ejemplo |
|---|---|---|
| **Semántico** | Cuando hay embeddings generados | "válvula de bola" → encuentra "válvula esfera 1/2"" |
| **Textual** | Fallback si no hay embeddings | Busca en nombre, nombre1, familia, código |

**Campos mostrados por resultado:**
- Código del SKU
- Nombre del producto
- Familia normalizada (chip)
- Similitud (% si es búsqueda semántica)
- Estado: Duplicado / Único

**Límite:** 30 resultados por búsqueda. Configurable hasta 100.

---

### 5.3 Duplicados — `/serviparamo/duplicados`

**Propósito:** Permitir al analista revisar y validar los grupos de ítems que el sistema detectó como duplicados, y aprobar su consolidación.

**Información por grupo:**
- Familia sugerida (editable)
- Número de ítems en el grupo
- Número de ítems ya aprobados
- Tabla con código, nombre y unidad de cada ítem

**Acciones disponibles:**

| Acción | Descripción |
|---|---|
| **Editar familia** | El analista puede cambiar el nombre de familia antes de aprobar |
| **Aprobar grupo** | Marca todos los ítems del grupo como aprobados con la familia indicada |
| **Aprobar ítem** | Aprueba un ítem individual sin afectar al grupo |

**Paginación:** 10 grupos por página, navegación anterior/siguiente.

**Estado visual:**
- Grupos completamente aprobados se muestran atenuados con borde verde
- Filas aprobadas aparecen en opacidad reducida con badge "✓"

---

### 5.4 Familias — `/serviparamo/familias`

**Propósito:** Permitir al analista unificar variantes ortográficas de familias (ej: `ELECTRICO` y `ELECTRICOS`) en una sola denominación normalizada.

**Información por familia:**
- Nombre normalizado
- Total de ítems
- Cantidad de duplicados
- Porcentaje de duplicación (badge amarillo si > 50%, verde si ≤ 50%)

**Acción "Fusionar →":**
1. El analista hace clic en "Fusionar →" junto a una familia
2. Aparece un campo de texto inline para escribir la familia destino
3. Al confirmar, todos los ítems de la familia origen pasan a la familia destino
4. La tabla se refresca automáticamente mostrando el resultado

---

## 6. Reglas de negocio

| Regla | Descripción |
|---|---|
| RN-01 | Un ítem se marca como duplicado si su similitud coseno con otro ítem es ≥ 0.92 |
| RN-02 | Los ítems con código exactamente igual siempre se marcan como duplicados independientemente de la similitud semántica |
| RN-03 | La familia normalizada de un cluster se determina por votación mayoritaria entre los ítems del cluster |
| RN-04 | Un ítem marcado como "aprobado" no puede desaprobarse desde la interfaz (solo desde Django Admin) |
| RN-05 | Al fusionar familias, el sistema no distingue entre mayúsculas y minúsculas en el origen, pero preserva la capitalización del destino |
| RN-06 | El ETL vacía y recarga la tabla completa en cada ejecución — los embeddings y aprobaciones se pierden si se recarga sin respaldo |
| RN-07 | La búsqueda semántica usa el mismo modelo (`all-MiniLM-L6-v2`) que generó los embeddings |

---

## 7. Casos de uso

### CU-01: Buscar un ítem por descripción

**Actor:** Analista de inventario
**Precondición:** El módulo está cargado y el catálogo tiene datos

1. El analista navega a `/serviparamo/buscar`
2. Escribe en el campo: *"extractor helicocentrifugo"*
3. El sistema retorna los 30 ítems más similares semánticamente
4. El analista identifica el ítem correcto y anota su código
5. **Fin del caso de uso**

**Alternativa:** Si no hay embeddings, el sistema hace búsqueda por texto exacto en nombre y familia.

---

### CU-02: Aprobar consolidación de un grupo de duplicados

**Actor:** Jefe de compras
**Precondición:** El clustering fue ejecutado y existen grupos de duplicados

1. El jefe navega a `/serviparamo/duplicados`
2. Revisa el primer grupo: 12 ítems con familia "Equipos"
3. Edita el campo de familia: cambia "Equipos" por "Equipos De Ventilación"
4. Hace clic en "✓ Aprobar grupo"
5. El sistema actualiza los 12 ítems: `aprobado=True`, `familia_normalizada="Equipos De Ventilación"`
6. El grupo se muestra atenuado con borde verde
7. **Fin del caso de uso**

---

### CU-03: Fusionar variantes de una familia

**Actor:** Analista de inventario
**Precondición:** Existen familias con variantes ortográficas

1. El analista navega a `/serviparamo/familias`
2. Identifica "ELECTRICO" (234 ítems) y "ELECTRICOS" (89 ítems) como la misma familia
3. Hace clic en "Fusionar →" junto a "ELECTRICO"
4. Escribe "Eléctrico" en el campo de destino
5. Confirma → el sistema mueve los 234 ítems a "Eléctrico"
6. Repite el proceso para "ELECTRICOS" → "Eléctrico"
7. La tabla ahora muestra "Eléctrico" con 323 ítems unificados
8. **Fin del caso de uso**

---

## 8. Métricas de éxito del MVP

| Métrica | Valor actual | Meta MVP |
|---|---|---|
| Embeddings generados | 0% | ≥ 80% |
| Familias normalizadas | 30 (con variantes) | ≤ 22 (sin duplicados) |
| Grupos de duplicados | 848 (por código exacto) | > 1,000 (semánticos) |
| Aprobaciones registradas | 0 | ≥ 10 en demo |
| Búsqueda semántica activa | No | Sí |
| Tiempo respuesta búsqueda | < 500ms (texto) | < 2s (semántica) |

---

## 9. Limitaciones conocidas del MVP

| Limitación | Impacto | Plan |
|---|---|---|
| Embeddings en SQLite (JSON) | Búsqueda semántica lenta en 127K registros | Migrar a PG + pgvector en producción |
| No hay paginación en el buscador | Máximo 100 resultados | Suficiente para el prototipo |
| Sin autenticación a nivel de módulo | Cualquier usuario del Hub accede a ServiPáramo | Se gestiona con autenticación del Hub |
| ETL recarga completa | Las aprobaciones se pierden si se re-ejecuta el ETL | Agregar flag `--keep-aprobados` en Sprint 2 |
| Embeddings no en tiempo real | Los ítems nuevos en SQL Server no aparecen hasta el próximo ETL | ETL programado (cron) en Sprint 2 |

---

## 10. Glosario

| Término | Definición |
|---|---|
| **SKU** | Stock Keeping Unit — unidad de identificación de un producto en el inventario |
| **Embedding** | Representación vectorial de texto que captura su significado semántico |
| **Similitud coseno** | Métrica entre 0 y 1 que mide qué tan similares son dos vectores |
| **Cluster** | Grupo de SKUs agrupados automáticamente por similitud semántica |
| **Familia normalizada** | Nombre unificado asignado a un cluster de productos similares |
| **Duplicado semántico** | Ítem que describe el mismo producto que otro, aunque con nombre distinto |
| **Aprobación** | Validación manual de que la normalización automática es correcta |

---

*Módulo ServiPáramo — BarranquIA Hub*
*Ruta IA — Cámara de Comercio de Barranquilla × Boost Business Consulting*
*Última actualización: 18 de marzo de 2026*
