# Documentación de la rama `Joz/1-2-modulo-dashboard`

## Objetivo de la rama
Implementar los ajustes de contraste y estilos visuales en la vista de detalle por almacén del módulo Dashboard del proyecto JOZ, garantizando una visualización más clara y accesible de los datos.

## Branch de trabajo
- `Joz/1-2-modulo-dashboard`

## Archivos modificados
- `joz/frontend/src/pages/StoreDetail.tsx`
- `joz/frontend/src/components/StatCard.tsx`

## Cambios realizados
- Se actualizó la vista de detalle por almacén para usar un fondo oscuro más consistente con el nuevo tema global.
- Se mejoró la estructura visual de la cabecera del detalle, agregando un subtítulo y un mayor contraste en el nombre del almacén.
- Se adaptaron los componentes `StatCard` para usar un estilo oscuro con texto claro y mejor contraste de iconos.
- Se agregó un resumen de registros y una tarjeta de detalle con bordes definidos en la vista de almacén.
- Se mejoró el estilo de la tabla:
  - cabecera con fondo oscuro y texto claro.
  - filas con hover y separación clara.
  - valores numéricos de entrada y salida con colores diferenciados.
  - mensaje de estado cuando no hay registros.
- Se ajustaron los badges de tipo de operación para que tengan mejor contraste sobre el fondo oscuro.

## Validaciones realizadas
- Se revisó la legibilidad de los textos en la tabla y la cabecera.
- Se garantizó que los totales y métricas sean visibles en la vista de detalle.
- Se mantuvo la consistencia visual con los estilos introducidos en la rama global JOZ.

## Estado final
Implementación completa. Pendiente commit y PR hacia `main`.

## Correcciones adicionales aplicadas
- `StatCard.tsx`: `iconColor` por defecto cambiado de `text-blue-600` a `text-blue-400` para mejor contraste sobre fondo `bg-slate-900`.

## Notas
- Los estilos del Dashboard principal (`Dashboard.tsx`) que aún usan clases `text-gray-*` se resuelven al integrar la rama `Joz/1-1-ajustes-globales`.
- No se requieren cambios adicionales en esta rama.
