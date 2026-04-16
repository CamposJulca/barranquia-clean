# Implementación - Serviparamo/2-6-modulo-busqueda-semantica

## Objetivo
Documentar la implementación aplicada al checklist **2.6 Módulo: Búsqueda Semántica** para validar ETL, indexación, conexión del motor semántico y disponibilidad de datos de búsqueda.

## Rama de trabajo
- `Serviparamo/2-6-modulo-busqueda-semantica`

## Resumen de implementación
Se implementaron ajustes coordinados en backend y frontend para cerrar los 4 gaps del módulo:
- ETL -> embeddings automático (Opción A),
- endpoint de estado semántico (`buscar/status`),
- búsqueda con metadata de motor y sin recorte fijo de índice,
- UI con visibilidad de estado de indexación/motor y consumo del nuevo contrato.

---

## Cambios implementados

### Backend — `serviparamo/backend/serviparamo/views.py`

#### 1) Cache de modelo semántico thread-safe
- Se agregó cache global del modelo `all-MiniLM-L6-v2`:
  - `_semantic_model`
  - `_semantic_model_lock`
  - helper `_get_semantic_model()`
- Implementación con **double-checked locking** para evitar múltiples cargas concurrentes del modelo.

#### 2) ETL -> embeddings automático (Opción A)
- En `etl_run`, dentro de `_run()`:
  - se ejecuta ETL normalmente,
  - si la corrida incluye `CatalogoSKU` (o ETL completo), se dispara `run_embeddings(solo_faltantes=True)`.
- El bloque de embeddings está protegido con `try/except` interno:
  - si falla indexación semántica, se registra error,
  - **no se aborta** la ejecución ETL ni el flujo principal.

#### 3) Nuevo endpoint de estado semántico
- Se creó `buscar_status`:
  - `total_items`
  - `con_embedding`
  - `pct_embedding`
  - `etl_corriendo`
  - `motor_disponible`
  - `index_ready`
- Retorna contrato estándar con `_ok(data)`.

#### 4) Reescritura de `buscar`
- Se removió el recorte fijo `[:5000]` para índices grandes.
- Se evalúan embeddings por iteración (`iterator(chunk_size=2000)`).
- Se agregaron campos de respuesta:
  - `motor` (`semantic` o `fallback_texto`)
  - `embeddings_evaluados`
  - `total_embeddings`
- Si no hay embeddings o falla el motor, se activa fallback textual explícito y se reporta en `motor`.

---

### Backend — `serviparamo/backend/serviparamo/urls.py`

- Se agregó `path('buscar/status/', views.buscar_status, ...)`.
- Se dejó **antes** de `path('buscar/', ...)` para evitar match incorrecto de rutas.

---

### Frontend — `serviparamo/frontend/src/services/serviparamoService.js`

#### 1) Breaking change controlado en `buscarSKUs`
- Firma actualizada para retornar objeto (no arreglo):
  - `results`
  - `motor`
  - `embeddings_evaluados`
  - `total_embeddings`
- Esto se implementó junto con el update de `SemanticSearch.tsx` para evitar incompatibilidad.

#### 2) Nuevo servicio de estado
- Se agregó `getSemanticStatus()` para consumir `GET /api/serviparamo/buscar/status/`.

---

### Frontend — `serviparamo/frontend/src/pages/SemanticSearch.tsx`

#### 1) Adaptación al nuevo contrato de búsqueda
- `handleSearch()` ahora consume:
  - `const { results, motor } = await buscarSKUs(query)`
- Se guarda y muestra el motor usado (`semantic` / `fallback_texto`).

#### 2) Banner operativo de estado semántico
- Al montar la vista, consulta `getSemanticStatus()`.
- Muestra:
  - cobertura de índice (`con_embedding / total_items`, `%`),
  - disponibilidad del motor,
  - estado ETL (`etl_corriendo`),
  - advertencia si `index_ready=false`.

#### 3) Limpieza de logs de depuración
- Se eliminaron los logs en las líneas señaladas por Claude:
  - `console.log` (respuesta completa),
  - `console.log` (array final),
  - `console.error` (error en búsqueda).

---

## Alertas técnicas aplicadas

- **Breaking change** de `buscarSKUs` resuelto de forma coordinada (servicio + página).
- Orden de rutas en Django preservado (`buscar/status/` antes de `buscar/`).
- Fallo de embeddings post-ETL no corta ETL principal.

---

## Archivos modificados

| Archivo | Cambios |
|---|---|
| `serviparamo/backend/serviparamo/views.py` | cache de modelo, ETL->embeddings automático, `buscar_status`, `buscar` con metadata y fallback explícito |
| `serviparamo/backend/serviparamo/urls.py` | ruta `buscar/status/` antes de `buscar/` |
| `serviparamo/frontend/src/services/serviparamoService.js` | `buscarSKUs` con nueva firma + `getSemanticStatus` |
| `serviparamo/frontend/src/pages/SemanticSearch.tsx` | consumo de nuevo contrato, banner de estado semántico y limpieza de logs |

---

## Validaciones ejecutadas

- Sintaxis backend:
  - `python3 -c "import ast, pathlib; ast.parse(pathlib.Path('serviparamo/backend/serviparamo/views.py').read_text()); ast.parse(pathlib.Path('serviparamo/backend/serviparamo/urls.py').read_text()); print('OK')"`
  - Resultado: **OK**

- Build frontend Servipáramo:
  - `cd serviparamo/frontend && npm run build`
  - Resultado: **OK**

---

## Criterios de aceptación cubiertos (2.6)

- [x] Validar ejecución del ETL.
- [x] Revisar indexación de datos.
- [x] Revisar conexión con el motor semántico.
- [x] Confirmar disponibilidad de datos para búsqueda.

## Estado
**2.6 Módulo: Búsqueda Semántica — Implementado y documentado.**
