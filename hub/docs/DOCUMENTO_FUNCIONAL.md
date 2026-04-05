# Documento Funcional — BarranquIA Hub

**Versión:** 3.0
**Fecha:** 2026-04-05
**Estado:** Arquitectura multi-microservicio operativa

---

## 1. Visión del Producto

BarranquIA Hub es una plataforma centralizada de servicios de inteligencia artificial para empresas en Barranquilla, Colombia, desarrollada bajo el programa **Ruta IA** de la Cámara de Comercio de Barranquilla en alianza con Boost Business Consulting.

Su propósito es unificar bajo una sola interfaz múltiples módulos de negocio potenciados por inteligencia artificial, reduciendo la fricción operativa y ofreciendo una experiencia de usuario coherente. Cada empresa o área de negocio accede a su módulo especializado desde un único punto de entrada autenticado.

**Objetivo principal:** Proveer acceso ágil y seguro a herramientas de IA aplicadas (normalización de catálogos, pronóstico de demanda, detección de alertas, business intelligence) desde un portal unificado, sin necesidad de gestionar credenciales separadas para cada herramienta.

---

## 2. Actores del Sistema

| Actor | Descripción |
|-------|-------------|
| **Usuario operativo** | Empleado de empresa cliente que accede a los módulos del hub para consultar información o ejecutar operaciones |
| **Administrador** | Gestiona usuarios en el panel Django Admin, configura servicios activos y accede a datos de auditoría |
| **Sistema ERP externo** | SQL Server de ServiPáramo (`ts1.serviparamo.com.co`) — fuente de datos para el ETL de catálogo |

---

## 3. Módulos del Sistema

### 3.1 Hub Central

El hub es el portal de entrada a la plataforma. Gestiona la identidad del usuario y presenta el catálogo de módulos disponibles.

**Funcionalidades:**
- Autenticación de usuarios con token de sesión
- Listado visual de módulos activos (tarjetas interactivas con ícono, nombre y descripción)
- Indicador de estado del sistema en tiempo real (health check)
- Acceso directo a cada módulo con un clic
- Cierre de sesión global que invalida el token en el servidor

**Acceso:** `https://barranquia-hub.ngrok.io`
**Admin Django:** `https://barranquia-hub.ngrok.io/admin/`

---

### 3.2 ServiPáramo — Normalización Inteligente de Catálogo SKU

Módulo de gestión e inteligencia para el catálogo de productos de ServiPáramo. Conecta con el ERP SQL Server de la empresa para extraer, normalizar y enriquecer semánticamente el catálogo de SKUs mediante modelos de lenguaje.

**Acceso:** `https://barranquia-hub.ngrok.io/serviparamo/`

#### Dashboard
Panel ejecutivo con indicadores clave del catálogo:
- Total de SKUs procesados
- SKUs normalizados vs. pendientes
- Total de familias y categorías detectadas
- Grupos de duplicados identificados

#### Gestión de Catálogo
Exploración y administración del catálogo procesado:
- Tabla paginada de SKUs con búsqueda por código, descripción, familia y categoría
- Detalle de cada SKU: código, descripción original, descripción normalizada, familia, categoría
- Filtros por familia y categoría
- Acciones de aprobación de SKUs maestros

#### Detección de Duplicados
Identificación automática de productos duplicados o redundantes:
- Grupos de SKUs similares detectados por similitud semántica (coseno > umbral)
- Vista comparativa de SKUs duplicados con sus similitudes
- Acciones: aprobar SKU maestro, descartar duplicados, fusionar familias

#### Normalización Semántica
Estandarización del catálogo usando embeddings de NLP:
- Vista de SKUs pendientes de normalización
- Propuesta de descripción normalizada generada por el modelo
- Aprobación o corrección manual por el operador

#### Búsqueda Semántica
Búsqueda por significado, no solo por texto exacto:
- Caja de búsqueda con lenguaje natural (ej. "aceite para motor diesel")
- Resultados ordenados por relevancia semántica
- Muestra código, descripción y similitud de cada resultado

#### Analytics de Compras
Análisis de órdenes de compra y pedidos extraídos del ERP:
- Gráficos de volumen de órdenes por período
- Distribución de compras por familia y categoría
- Histórico de movimientos de inventario (kardex)

#### Configuración y ETL
Control del proceso de sincronización con el ERP:
- Estado del último ETL ejecutado (fecha, registros procesados, errores)
- Botón para disparar ETL manualmente
- Log de ejecuciones anteriores

---

### 3.3 Avantika — Gestión de Inventario y Pronóstico de Demanda

Módulo orientado a empresas distribuidoras (sector automotriz como caso de uso inicial). Proporciona visibilidad del inventario y proyecciones de demanda usando modelos estadísticos de Machine Learning.

