# Documentación de la rama `Joz/1-3-modulo-alertas`

## Objetivo de la rama
Implementar las correcciones funcionales del módulo Alertas en JOZ:
- filtros por nivel y almacén.
- buscador.
- normalización de visualización del tipo de anomalía (solo etiqueta).

## Estado actual
Planificada. Sin implementación de código en esta entrega (solo documentación).

## Branch de trabajo
- `Joz/1-3-modulo-alertas`

## Ramas sugeridas por bloque (opcional)
- `Joz/1-3-alertas-filtros`
- `Joz/1-3-alertas-buscador`
- `Joz/1-3-alertas-etiqueta-anomalia`

## Alcance funcional en esta rama
- Corregir lógica de filtrado:
  - nivel de riesgo (incluyendo el caso "Alto")
  - almacén
  - bindings frontend/backend
- Corregir funcionalidad del buscador.
- Alinear UI para no mostrar descripciones ni ayudas visuales de tipo de anomalía.
- Mostrar solo el tipo de anomalía como etiqueta.

## Archivos candidatos a intervención
- `joz/frontend/src/pages/Alerts.tsx`
- `joz/frontend/src/components/AlertsTable.tsx`
- `joz/frontend/src/services/api.js`
- `joz/backend/joz/views.py`
- `joz/backend/joz/urls.py` (si se requiere ajuste de routing/parámetros)

## Riesgos técnicos identificados
- Desalineación de parámetros entre frontend y backend para filtros.
- Mapeo de severidad/nivel de riesgo que puede afectar especialmente el filtro "Alto".
- Filtro por almacén y búsqueda no implementados de extremo a extremo en endpoint de alertas.

## Validaciones esperadas al cierre
- Filtros por nivel y almacén funcionando de manera independiente y combinada.
- Buscador funcional con resultados coherentes.
- UI de Alertas mostrando únicamente etiqueta de tipo de anomalía.
- Confirmación funcional contra el documento externo del cliente.

## Entregables de documentación asociados
- `docs/Ajustes/checklist/plan_Joz_1-3_modulo_alertas.md`
- `docs/Ajustes/checklist/branch_Joz_1-3-modulo-alertas.md`
