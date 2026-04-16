# Implementación - Serviparamo/2-8-modulo-configuraciones

## Objetivo
Documentar la implementación del checklist **2.8 Módulo: Configuraciones** con estructura clara y persistencia real para:
- parámetros del sistema,
- configuración de ETL,
- preferencias de usuario.

## Rama de trabajo
- `Serviparamo/2-8-modulo-configuraciones`

## Resumen de implementación
Se transformó el módulo de Configuración de un formulario estático a un flujo completo con backend y frontend:
- modelo singleton de configuración en base de datos,
- endpoint GET/PATCH con validación por campo,
- integración de configuración ETL con la indexación semántica post-ETL,
- UI de `Settings.tsx` conectada a persistencia real.

---

## Cambios implementados

### Backend — `serviparamo/backend/serviparamo/models.py`

Se agregó modelo `Configuracion` (`db_table='serviparamo_configuracion'`) con PK fija:
- `id=1` (singleton global),
- **sistema**:
  - `nombre_empresa`
  - `correo_administrador`
  - `zona_horaria`
- **etl**:
  - `etl_auto_sync_activo`
  - `etl_intervalo_horas`
  - `etl_timeout_minutos`
  - `etl_solo_faltantes_embeddings`
- **preferencias de usuario**:
  - `pref_notificaciones_email`
  - `pref_alertas_duplicados`
  - `pref_reporte_normalizacion_semanal`
  - `pref_umbral_confianza`
  - `pref_umbral_similitud`
- `updated_at` automático.

### Backend — `serviparamo/backend/serviparamo/migrations/0004_configuracion.py`

Se creó migración para el modelo `Configuracion`.

### Backend — `serviparamo/backend/serviparamo/views.py`

#### 1) Helpers de configuración
- `_serializar_configuracion(config)`
- `_coerce_bool`, `_coerce_int`, `_coerce_text`, `_coerce_email`, `_coerce_timezone`

#### 2) Endpoint `configuracion` (GET/PATCH)
- `GET`: `get_or_create(pk=1)` y devuelve estructura por secciones.
- `PATCH`: valida payload por sección (`sistema`, `etl`, `preferencias_usuario`), acumula errores por campo y actualiza parcialmente.
- En error de validación retorna `400` con:
  - `error`
  - `fields` (mapa campo -> mensaje).

#### 3) Integración con ETL existente
- En `etl_run` se usa `Configuracion.etl_solo_faltantes_embeddings` para decidir si la indexación post-ETL corre en modo incremental o completo.
- Se mantiene `try/except` interno para que fallas de embeddings no aborten ETL.

### Backend — `serviparamo/backend/serviparamo/urls.py`

Se agregó:
- `path('configuracion/', views.configuracion, name='serviparamo-configuracion')`

---

### Frontend — `serviparamo/frontend/src/services/serviparamoService.js`

Se agregaron servicios:
- `getConfiguracion()`
- `updateConfiguracion(payload)`

Ambos consumen `GET/PATCH /api/serviparamo/configuracion/`.

### Frontend — `serviparamo/frontend/src/pages/Settings.tsx`

#### 1) Persistencia real de configuración
- Estado `config` estructurado por secciones.
- Carga inicial con `getConfiguracion()`.
- Guardado con `updateConfiguracion(payload)`.
- Mensajes de éxito/error y visualización de errores por campo.

#### 2) Estructura clara del módulo
Secciones visibles y separadas:
- **Sincronización ERP** (se conserva funcional),
- **Parámetros del Sistema**,
- **Configuración de ETL**,
- **Preferencias de Usuario**.

#### 3) Integración y UX
- Botón de guardado global con estado `Guardando...`.
- `Última actualización` desde `updated_at`.
- Estados `loading/saving/error` para configuración.

---

## Archivos modificados

| Archivo | Cambios |
|---|---|
| `serviparamo/backend/serviparamo/models.py` | Nuevo modelo `Configuracion` |
| `serviparamo/backend/serviparamo/migrations/0004_configuracion.py` | Migración del nuevo modelo |
| `serviparamo/backend/serviparamo/views.py` | Helpers + endpoint `configuracion` + uso de config en `etl_run` |
| `serviparamo/backend/serviparamo/urls.py` | Ruta `configuracion/` |
| `serviparamo/frontend/src/services/serviparamoService.js` | `getConfiguracion`, `updateConfiguracion` |
| `serviparamo/frontend/src/pages/Settings.tsx` | Refactor a formularios controlados con persistencia |
| `docs/Ajustes/checklist/plan_Serviparamo_2-8_modulo_configuraciones.md` | Plan de trabajo 2.8 |

---

## Validaciones ejecutadas

- Sintaxis backend:
  - `python3 -c "import ast, pathlib; files=['serviparamo/backend/serviparamo/models.py','serviparamo/backend/serviparamo/views.py','serviparamo/backend/serviparamo/urls.py','serviparamo/backend/serviparamo/migrations/0004_configuracion.py']; [ast.parse(pathlib.Path(f).read_text()) for f in files]; print('OK')"`
  - Resultado: **OK**

- Build frontend Servipáramo:
  - `cd serviparamo/frontend && npm run build`
  - Resultado: **OK**

---

## Criterios de aceptación cubiertos (2.8)

- [x] Definir qué información y opciones estarán disponibles.
- [x] Parámetros del sistema definidos e implementados.
- [x] Configuración de ETL definida e implementada.
- [x] Preferencias de usuario definidas e implementadas.
- [x] Estructura clara diseñada y materializada antes/durante implementación.

## Estado
**2.8 Módulo: Configuraciones — Implementado y documentado.**
