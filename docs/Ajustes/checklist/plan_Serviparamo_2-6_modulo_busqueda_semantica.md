# Plan de Implementación - Serviparamo/2-6-modulo-busqueda-semantica

## Objetivo
Completar el checklist **2.6 Módulo: Búsqueda Semántica** corrigiendo los cuatro gaps reales encontrados en revisión de código y cerrando las decisiones técnicas abiertas.

## Branch de trabajo
`Serviparamo/2-6-modulo-busqueda-semantica`

## Alcance (Checklist 2.6)
- [ ] Validar ejecución del ETL.
- [ ] Revisar indexación de datos.
- [ ] Revisar conexión con el motor semántico.
- [ ] Confirmar disponibilidad de datos para búsqueda.

---

## Estado real del código (revisión de código previa)

### Lo que ya funciona
- `GET /api/serviparamo/buscar/` realiza búsqueda semántica con embeddings coseno, con fallback `icontains` si `sentence_transformers` no está disponible.
- `GET /api/serviparamo/stats/` ya expone `total_items`, `con_embedding`, `pct_embedding` — estos datos **no se deben duplicar**.
- `embeddings.py::run(solo_faltantes=True)` genera solo embeddings faltantes — base para integración automática.
- Modelo `CatalogoEmbedding` con `vector (JSONField)`, `texto_fuente`, `generado_en`, clave `OneToOne` con `CatalogoSKU`.

### Gaps encontrados

| # | Gap | Archivo | Impacto |
|---|---|---|---|
| 1 | `SentenceTransformer` se instancia en cada request | `views.py:288` | Carga ~90MB de modelo por búsqueda — muy lento |
| 2 | `[:5000]` recorta el índice cuando hay más de 10.000 embeddings | `views.py:293` | Recall reducido silenciosamente |
| 3 | `buscar` no expone `motor` en respuesta — frontend no sabe si fue semántico o fallback | `views.py:310,317` | Opacidad operativa |
| 4 | ETL no encadena generación de embeddings — índice queda desactualizado tras sincronización | `views.py:254` (`_run()`) | Desincronización catálogo/índice |
| 5 | `SemanticSearch.tsx` tiene 3 `console.log/error` y no muestra estado del índice ni modo de búsqueda | `SemanticSearch.tsx:40,47,64` | Debug en producción, sin observabilidad |
| 6 | `buscarSKUs` en servicio retorna solo array — descarta `motor` y metadata | `serviparamoService.js:30-33` | Impide mostrar modo de búsqueda en UI |

---

## Diseño técnico

### 1) Backend — Cache del modelo semántico (`views.py`)

Agregar **antes** de la función `buscar`, a nivel de módulo:

```python
# Cache del modelo semántico (carga única por proceso)
_semantic_model = None
_semantic_model_lock = threading.Lock()

def _get_semantic_model():
    global _semantic_model
    if _semantic_model is None:
        with _semantic_model_lock:
            if _semantic_model is None:   # double-checked locking
                from sentence_transformers import SentenceTransformer
                _semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
    return _semantic_model
```

### 2) Backend — Refactor `buscar` (`views.py`)

Reemplazar la función `buscar` completa:

```python
@api_view(['GET'])
def buscar(request):
    """Búsqueda semántica por texto libre usando embeddings."""
    q = request.GET.get('q', '').strip()
    limite = min(int(request.GET.get('limit', 20)), 100)

    if not q:
        return _err('Parámetro q requerido.')

    try:
        import numpy as np
        modelo = _get_semantic_model()           # usa cache, no reinstancia
        vector_query = modelo.encode([q], normalize_embeddings=True)[0]

        embeddings_qs = CatalogoEmbedding.objects.select_related('sku').all()
        total_evaluados = embeddings_qs.count()  # sin cap [:5000]

        resultados = []
        for emb in embeddings_qs.iterator(chunk_size=2000):
            v = np.array(emb.vector, dtype=np.float32)
            sim = float(np.dot(vector_query, v))
            resultados.append((sim, emb.sku))

        resultados.sort(key=lambda x: x[0], reverse=True)
        data = []
        for sim, sku in resultados[:limite]:
            row = SKUResumenSerializer(sku).data
            row['similitud'] = round(sim, 4)
            data.append(row)

        response_data = _ok(data, count=len(data))
        response_data['motor'] = 'semantic'
        response_data['embeddings_evaluados'] = total_evaluados
        return Response(response_data)

    except ImportError:
        qs = CatalogoSKU.objects.filter(
            Q(nombre__icontains=q) | Q(nombre1__icontains=q) |
            Q(familia__icontains=q) | Q(codigo__icontains=q)
        )[:limite]
        response_data = _ok(SKUResumenSerializer(qs, many=True).data)
        response_data['motor'] = 'fallback_texto'
        response_data['embeddings_evaluados'] = 0
        return Response(response_data)
```

### 3) Backend — Nuevo endpoint `buscar/status` (`views.py` + `urls.py`)

