# Plan de Implementación - Joz/1-1-ajustes-globales

## Objetivo
Implementar los ajustes globales de UI y UX reportados por el cliente en el proyecto JOZ, asegurando consistencia visual y legibilidad en todos los módulos.

## Alcance
- Ajuste de paleta de colores y contraste general.
- Definición de colores de texto claros.
- Validación de contraste según buenas prácticas de accesibilidad.
- Aplicación de los cambios de forma consistente en los módulos:
  - Dashboard
  - Alertas
  - Riesgos
  - Historial
  - Monitoreo externo
- Ajuste de la posición del logo en el layout frontend.
- Revisión de la lógica de login para cada proyecto.

## Branch de trabajo
- `Joz/1-1-ajustes-globales`

## Pasos de implementación

### 1. Análisis y diagnóstico
- [ ] Revisar los estilos actuales del proyecto JOZ.
- [ ] Identificar los tokens de color y variables CSS/SCSS existentes.
- [ ] Revisar el layout principal para la ubicación del logo.
- [ ] Identificar dónde se define la lógica de login del proyecto.

### 2. Ajuste de paleta y contraste
- [ ] Definir una paleta de colores base con contraste adecuado.
- [ ] Seleccionar colores de texto claros (blancos o tonos claros) para fondos oscuros.
- [ ] Actualizar variables globales de estilo o theme.
- [ ] Verificar que todos los textos, tarjetas y componentes tengan contraste suficiente.

### 3. Aplicación de cambios en módulos clave
- [ ] Dashboard
- [ ] Alertas
- [ ] Riesgos
- [ ] Historial
- [ ] Monitoreo externo

Para cada módulo:
- [ ] Revisar los componentes visuales más usados.
- [ ] Ajustar colores de fondo, texto y bordes.
- [ ] Revisar gráficos y tablas para asegurar legibilidad.
- [ ] Probar con datos reales o de ejemplo.

### 4. Ajuste del logo en frontend
- [ ] Mover el logo a la parte superior izquierda del layout general.
- [ ] Verificar presentación responsive en desktop y mobile.
- [ ] Confirmar que el cambio no rompe la navegación o el header.

### 5. Revisión de la lógica de login
- [ ] Revisar el código de login compartido entre proyectos.
- [ ] Confirmar que la lógica actual soporta cada proyecto de JOZ.
- [ ] Documentar cualquier cambio requerido si se detecta inconsistencia.

### 6. Pruebas y validación
- [ ] Validar contraste con herramientas de accesibilidad.
- [ ] Probar las vistas afectadas en los módulos listados.
- [ ] Revisar el logo y la cabecera en diferentes resoluciones.
- [ ] Ejecutar pruebas manuales de login si aplica.

## Criterios de aceptación
- Los colores y el contraste se ven consistentes en todos los módulos.
- El texto es claramente legible sobre sus fondos.
- El logo está en la parte superior izquierda del layout.
- La lógica de login no presenta errores específicos de proyecto.
- No hay regresiones visuales en las vistas actualizadas.

## Notas adicionales
- Si se detectan cambios mayores en un módulo específico, esos ajustes se mueven a su propia rama (por ejemplo `Joz/1-2-modulo-dashboard`).
- Mantener commits pequeños y enfocados, documentando el propósito de cada cambio.
- Coordinar con el diseño o con el cliente si hay dudas sobre la paleta final.