**Acceso:** `https://barranquia-hub.ngrok.io/avantika/`

#### Vista General (Dashboard)
Panel ejecutivo con indicadores clave de desempeño:
- Total de SKUs gestionados
- SKUs en situación crítica (stock ≤ 50% del nivel de reorden)
- SKUs con stock bajo (stock ≤ nivel de reorden)
- Valor total del inventario en COP
- Gráfico de pronóstico de demanda (horizonte 14 días)
- Tabla de inventario resumida con estado por producto
- Panel de alertas activas
- Distribución de SKUs por clasificación ABC

#### Gestión de SKUs
Catálogo completo del inventario:
- Tabla filtrable con columnas: Código, Nombre, Categoría, Stock actual, Estado, Precio unitario (COP), Demanda promedio, Proveedor
- Semáforo visual de estado de stock:
  - **Crítico (rojo):** stock ≤ 50% del nivel de reorden
  - **Bajo (amarillo):** stock ≤ nivel de reorden
  - **Normal (verde):** stock > nivel de reorden
- Clasificación ABC:
  - **A:** SKUs de alta rotación (20% de productos, 80% de movimiento)
  - **B:** SKUs de rotación media
  - **C:** SKUs de baja rotación

**Categorías de productos soportadas:**
- Lubricantes (aceites de motor), Filtros (aire, aceite)
- Baterías, Frenos (pastillas, discos)
- Neumáticos, Fluidos (refrigerante, transmisión)
- Suspensión (amortiguadores), Encendido (bujías)

#### Pronóstico de Demanda
Módulo predictivo con horizonte de 14 días:
- Métricas del modelo activo: Precisión, Período de predicción, Tendencia, Volatilidad
- Gráfico de área con demanda histórica y proyectada con bandas de confianza
- Métricas de calidad del modelo: MAE, RMSE, R²
- Sugerencias de reposición generadas automáticamente

---

### 3.4 Joz — Análisis de Anomalías, Alertas y Riesgos

Módulo dedicado a la detección de irregularidades en transacciones, gestión de alertas operativas y análisis de riesgos del negocio.

**Acceso:** `https://barranquia-hub.ngrok.io/joz/`

#### Dashboard
Panel de control con indicadores de riesgo:
- Total de alertas activas con distribución por severidad
- Total de transacciones en el período
- Riesgos identificados (activos y resueltos)
- Gráfico de anomalías detectadas por día (últimos 30 días)

#### Centro de Alertas
Gestión del flujo de alertas operativas:
- Listado paginado de alertas con filtros por severidad y estado
- Niveles de severidad: `baja`, `media`, `alta`, `crítica`
- Estados de alerta: `pendiente`, `en revisión`, `resuelta`
- Acción: marcar alerta como revisada o resuelta

#### Análisis de Riesgos
Visibilidad sobre riesgos operativos identificados:
- Listado de riesgos con nivel, descripción y estado
- Trazabilidad entre riesgos y alertas generadas

#### Historial de Transacciones
Auditoría del flujo de transacciones analizadas:
- Tabla filtrable de transacciones con monto, tipo y fecha
- Indicador de transacciones marcadas como anómalas
- Exportación del historial

---

## 4. Flujos de Usuario

### 4.1 Inicio de sesión

```
1. Usuario navega a https://barranquia-hub.ngrok.io
2. Sistema muestra formulario de login
3. Usuario ingresa usuario y contraseña
4. Sistema valida credenciales contra la base de datos
   ├── Válidas  → genera token DRF, redirige al panel de servicios
   └── Inválidas → muestra mensaje de error, permite reintentar
5. Token se almacena en localStorage del navegador
```

### 4.2 Acceso a un módulo

```
1. Usuario autenticado visualiza tarjetas de módulos en el Hub
2. Hace clic en un módulo (ej. ServiPáramo)
3. Nginx enruta la petición al frontend correspondiente
4. El módulo carga y verifica el token con el Hub
   ├── Token válido  → renderiza la aplicación completa
   └── Token inválido → redirige al login del Hub
```

### 4.3 Ejecutar ETL en ServiPáramo

```
1. Usuario accede a /serviparamo/settings
2. Visualiza estado del último ETL (fecha, registros, errores)
3. Hace clic en "Ejecutar ETL"
4. Sistema lanza el proceso en un hilo separado (no bloquea la interfaz)
5. El estado se actualiza: "en ejecución" → "completado" / "con errores"
6. Log de ejecución disponible para auditoría
```

### 4.4 Gestionar una alerta en Joz

```
1. Usuario accede a /joz/alerts
2. Visualiza listado filtrado de alertas (por severidad, estado)
3. Selecciona una alerta para revisarla
4. Sistema muestra detalle: descripción, severidad, fecha, transacción relacionada
5. Usuario cambia el estado: pendiente → en revisión → resuelta
6. Cambio se persiste y la alerta desaparece del panel activo
```

