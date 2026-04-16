# Checklist de Ajustes del Cliente

Documento extraído de: `docs/Ajustes/Documento Observaciones Joz Y Servipáramo.pdf`

## 1. Proyecto JOZ

### 1.1 Ajuste Global (Todos los módulos)
- [x] Ajustar la paleta de colores para mejorar la legibilidad.
- [x] Definir colores de texto claros (blanco o tonos claros).
- [x] Validar contraste según buenas prácticas de UI/UX.
- [x] Aplicar cambios de forma consistente en todos los módulos:
  - [x] Dashboard
  - [x] Alertas
  - [x] Riesgos
  - [x] Historial
  - [x] Monitoreo externo
- [x] Mover el logo a la parte superior izquierda en la rama frontend.
- [ ] Revisar la lógica de login para cada proyecto.

### 1.2 Módulo: Dashboard
- [x] Ajustar contraste y estilos visuales en la vista de detalle por almacén.
- [x] Validar correcta visualización de datos según requerimiento del cliente.

### 1.3 Módulo: Alertas
- [x] Corregir lógica de filtrado:
  - [x] Revisar filtro por nivel (especialmente nivel “Alto”).
  - [x] Revisar filtro por almacén.
  - [x] Revisar bindings de filtros en frontend/backend.
- [x] Corregir funcionalidad del buscador.
- [x] No implementar descripciones ni ayudas visuales relacionadas con tipos de anomalía dentro del sistema.
- [x] Asegurar que el sistema solo muestre el tipo de anomalía como etiqueta, alineado con el documento externo.

### 1.4 Módulo: Riesgos
- [x] Crear una vista de detalle para cada riesgo.
- [x] Incluir en la vista de detalle:
  - [x] Motivo del riesgo.
  - [x] Datos asociados.
  - [x] Contexto de la anomalía.
- [x] Evaluar implementación de detalle mediante modal, vista expandible o navegación a detalle.

### 1.5 Módulo: Historial
- [x] Revisar la lógica implementada del historial.
- [x] Validar la lógica contra los criterios acordados con el cliente.
- [x] Ajustar reglas de registro en historial.
- [x] Ajustar la validación de datos de prueba vs datos reales.
- [x] Implementar filtro de origen (`Todos / Solo reales / Solo prueba`) en frontend y backend.
- [x] Implementar debounce del buscador (`300ms`) para evitar saturación del backend.
- [x] Implementar paginación (`count/page/page_size`) y estados UX (`loading/error/vacío`).

### 1.6 Módulo: ETL
- [ ] Ninguna acción requerida.

### 1.7 Módulo: Configuraciones
- [x] Definir alcance funcional de cada sección:
  - [x] Usuarios: gestión de accesos (gestionado por Hub; sección deshabilitada en JOZ).
  - [x] Detección: configuración de reglas/anomalías (implementado con persistencia GET/PATCH).
  - [x] Notificación: canales y alertas (sección deshabilitada temporalmente).
  - [x] Sistema: parámetros generales (sección deshabilitada temporalmente).
- [x] Implementar o deshabilitar temporalmente las opciones sin funcionalidad.
- [x] Evitar mostrar features incompletas al usuario final.

## 2. Proyecto Servipáramo

### 2.1 Módulo: Página principal
- [ ] Ninguna acción requerida.

### 2.2 Módulo: Catálogo
- [ ] Ninguna acción requerida.

### 2.3 Módulo: Duplicados
- [x] Corregir la validación del estado del ETL.
- [x] Revisar flags de ejecución.
- [x] Revisar estado en backend.
- [x] Revisar mensajes mostrados en frontend.
- [x] Asegurar consistencia entre el estado real del ETL y el mensaje mostrado.

### 2.4 Módulo: Monitoreo ELT
- [x] Validar el funcionamiento general del módulo.
- [x] Confirmar que no se requieren cambios adicionales.

### 2.5 Módulo: Analítica
- [ ] Ninguna acción requerida.

### 2.6 Módulo: Búsqueda Semántica
- [x] Validar ejecución del ETL.
- [x] Revisar indexación de datos.
- [x] Revisar conexión con el motor semántico.
- [x] Confirmar disponibilidad de datos para búsqueda.

### 2.7 Módulo: Consola SQL
- [ ] Ninguna acción requerida.

### 2.8 Módulo: Configuraciones
- [ ] Definir qué información y opciones estarán disponibles:
  - [ ] Parámetros del sistema.
  - [ ] Configuración de ETL.
  - [ ] Preferencias de usuario.
- [ ] Diseñar estructura clara antes de implementación.

## 3. Conclusión General

### Prioridad Alta
- [ ] Corrección de visibilidad en JOZ (todos los módulos).
- [x] Corrección de filtros y buscador en Alertas.
- [x] Validación de lógica de negocio en Historial.
- [x] Sincronización de estado ETL en Servipáramo (Duplicados).

### Prioridad Media
- [x] Implementación de vistas de detalle en Riesgos.
- [x] Ajustes en Búsqueda Semántica.

### Prioridad Baja
- [x] Definición funcional de módulo de Configuración en JOZ.
- [ ] Definición funcional de módulo de Configuración en Servipáramo.
- [ ] Mejoras estructurales futuras.

> **Nota:** Validar cada ajuste con el cliente antes de despliegue a producción.
