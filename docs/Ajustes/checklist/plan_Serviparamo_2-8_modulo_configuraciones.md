# Plan de Implementación - Serviparamo/2-8-modulo-configuraciones

## Objetivo
Implementar el módulo **2.8 Configuraciones** con estructura clara y persistencia real para las tres secciones solicitadas: parámetros del sistema, configuración de ETL y preferencias de usuario.

## Branch de trabajo
`Serviparamo/2-8-modulo-configuraciones`

## Alcance (Checklist 2.8)
- [ ] Definir qué información y opciones estarán disponibles:
  - [ ] Parámetros del sistema.
  - [ ] Configuración de ETL.
  - [ ] Preferencias de usuario.
- [ ] Diseñar estructura clara antes de implementación.

---

## Estado actual del código

- El frontend `Settings.tsx` muestra formularios estáticos (sin persistencia backend) para General/IA/Notificaciones.
- No existe modelo de configuración en backend para Servipáramo.
- No existe endpoint GET/PATCH para configuración.
- El bloque ETL ya es funcional y debe preservarse.

---

## Decisiones de diseño

### 1) Modelo de datos único (singleton)
- Crear modelo `Configuracion` (PK fija = 1) en backend.
- Justificación: permite configuración global del proyecto sin complejidad multi-tenant.

### 2) Contrato API unificado
- Endpoint: `GET/PATCH /api/serviparamo/configuracion/`.
- Payload estructurado por secciones:
  - `sistema`
  - `etl`
  - `preferencias_usuario`

### 3) UI por secciones explícitas
- En `Settings.tsx` mantener 4 bloques:
  - Sincronización ERP (existente, no romper),
  - Parámetros del sistema,
  - Configuración ETL,
  - Preferencias de usuario.

---

## Especificación funcional por sección

### Parámetros del sistema
- `nombre_empresa`
- `correo_administrador`
- `zona_horaria`

### Configuración de ETL
- `auto_sync_activo`
- `intervalo_horas`
- `timeout_minutos`
- `solo_faltantes_embeddings`

### Preferencias de usuario
- `notificaciones_email`
- `alertas_duplicados`
- `reporte_normalizacion_semanal`
- `umbral_confianza` (0-100)
- `umbral_similitud` (0-100)

---

## Diseño técnico

### Backend
- Agregar modelo `Configuracion` en `models.py`.
- Crear migración `0004_configuracion.py`.
- Agregar helpers de serialización/validación en `views.py`.
- Exponer endpoint `configuracion` con patrón:
  - GET: `get_or_create(pk=1)` y serializa.
  - PATCH: validación por campo + actualización parcial.
- Registrar ruta en `urls.py`.

### Frontend
- Agregar en servicio:
  - `getConfiguracion()`
  - `updateConfiguracion(payload)`
- Reescribir `Settings.tsx` para:
  - cargar configuración al montar,
  - editar por sección con estado controlado,
  - guardar en PATCH con mensajes de éxito/error y errores por campo,
  - preservar el panel ETL actual.

---

## Archivos a modificar

| Archivo | Cambios |
|---|---|
| `serviparamo/backend/serviparamo/models.py` | Nuevo modelo `Configuracion` |
| `serviparamo/backend/serviparamo/migrations/0004_configuracion.py` | Migración del modelo |
| `serviparamo/backend/serviparamo/views.py` | Endpoint `configuracion` + validaciones |
| `serviparamo/backend/serviparamo/urls.py` | Ruta `configuracion/` |
| `serviparamo/frontend/src/services/serviparamoService.js` | GET/PATCH configuración |
| `serviparamo/frontend/src/pages/Settings.tsx` | Formularios controlados y persistencia |

---

## Validaciones planificadas

- GET `configuracion/` retorna defaults si DB está vacía.
- PATCH parcial actualiza solo campos enviados.
- Validaciones de rango y formato retornan `400` con `fields`.
- Build frontend compila sin errores tras refactor de `Settings.tsx`.

## Criterios de aceptación

- Las tres secciones de 2.8 están definidas explícitamente en UI/API.
- Existe persistencia real de configuración (no placeholders estáticos).
- La estructura del módulo es clara y consistente para mantenimiento futuro.
