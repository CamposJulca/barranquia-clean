# Documentación del módulo JOZ

Estructura de esta carpeta tras la consolidación del Bloque I (2026-05-12):

## Doc canónico

- **No vive aquí.** El doc técnico y funcional canónico de JOZ es `correcciones/DOCUMENTO_TECNICO_FUNCIONAL_JOZ.md` (actualmente v2.1). Cualquier cifra ejecutiva, fórmula de riesgo, lista de reglas o KPI del dashboard se refiere ahí.

## Doc complementaria viva (esta carpeta)

| Archivo | Rol |
|---|---|
| `BASE_DE_DATOS.md` | Esquema de la BD y descripción de la fuente SuperEfectivo. |
| `DOCUMENTO_FUNCIONAL.md` | Doc funcional v1.0 BarranquIA (abril 2026). Predecesor de v2.x. |
| `PLAN_DE_TRABAJO.md` | Plan original con pendientes del cliente y criterios de aceptación. |
| `JOZ_GUIA_CLIENTE.md` | Guía orientada al cliente final ("¿qué es JOZ Monitoring?"). |
| `PREGUNTAS_FRECUENTES_CLIENTE.md` | FAQ para demos, reuniones de seguimiento y auditorías. |
| `MODULO_*.md` | **Anexos granulares de §8 del doc canónico** — un archivo por ruta del frontend (`/alerts`, `/dashboard`, `/etl`, `/history`, `/home`, `/ia`, `/risks`, `/settings`, `/sql`, `/store/:name`). Detalle de KPIs, comportamiento, queries, restricciones. |

## Insumos del cliente (binarios)

- `Documento_SitioWebApiIA.pdf` — especificación del API de SuperEfectivo.
- `JOZ Superefectivo.xlsx` — workbook de mapeos.
- `Workbook diagnóstico - IA aplicada (JOZ).docx` — diagnóstico de IA.
- 4 PDFs de "Notas de Gemini" — registros de reuniones discovery y levantamiento (dic 2025, feb 2026).

## Sesiones

`sesiones/YYYY-MM-DD/` contiene artefactos de sesiones puntuales con el cliente o internas. Ver `sesiones/README.md`.

## Otra documentación operativa

- `docs/DESPLIEGUE_LOCAL.md` (raíz del repo) — guía de despliegue local para todos los módulos (JOZ + ServiPáramo + Avantika).
- `correcciones/reportes/` — historial de intervenciones puntuales por bloques (A–H, etc.).