**Por qué un endpoint nuevo en lugar de usar `/stats/`**: `/stats/` hace 8+ queries para información del catálogo completa. `buscar/status/` es liviano y especializado para el módulo de búsqueda.

Agregar en `views.py`:

```python
@api_view(['GET'])
def buscar_status(request):
    """Estado del índice semántico y disponibilidad del motor."""
    total = CatalogoSKU.objects.count()
    con_embedding = CatalogoEmbedding.objects.count()

    motor_disponible = False
    try:
        from sentence_transformers import SentenceTransformer  # noqa: F401
        motor_disponible = True
    except ImportError:
        pass

    return Response(_ok({
        'total_items':       total,
        'con_embedding':     con_embedding,
        'pct_embedding':     round(con_embedding / total * 100, 1) if total else 0,
        'motor_disponible':  motor_disponible,
        'index_ready':       con_embedding > 0 and motor_disponible,
        'etl_corriendo':     _etl_lock.locked(),
    }))
```

Agregar en `urls.py` **antes** de `buscar/`:

```python
path('buscar/status/',        views.buscar_status,   name='serviparamo-buscar-status'),
path('buscar/',               views.buscar,          name='serviparamo-buscar'),
```

> **Importante**: `buscar/status/` debe ir antes que `buscar/` en `urlpatterns` para que Django no lo interprete como `buscar/` con un parámetro extra.

### 4) Backend — Integración ETL → embeddings automática (`views.py`)

**Decisión**: **Opción A — encadenamiento automático** tras ETL de `CatalogoSKU`.

Justificación: `embeddings.py::run(solo_faltantes=True)` ya evita regenerar embeddings existentes. El ETL es async (background thread), así que agregar embeddings extiende el tiempo de ejecución pero no bloquea el servidor. El lock `_etl_lock` cubre todo el proceso.

Reemplazar el `try/except` de `_run()` en `etl_run`:

```python
def _run():
    global _etl_running
    try:
        from serviparamo.etl import run
        run(tablas=tablas)
        # Encadenar generación de embeddings solo para SKUs nuevos/sin embedding
        try:
            from serviparamo.embeddings import run as run_embeddings
            run_embeddings(solo_faltantes=True)
        except Exception as emb_err:
            import logging
            logging.getLogger(__name__).warning(
                f"Embeddings post-ETL fallaron (no crítico): {emb_err}"
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"ETL falló: {e}")
    finally:
        _etl_running = False
        _etl_lock.release()
```

> Si `sentence_transformers` no está instalado, el error de embeddings se loguea como warning y no aborta el ETL.

### 5) Frontend servicio — `serviparamoService.js`

**Cambio de firma de `buscarSKUs`**: actualmente retorna solo array, ahora retorna `{results, motor}`:

```js
// Reemplazar buscarSKUs existente:
export const buscarSKUs = async (query, limit = 20) => {
  const res = await api.get('/api/serviparamo/buscar/', { params: { q: query, limit } })
  const body = unwrap(res)
  // body = { ok, count, motor, embeddings_evaluados, data: [...] }
  return {
    results: Array.isArray(body) ? body : (body?.data ?? []),
    motor:   body?.motor ?? null,
  }
}

// Agregar nuevo:
export const getSemanticStatus = async () => {
  const res = await api.get('/api/serviparamo/buscar/status/')
  return unwrap(res)   // { ok, data: { total_items, con_embedding, ... } }
}
```

> **Atención**: `buscarSKUs` es un cambio de firma. `SemanticSearch.tsx` usa `res` como array hoy — debe actualizarse en paralelo a este cambio (paso 6).

### 6) Frontend página — `SemanticSearch.tsx`

Reescribir con los siguientes cambios respecto al archivo actual:

#### Estados adicionales necesarios
```tsx
const [semanticStatus, setSemanticStatus] = useState<{
  total_items: number
  con_embedding: number
  pct_embedding: number
  motor_disponible: boolean
  index_ready: boolean
  etl_corriendo: boolean
} | null>(null)
const [lastMotor, setLastMotor] = useState<string | null>(null)
```

#### Carga de estado en montaje
```tsx
useEffect(() => {
  getSemanticStatus()
    .then((d) => setSemanticStatus(d))
    .catch(() => {})
}, [])
```

Imports a agregar: `getSemanticStatus` desde el servicio. Importar `AlertTriangle`, `CheckCircle2` de `lucide-react`.

#### Cambio en `handleSearch` — adaptar a nueva firma de `buscarSKUs`
```tsx
const res = await buscarSKUs(query)
// res = { results: [...], motor: 'semantic' | 'fallback_texto' | null }
const data = res.results
setLastMotor(res.motor)

if (!data.length) {
  setResults([])
  return
}
const mapped: SearchResult[] = data.map((item: BackendSKU) => ({
  id: item.id,
  name: item.nombre || "Sin nombre",
  category: item.familia_normalizada || "Sin categoría",
  similarity: item.similitud ?? 0,
}))
setResults(mapped)
```