### 4.5 Cierre de sesión

```
1. Usuario hace clic en "Cerrar sesión" en cualquier módulo o en el Hub
2. Se invoca POST /api/logout/ con el token actual
3. Token invalidado en el servidor (eliminado de authtoken_token)
4. Token borrado del localStorage del navegador
5. Usuario redirigido al formulario de login del Hub
```

---

## 5. Reglas de Negocio

### 5.1 Gestión de sesión
- El token de sesión se almacena en `localStorage` del navegador
- Todos los módulos verifican el token contra el Hub antes de renderizarse
- Si el token no existe o es inválido, se redirige automáticamente al login del Hub
- El logout invalida el token en servidor; no es posible reutilizar un token cerrado

### 5.2 Visibilidad de módulos
- Solo se muestran en el panel los módulos marcados como `active: true` en el Hub backend
- Los módulos inactivos no aparecen en el portal aunque sus URLs existan

### 5.3 Clasificación de inventario (Avantika)
- **Crítico:** stock ≤ 50% del nivel de reorden → requiere acción inmediata
- **Bajo:** stock ≤ nivel de reorden → requiere reposición próxima
- **Normal:** stock > nivel de reorden → sin acción requerida
- La clasificación ABC se recalcula periódicamente según frecuencia de movimiento

### 5.4 Pronóstico de demanda (Avantika)
- El modelo genera proyecciones para los próximos 14 días
- Cada predicción incluye límite superior e inferior (intervalo de confianza)
- Los últimos 5 días históricos se muestran junto a las predicciones para contexto visual
- El modelo se evalúa con MAE, RMSE y R²; precisión objetivo > 90%

### 5.5 Niveles de alerta (Joz)
- `baja` — anomalía menor, sin impacto operativo inmediato
- `media` — anomalía moderada, revisión requerida en 48h
- `alta` — anomalía significativa, revisión requerida en 24h
- `crítica` — anomalía grave, acción inmediata requerida

### 5.6 ETL ServiPáramo
- El ETL extrae datos del ERP SQL Server en la base `PRUEBA` (tablas de inventario, órdenes, pedidos, presupuestos)
- Se ejecuta en hilo separado para no bloquear la API
- Los datos aprobados por el operador (SKUs maestros) se preservan entre ejecuciones
- Cada ejecución genera un registro en `ETLLog` con fecha, estado y métricas

---

## 6. Pantallas y Componentes UI

### Hub
- **Login:** Logo, campo usuario, campo contraseña, botón de ingreso con estado de carga, mensaje de error
- **Panel de servicios:** Grid de tarjetas (ícono, nombre, descripción, estado), encabezado con nombre de usuario, botón de logout, indicador de conectividad

### ServiPáramo
- Layout con sidebar de 7 secciones + encabezado con breadcrumb y perfil
- Dashboard con tarjetas KPI y métricas del catálogo
- Tabla de catálogo con búsqueda, filtros y paginación
- Vista comparativa de duplicados
- Panel de normalización con aprobación manual
- Buscador semántico con resultados rankeados
- Gráficos de analytics de compras (Recharts)
- Configuración ETL con botón de ejecución y log

### Avantika
- Layout con sidebar de 3 secciones (Vista General, SKUs, Forecast) + header
- Dashboard con 4 KPIs en tarjetas, gráfico de pronóstico, tabla de inventario, panel de alertas, barras de categoría
- Tabla de SKUs con búsqueda, filtro y semáforo de estado
- Forecast con métricas del modelo, gráfico de área con bandas de confianza, tabla de métricas técnicas

### Joz
- Layout con sidebar de 4 secciones (Dashboard, Alertas, Riesgos, Historial) + header
- Dashboard con KPIs, gráfico de anomalías por día (Recharts)
- Centro de alertas con filtros por severidad y estado, acciones de actualización
- Tabla de riesgos con nivel e impacto
- Historial de transacciones con indicadores de anomalías

---

## 7. Casos de Uso Detallados

### CU-01: Autenticar Usuario
- **Actor:** Usuario operativo
- **Precondición:** El Hub está activo y accesible
- **Flujo principal:**
  1. Usuario abre `https://barranquia-hub.ngrok.io`
  2. Ingresa usuario y contraseña
  3. Sistema valida y devuelve token DRF
  4. Usuario accede al panel de módulos
- **Flujo alternativo:** Credenciales incorrectas → mensaje de error, sin acceso
- **Postcondición:** Token válido almacenado en localStorage

