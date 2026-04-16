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
- [ ] Corregir lógica de filtrado:
  - [ ] Revisar filtro por nivel (especialmente nivel “Alto”).
  - [ ] Revisar filtro por almacén.
  - [ ] Revisar bindings de filtros en frontend/backend.
- [ ] Corregir funcionalidad del buscador.
- [ ] No implementar descripciones ni ayudas visuales relacionadas con tipos de anomalía dentro del sistema.
- [ ] Asegurar que el sistema solo muestre el tipo de anomalía como etiqueta, alineado con el documento externo.

### 1.4 Módulo: Riesgos
- [ ] Crear una vista de detalle para cada riesgo.
- [ ] Incluir en la vista de detalle:
  - [ ] Motivo del riesgo.
  - [ ] Datos asociados.
  - [ ] Contexto de la anomalía.
- [ ] Evaluar implementación de detalle mediante modal, vista expandible o navegación a detalle.

### 1.5 Módulo: Historial
- [ ] Revisar la lógica implementada del historial.
- [ ] Validar la lógica contra los criterios acordados con el cliente.
- [ ] Ajustar reglas de registro en historial.
- [ ] Ajustar la validación de datos de prueba vs datos reales.

### 1.6 Módulo: ETL
- [ ] Ninguna acción requerida.

### 1.7 Módulo: Configuraciones
- [ ] Definir alcance funcional de cada sección:
  - [ ] Usuarios: gestión de accesos.
  - [ ] Detección: configuración de reglas/anomalías.
  - [ ] Notificación: canales y alertas.
  - [ ] Sistema: parámetros generales.
- [ ] Implementar o deshabilitar temporalmente las opciones sin funcionalidad.
- [ ] Evitar mostrar features incompletas al usuario final.

## 2. Proyecto Servipáramo

### 2.1 Módulo: Página principal
- [ ] Ninguna acción requerida.

### 2.2 Módulo: Catálogo
- [ ] Ninguna acción requerida.

### 2.3 Módulo: Duplicados
- [ ] Corregir la validación del estado del ETL.
- [ ] Revisar flags de ejecución.
- [ ] Revisar estado en backend.
- [ ] Revisar mensajes mostrados en frontend.
- [ ] Asegurar consistencia entre el estado real del ETL y el mensaje mostrado.

### 2.4 Módulo: Monitoreo ELT
- [ ] Validar el funcionamiento general del módulo.
- [ ] Confirmar que no se requieren cambios adicionales.

### 2.5 Módulo: Analítica
- [ ] Ninguna acción requerida.

### 2.6 Módulo: Búsqueda Semántica
- [ ] Validar ejecución del ETL.
- [ ] Revisar indexación de datos.
- [ ] Revisar conexión con el motor semántico.
- [ ] Confirmar disponibilidad de datos para búsqueda.

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
- [ ] Corrección de filtros y buscador en Alertas.
- [ ] Validación de lógica de negocio en Historial.
- [ ] Sincronización de estado ETL en Servipáramo (Duplicados).

### Prioridad Media
- [ ] Implementación de vistas de detalle en Riesgos.
- [ ] Ajustes en Búsqueda Semántica.

### Prioridad Baja
- [ ] Definición funcional de módulos de Configuración (JOZ y Servipáramo).
- [ ] Mejoras estructurales futuras.

> **Nota:** Validar cada ajuste con el cliente antes de despliegue a producción.
