# Implementación - Joz/1-7-modulo-configuraciones

## Objetivo
Documentar los cambios implementados del checklist **1.7 Módulo: Configuraciones**.

## Rama de trabajo
- `Joz/1-7-modulo-configuraciones`

## Resumen de implementación
MVP funcional de Configuraciones con:
- persistencia real para la sección **Detección** (GET/PATCH con singleton `pk=1`),
- validación de payload por campo con mensajes de error estructurados,
- corrección del bug `EtlPanel` usando `getEtlStatusFull()`,
- dark theme consistente en toda la página (tabs, cards, inputs, tabla ETL),
- y deshabilitación explícita de secciones sin backend (sin features falsas).

---

## Cambios implementados — validados contra código real

### Backend — `joz/backend/joz/models.py` ✅
- Nuevo modelo `ConfigDeteccion`:
  - pk `PositiveSmallIntegerField(default=1, editable=False)` — patrón singleton explícito.
  - Flags booleanos: `enabled_alto_valor`, `enabled_multiples_transacciones`, `enabled_horario_inusual`, `enabled_descuentos_excesivos`.
  - Umbrales: `monto_maximo`, `descuento_maximo_pct`, `transacciones_por_hora`, `score_riesgo_min`.
  - `updated_at = auto_now=True`.
  - `db_table = 'joz_config_deteccion'`.

### Backend — `joz/backend/joz/views.py` ✅
- Import `from decimal import Decimal, InvalidOperation` agregado.
- Import `ConfigDeteccion` agregado junto a los otros modelos.
- Helper `_serializar_config_deteccion(config)` — reutilizado en GET y PATCH.
- Helpers de validación:
  - `_coerce_bool()` — acepta `bool`, `0/1`, strings `'true'/'false'/'si'/'no'`.
  - `_coerce_int(value, field, min, max)` — rechaza booleans disfrazados de int.
  - `_coerce_decimal(value, field, min, max)` — usa `Decimal(str(value))`.
- Endpoint `config_deteccion` (GET/PATCH):
  - `get_or_create(pk=1)` — crea defaults en DB limpia.
  - PATCH: valida todos los campos, acumula `field_errors`, retorna 400 con `fields` por campo.
  - PATCH vacío (sin campos válidos): retorna config actual sin modificar.
  - `config.save(update_fields=[*updates.keys(), 'updated_at'])` — solo actualiza campos enviados.

### Backend — `joz/backend/joz/urls.py` ✅
- `path('config/deteccion/', views.config_deteccion, name='joz-config-deteccion')` como primera ruta.

### Backend — Migración `0003_configdeteccion.py` ✅
- Presente y correcta: `dependencies` sobre `0002_...`, tabla `joz_config_deteccion`, todos los campos coinciden con el modelo.

### Frontend — `joz/frontend/src/services/api.js` ✅
- `getConfigDeteccion()` y `updateConfigDeteccion(payload)` agregados correctamente con `unwrap`.
- `getEtlStatusFull()` mantenido.

### Frontend — `joz/frontend/src/pages/Settings.tsx` ✅
- **`DisabledSection`**: componente reutilizable con `title`, `badgeText`, `message`, `detail`, `icon`.
  - Badge con `Lock` icon y estilo amber.
  - Bloque de detalle en `bg-slate-900/60 border-slate-700`.
- **`DetectionPanel`**: integración real completa.
  - Carga con `getConfigDeteccion()`, estado `loading` con `Loader2`.
  - Switches controlados con `checked={config.*}` y `onCheckedChange`.
  - Inputs controlados con `value={config.*}` y `onChange`.
  - Todo deshabilitado (`disabled={saving}`) durante guardado.
  - `handleSave` con `updateConfigDeteccion(config)`, estados `saving/error/success`.
  - Errores de campo del backend mostrados concatenados.
  - Timestamp "Última actualización" desde `config.updated_at`.
- **`EtlPanel`** — bug corregido y dark theme aplicado:
  - Usa `getEtlStatusFull()` en lugar de `getEtlStatus()`.
  - `setCorriendo(Boolean(res?.corriendo))` — estado real.
  - `setLogs(Array.isArray(res?.data) ? res.data : [])` — logs reales.
  - `setMensaje(res?.mensaje ?? 'ETL iniciado.')` — mensaje real del backend.
  - Dark theme: cards `bg-slate-800/70`, tabla con `bg-slate-900/70`, texto `text-slate-100/amber-200`.
- **Tabs deshabilitadas**:
  - `Usuarios` → `DisabledSection` "Gestionado por Hub".
  - `Notificaciones` → `DisabledSection` "Próximamente".
  - `Sistema` → `DisabledSection` "No habilitado".
  - Botón destructivo "Restablecer Sistema" **eliminado del DOM**.
- **Tab activa por defecto**: `defaultValue="detection"` (la única funcional).

---

## Archivos modificados

| Archivo | Cambios |
|---|---|
| `joz/backend/joz/models.py` | Modelo `ConfigDeteccion` |
| `joz/backend/joz/views.py` | Import `Decimal/ConfigDeteccion`, helpers `_coerce_*` + `_serializar_config_deteccion`, endpoint `config_deteccion` |
| `joz/backend/joz/urls.py` | Ruta `config/deteccion/` |
| `joz/backend/joz/migrations/0003_configdeteccion.py` | Migración para `joz_config_deteccion` |
| `joz/frontend/src/services/api.js` | `getConfigDeteccion`, `updateConfigDeteccion` |
| `joz/frontend/src/pages/Settings.tsx` | Refactor completo |

---

## Contrato funcional implementado

### `GET /api/joz/config/deteccion/`
Retorna configuración actual. Crea singleton con defaults si la tabla está vacía.

### `PATCH /api/joz/config/deteccion/`
Actualización parcial. Valida rangos:
- `descuento_maximo_pct`: `0..100`
- `score_riesgo_min`: `0..100`
- `transacciones_por_hora`: `1..500`
- `monto_maximo`: `0.01..9999999999999999.99`
- Flags booleanos: acepta `bool`, `0/1`, strings `'true'/'false'`

En error:
```json
{ "ok": false, "error": "Errores de validación en la configuración.", "fields": { "campo": "mensaje" } }
```

---

## Comandos pendientes (entorno con Django)

```bash
cd /home/desarrollo/barranquIA-clean/joz/backend
python manage.py migrate
```

La migración `0003_configdeteccion.py` ya existe — solo falta aplicarla.

---

## Criterios de aceptación cubiertos (1.7)

- [x] Alcance funcional por sección definido y reflejado en UI.
- [x] Detección con persistencia real (GET/PATCH) + estados UX completos.
- [x] Secciones sin backend deshabilitadas, sin formularios activos.
- [x] Botón destructivo "Restablecer Sistema" eliminado del DOM.
- [x] `EtlPanel` corregido: `corriendo` y logs se leen correctamente.
- [x] Dark theme consistente en toda la página.
- [x] Tab activa por defecto: Detección (la funcional).

## Estado
**1.7 Módulo: Configuraciones — Completado (pendiente `python manage.py migrate` en entorno Django).**