### CU-02: Sincronizar catálogo con ERP (ServiPáramo)
- **Actor:** Usuario operativo (con acceso a ServiPáramo)
- **Precondición:** Sesión activa, ERP SQL Server accesible
- **Flujo principal:**
  1. Usuario navega a `/serviparamo/settings`
  2. Visualiza estado del último ETL
  3. Hace clic en "Ejecutar ETL"
  4. Sistema extrae datos del ERP en background
  5. Genera embeddings semánticos para nuevos SKUs
  6. Detecta duplicados automáticamente
  7. Log disponible con resumen del proceso
- **Flujo alternativo:** ERP no disponible → error registrado en ETLLog, datos anteriores intactos

### CU-03: Detectar y gestionar duplicados (ServiPáramo)
- **Actor:** Usuario operativo
- **Precondición:** ETL ejecutado, duplicados detectados
- **Flujo principal:**
  1. Usuario navega a `/serviparamo/duplicates`
  2. Visualiza grupos de SKUs similares
  3. Compara descripciones y datos de cada candidato
  4. Aprueba el SKU maestro del grupo
  5. Los demás son marcados como duplicados confirmados

### CU-04: Consultar pronóstico de demanda (Avantika)
- **Actor:** Usuario operativo
- **Precondición:** Sesión activa, datos de inventario disponibles
- **Flujo principal:**
  1. Usuario navega a `/avantika/forecast`
  2. Sistema muestra métricas del modelo y gráfico con bandas de confianza
  3. Usuario lee proyecciones para los próximos 14 días
  4. Interpreta la tendencia y decide sobre reposición

### CU-05: Gestionar alertas activas (Joz)
- **Actor:** Usuario operativo
- **Precondición:** Sesión activa, alertas disponibles
- **Flujo principal:**
  1. Usuario navega a `/joz/alerts`
  2. Filtra alertas por severidad `alta` o `crítica`
  3. Abre detalle de una alerta
  4. Marca como "en revisión" mientras investiga
  5. Marca como "resuelta" tras tomar acción

### CU-06: Cerrar sesión
- **Actor:** Usuario operativo
- **Precondición:** Sesión activa
- **Flujo principal:**
  1. Usuario hace clic en "Cerrar sesión"
  2. Token invalidado en servidor
  3. localStorage limpiado
  4. Redirección al login del Hub

---

## 8. Requerimientos No Funcionales

| Requerimiento | Descripción |
|---------------|-------------|
| **Disponibilidad** | Docker con `restart: unless-stopped` garantiza recuperación automática |
| **Seguridad** | Autenticación por token en todos los endpoints protegidos; HTTPS vía ngrok |
| **Idioma** | Español colombiano (`es-CO`), moneda en COP |
| **Rendimiento** | Gunicorn con 3 workers por servicio; timeout 120s |
| **Aislamiento** | Cada microservicio tiene su propia base de datos y proceso |
| **Trazabilidad** | Tokens rastreables por usuario; ETLLog con historial de ejecuciones |
| **Escalabilidad** | Arquitectura modular; nuevos módulos se agregan como contenedores independientes |
| **Accesibilidad** | Interfaces web responsivas; compatibles con navegadores modernos |

---

## 9. Integraciones Externas

| Sistema | Protocolo | Propósito |
|---------|-----------|-----------|
| ERP SQL Server ServiPáramo | pyodbc / ODBC | Fuente de datos de inventario, órdenes, pedidos, presupuestos |
| ngrok | HTTPS tunnel | Acceso público seguro desde internet |
| HuggingFace (local) | sentence-transformers | Modelo NLP `all-MiniLM-L6-v2` para embeddings semánticos |

---

## 10. Roadmap Funcional

### Fase 1 — Completado
- [x] Hub con autenticación y panel de módulos
- [x] ServiPáramo: ETL SQL Server, normalización semántica, detección de duplicados, búsqueda semántica
- [x] Avantika: inventario de SKUs, clasificación ABC, pronóstico de demanda
- [x] Joz: detección de anomalías, gestión de alertas y riesgos
- [x] Arquitectura multi-microservicio con Docker Compose (8 contenedores)

### Fase 2 — En desarrollo
- [ ] ETL incremental ServiPáramo con preservación de aprobados
- [ ] Completar frontends de Avantika y Joz (integraciones cruzadas)
- [ ] ETL programado con cron o Celery Beat
- [ ] Roles y permisos de usuario por módulo

### Fase 3 — Planificado
- [ ] pgvector + índice HNSW para búsqueda semántica O(log N)
- [ ] Notificaciones en tiempo real (WebSocket o polling)
- [ ] Panel de administración de módulos desde el Hub
- [ ] Documentación API con Swagger/OpenAPI
- [ ] CI/CD con GitHub Actions

---

*BarranquIA Hub — Ruta IA × Cámara de Comercio de Barranquilla × Boost Business Consulting*
*Última actualización: 5 de abril de 2026*