Eliminar las 3 líneas `console.log`/`console.error` (actuales líneas 40, 47, 64).

#### Banner de estado del índice (antes del input de búsqueda)
```tsx
{semanticStatus && (
  <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
    !semanticStatus.index_ready
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : semanticStatus.etl_corriendo
      ? 'bg-blue-50 border-blue-200 text-blue-800'
      : 'bg-green-50 border-green-200 text-green-800'
  }`}>
    {!semanticStatus.motor_disponible ? (
      <><AlertTriangle className="w-4 h-4 shrink-0" />
        Motor semántico no disponible. Se usará búsqueda textual como fallback.</>
    ) : !semanticStatus.index_ready ? (
      <><AlertTriangle className="w-4 h-4 shrink-0" />
        Índice semántico vacío. Ejecuta el ETL desde Configuración para indexar el catálogo.</>
    ) : semanticStatus.etl_corriendo ? (
      <><Loader className="w-4 h-4 shrink-0 animate-spin" />
        ETL en ejecución — el índice se actualizará al finalizar.</>
    ) : (
      <><CheckCircle2 className="w-4 h-4 shrink-0" />
        Motor semántico listo · {semanticStatus.con_embedding.toLocaleString()} SKUs indexados
        ({semanticStatus.pct_embedding}% del catálogo)</>
    )}
  </div>
)}
```

Importar `Loader` de `lucide-react`.

#### Badge de modo en los resultados
Agregar junto al conteo de resultados:
```tsx
{lastMotor && (
  <Badge variant="outline" className={
    lastMotor === 'semantic'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-gray-100 text-gray-600 border-gray-200'
  }>
    {lastMotor === 'semantic' ? '🔍 Semántico' : '🔤 Textual'}
  </Badge>
)}
```

---

## Archivos a modificar

| Archivo | Cambios |
|---|---|
| `serviparamo/backend/serviparamo/views.py` | Cache `_semantic_model` + `_get_semantic_model()`, refactor `buscar` (quitar cap `:5000`, agregar `motor`), nuevo `buscar_status`, integración embeddings en `_run()` |
| `serviparamo/backend/serviparamo/urls.py` | Ruta `buscar/status/` antes de `buscar/` |
| `serviparamo/frontend/src/services/serviparamoService.js` | `buscarSKUs` retorna `{results, motor}`, agregar `getSemanticStatus` |
| `serviparamo/frontend/src/pages/SemanticSearch.tsx` | Eliminar `console.log/error`, adaptar a nueva firma, agregar estado/banner/badge |

---

## Pasos de implementación

### 1) Backend
- [ ] Agregar `_semantic_model`, `_semantic_model_lock`, `_get_semantic_model()` a nivel módulo (después de `_etl_lock`).
- [ ] Reemplazar `buscar` con la versión que usa `_get_semantic_model()`, elimina el cap `[:5000]`, y agrega `motor` + `embeddings_evaluados` al response.
- [ ] Agregar `buscar_status` view.
- [ ] Agregar en `_run()` el bloque de embeddings post-ETL con su propio `try/except` interno.
- [ ] Agregar ruta `buscar/status/` en `urls.py` **antes** de `buscar/`.

### 2) Frontend servicio
- [ ] Cambiar `buscarSKUs` para retornar `{results, motor}`.
- [ ] Agregar `getSemanticStatus`.

### 3) Frontend página
- [ ] Agregar imports: `getSemanticStatus`, `AlertTriangle`, `CheckCircle2`, `Loader`.
- [ ] Agregar estados `semanticStatus` y `lastMotor`.
- [ ] Agregar `useEffect` de carga de estado en montaje.
- [ ] Actualizar `handleSearch`: eliminar `console.log/error`, adaptar a `res.results`/`res.motor`.
- [ ] Agregar banner de estado antes del input.
- [ ] Agregar badge de modo en sección de resultados.

### 4) Validación funcional
- [ ] Caso A: sin embeddings → banner muestra "Índice vacío, ejecuta ETL".
- [ ] Caso B: embeddings listos → banner verde con conteo y %, búsqueda retorna `motor: "semantic"`, badge "Semántico".
- [ ] Caso C: `sentence_transformers` no disponible → banner warning, resultado con `motor: "fallback_texto"`, badge "Textual".
- [ ] Caso D: tras ejecutar ETL, embeddings se generan automáticamente (verificable en `/buscar/status/`).
- [ ] Build frontend compila sin errores TypeScript.

---

## Criterios de aceptación
- `GET /buscar/status/` retorna estado real del índice y del motor.
- `GET /buscar/` incluye `motor` y `embeddings_evaluados` en cada respuesta.
- El modelo `SentenceTransformer` se carga una sola vez por proceso (no por request).
- El índice evalúa todos los embeddings disponibles sin cap artificial.
- Tras un ETL exitoso, los SKUs nuevos obtienen embedding automáticamente.
- `SemanticSearch.tsx` muestra el estado del índice y el modo de búsqueda sin `console.log`.
