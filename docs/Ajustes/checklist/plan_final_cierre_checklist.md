# Plan Final de Cierre - Checklist Cliente

## Objetivo
Cerrar los pendientes restantes del checklist general con una última pasada de validación funcional/documental y dejar explícito qué queda como mejora futura no bloqueante.

## Pendientes detectados (`[ ]`)

### Pendientes funcionales
- `1.1` Revisar la lógica de login para cada proyecto.
- `3. Prioridad Alta` Corrección de visibilidad en JOZ (todos los módulos).

### Pendientes de validación "Ninguna acción requerida"
- `1.6` Módulo ETL.
- `2.1` Módulo Página principal.
- `2.2` Módulo Catálogo.
- `2.5` Módulo Analítica.
- `2.7` Módulo Consola SQL.

### Pendiente de backlog (no bloqueante)
- `3. Prioridad Baja` Mejoras estructurales futuras.

---

## Estrategia de cierre

### Fase 1 - Validación rápida de módulos sin cambios
- Ejecutar smoke test funcional en `1.6`, `2.1`, `2.2`, `2.5`, `2.7`.
- Verificar que no hay regresiones ni requerimientos nuevos.
- Marcar esos ítems como `[x]` en `ajustes_cliente.md` si pasan.

### Fase 2 - Cierre de login por proyecto
- Revisar flujos de autenticación en JOZ y Servipáramo:
  - login exitoso,
  - sesión expirada/no autorizado,
  - redirección y manejo de error.
- Si hay gap, aplicar fix mínimo; si no hay gap, documentar evidencia y marcar `[x]`.

### Fase 3 - Cierre de visibilidad JOZ
- Validar contraste/legibilidad en Dashboard, Alertas, Riesgos, Historial y Monitoreo externo.
- Si todo está correcto, marcar `Prioridad Alta -> Corrección de visibilidad en JOZ` en `[x]`.
- Si persiste un detalle visual, aplicar patch puntual y volver a validar.

### Fase 4 - Cierre documental final
- Actualizar `docs/Ajustes/checklist/ajustes_cliente.md`.
- Dejar `Mejoras estructurales futuras` como pendiente planificado (backlog) o moverlo a sección de roadmap.

---

## Archivos objetivo de cierre
- `docs/Ajustes/checklist/ajustes_cliente.md`
- `docs/Ajustes/checklist/plan_final_cierre_checklist.md`
- (si hay fixes) archivos frontend/backend específicos que salgan de Fase 2/3

## Criterio de salida
- Todos los puntos operativos del checklist en `[x]`.
- Solo queda pendiente explícito de backlog (`Mejoras estructurales futuras`) o queda reclasificado fuera del cierre operativo.
