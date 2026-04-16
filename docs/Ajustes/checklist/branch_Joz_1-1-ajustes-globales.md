# Documentación de la rama `Joz/1-1-ajustes-globales`

## Objetivo de la rama
Aplicar los ajustes globales de UI/UX para el proyecto JOZ solicitados por el cliente:
- mejorar legibilidad y contraste general.
- normalizar paleta visual en todos los módulos.
- ubicar el logo en la parte superior izquierda del layout.
- revisar la lógica de login compartida por proyecto.

## Estado actual
Implementación completa. Pendiente commit y PR.

### Archivos modificados
- `joz/frontend/src/styles/globals.css`
- `joz/frontend/src/layouts/DashboardLayout.jsx`
- `joz/frontend/src/layouts/Header.jsx` (nuevo)
- `joz/frontend/src/layouts/Sidebar.tsx`
- `joz/frontend/src/pages/Dashboard.tsx`
- `joz/frontend/src/pages/Alerts.tsx`
- `joz/frontend/src/pages/Risks.tsx`
- `joz/frontend/src/pages/History.tsx`
- `joz/frontend/src/pages/ETLMonitor.tsx`
- `joz/frontend/src/router/router.jsx`
- `joz/frontend/src/services/api.js`

## Cambios realizados
- Variables CSS globales en `globals.css`: tema oscuro `slate` con acento `amber`.
- `DashboardLayout`: fondo `bg-slate-950 text-slate-100`.
- `Sidebar`: reemplazado fondo café `[#1f1a12]` por `slate-900`, logo JOZ circular en parte superior izquierda.
- `Header`: nuevo componente con logo JOZ en top-left y barra de búsqueda.
- `Dashboard`: tarjetas de almacenes con estilos `slate/amber`, navegación a detalle por almacén.
- `Alerts`: estilos `slate/amber`, estados de carga/error/vacío, auto-refresh 30s. **Corrección crítica: valores de filtro de riesgo alineados con el backend (`Alto`/`Medio`/`Bajo`).**
- `Risks`: badges de riesgo y tarjetas actualizados al tema oscuro, textos `text-gray-*` eliminados.
- `History`: badges de tipo de operación y tabla actualizados al tema oscuro.
- `router.jsx`: ruta `/etl` añadida, import de `ETLMonitor` corregido.
- `api.js`: uso de variables de entorno con fallback, timeout añadido.

## Pendiente (fuera del alcance de esta rama)
- Lógica de login: no se modificó. Requiere revisión específica en rama separada si hay inconsistencias.

## Notas
- Los cambios en `Alerts.tsx` corrigen parcialmente el bug de filtros (valores al backend). El resto del fix de filtros (1.3) se completa en la rama `Joz/1-3-modulo-alertas`.

## Recomendaciones para Claude
1. Revisar la rama `Joz/1-1-ajustes-globales` y verificar los cambios en los archivos listados.
2. Revisar todas las vistas de la aplicación JOZ usando la UI para confirmar contraste, legibilidad y consistencia del tema.
3. Asegurarse de que el logo se encuentre en la cabecera y no se muestre solo en el sidebar.
4. Si detectas otros elementos con colores directos o contrastes pobres, agrega esos ajustes en la misma rama o crea una rama complementaria específica.
5. Evitar tocar módulos fuera de JOZ en esta rama; el foco es UI/UX global y paleta de colores.

## Notas
- Actualmente hay otros cambios no relacionados en el árbol de trabajo del repositorio; esta documentación se centra exclusivamente en la rama de ajustes globales JOZ.
- Si se necesita un seguimiento de tareas más fino, esta rama puede separarse en ramas específicas adicionales como `Joz/1-2-modulo-dashboard`.
