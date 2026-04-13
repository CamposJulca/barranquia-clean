# Documento Funcional — BarranquIA Hub

**Versión:** 1.0  
**Fecha:** 2026-04-12  
**Proyecto:** BarranquIA Hub — Plataforma Centralizada de Servicios IA  
**Programa:** Ruta IA — Barranquilla, Colombia  

---

## 1. Propósito del Sistema

BarranquIA Hub es una plataforma que centraliza múltiples servicios de inteligencia artificial para empresas participantes del programa Ruta IA en Barranquilla. Cada empresa accede a un microservicio personalizado para su dominio de negocio, todos gestionados bajo un único punto de autenticación.

El sistema resuelve tres grandes necesidades empresariales:

1. **Normalización y gestión de catálogos de productos** (ServiPáramo)
2. **Optimización de inventario y pronóstico de demanda** (Avantika)
3. **Detección de anomalías y gestión de riesgos financieros** (Joz)

---

## 2. Actores del Sistema

| Actor | Descripción |
|---|---|
| Usuario administrador | Accede al Hub y navega a cualquier servicio. Gestiona configuraciones. |
| Analista de catálogo | Usa ServiPáramo para revisar, normalizar y depurar SKUs del ERP. |
| Analista de inventario | Usa Avantika para monitorear stock y revisar pronósticos de demanda. |
| Analista de riesgos | Usa Joz para revisar alertas de anomalías y evaluar riesgos financieros. |

Actualmente todos los usuarios autenticados tienen el mismo nivel de acceso (sin roles diferenciados por servicio).

---

## 3. Hub Central de Autenticación

### 3.1 Descripción

El Hub es el punto de entrada único a la plataforma. Presenta al usuario un formulario de login y, una vez autenticado, muestra las tarjetas de acceso a cada servicio disponible.

### 3.2 Flujo de autenticación

1. El usuario accede al Hub en el navegador.
2. Ingresa su usuario y contraseña en el formulario de login.
3. El sistema valida las credenciales contra la base de datos.
4. Si son correctas, se entrega un token de sesión.
5. El token se almacena localmente y se usa en todas las peticiones posteriores.
6. El Hub presenta las tarjetas de los servicios disponibles.
7. Al hacer clic en una tarjeta, el usuario es redirigido al servicio seleccionado.

### 3.3 Cierre de sesión

El usuario puede cerrar sesión en cualquier momento. El token es invalidado en el servidor y se limpia el almacenamiento local. El usuario es redirigido al login.

### 3.4 Servicios disponibles desde el Hub

- **ServiPáramo** → Gestión de catálogo SKU
- **Avantika** → Inventario y pronósticos
- **Joz** → Detección de anomalías

---

## 4. ServiPáramo — Gestión de Catálogo SKU

### 4.1 Descripción general

ServiPáramo conecta con el ERP de la empresa (SQL Server) para extraer, normalizar y gestionar el catálogo de productos. Utiliza técnicas de inteligencia artificial (embeddings semánticos) para detectar duplicados y sugerir normalizaciones de familias de productos.

### 4.2 Módulos funcionales

#### Dashboard
- Muestra el estado general del catálogo: total de SKUs, porcentaje de duplicados, familias normalizadas, embeddings generados.
- Indica el estado del último proceso ETL ejecutado.

#### Gestor de Catálogo
- Lista todos los SKUs del catálogo con filtros por categoría, familia y búsqueda de texto.
- Soporta paginación para grandes volúmenes de productos.
- Permite ver el detalle de cada SKU individual.

#### Detección de Duplicados
- Identifica grupos de SKUs que podrían ser el mismo producto con descripciones distintas.
- El analista puede revisar cada grupo y decidir si fusionarlos o mantenerlos separados.
- Los duplicados son detectados usando similitud semántica entre descripciones.

#### Normalización de Familias
- Muestra las familias de productos del ERP con sus variaciones de nombre.
- Permite al analista aprobar, rechazar o modificar la normalización sugerida.
- Permite fusionar dos familias en una sola.

#### Búsqueda Semántica
- El usuario escribe una descripción o término de búsqueda en lenguaje natural.
- El sistema usa embeddings para encontrar los SKUs más similares, incluso si no coinciden literalmente.
- Util para encontrar productos cuando se desconoce el código exacto.

#### Análisis de Compras
- Visualiza las órdenes de compra y pedidos sincronizados desde el ERP.
- Gráficas de evolución temporal de compras y distribución por proveedor/categoría.

#### Consola SQL
- Permite ejecutar consultas SQL directamente sobre la base de datos.
- Orientada a usuarios técnicos para exploración ad-hoc de los datos.

#### Configuración
- Panel para ajustar parámetros del sistema.

### 4.3 Proceso ETL (Sincronización con ERP)

El proceso ETL extrae datos del ERP de SQL Server y los sincroniza hacia la base de datos del sistema:

1. Conexión al servidor SQL Server del ERP.
2. Extracción de categorías, familias, SKUs, órdenes, pedidos y presupuestos.
3. Almacenamiento en tablas intermedias (raw).
4. Procesamiento y normalización.
5. Generación de embeddings semánticos para los SKUs.
6. Registro del resultado en el log de ETL.

El proceso puede dispararse manualmente desde el dashboard o la configuración.

---

## 5. Avantika — Inventario y Pronóstico de Demanda

### 5.1 Descripción general

Avantika proporciona una vista integral del inventario de la empresa con capacidades de pronóstico de demanda basado en modelos de machine learning, y genera sugerencias automáticas de reposición.

### 5.2 Módulos funcionales

#### Vista General (Dashboard)
- **KPIs principales:**
  - Total de SKUs gestionados
  - SKUs en riesgo de desabasto
  - Valor total del inventario
  - Demanda total del período
- Gráfica de pronóstico de demanda por período.
- Tabla de SKUs con sus niveles de stock actuales.
- Panel de alertas de inventario crítico.
- Distribución de SKUs por categoría.

#### Gestión de SKUs
- Tabla completa de SKUs con clasificación ABC.
- Botones de importación y exportación de datos.
- Formulario para agregar nuevos SKUs manualmente.

#### Pronóstico de Demanda
- Selección de SKU y rango de fechas para generar pronóstico.
- Visualización de la predicción con intervalos de confianza.
- Métricas de rendimiento del modelo:
  - **Precisión del modelo:** 94.2%
  - **MAE** (Error Absoluto Medio)
  - **RMSE** (Raíz del Error Cuadrático Medio)
  - **R²** (Coeficiente de determinación)
- Análisis de tendencia y estacionalidad.

### 5.3 Clasificación ABC

El sistema clasifica automáticamente los SKUs según su impacto en el valor del inventario:

- **A:** SKUs de alto valor / alta rotación (prioridad máxima de gestión)
- **B:** SKUs de valor/rotación media
- **C:** SKUs de bajo valor / baja rotación

### 5.4 Sugerencias de Reposición

El sistema genera automáticamente sugerencias de cuándo y cuánto reponer para cada SKU, basándose en el stock actual, stock mínimo configurado y el pronóstico de demanda.

---

## 6. Joz — Detección de Anomalías y Riesgos

### 6.1 Descripción general

Joz monitorea las transacciones financieras de la empresa (provenientes de la plataforma SuperEfectivo) para detectar comportamientos anómalos, gestionar alertas y evaluar los niveles de riesgo por sucursal.

### 6.2 Módulos funcionales

#### Dashboard Principal
- **KPIs de transacciones:**
  - Total de transacciones en el período
  - Transacciones con anomalías detectadas
  - Número de alertas activas
  - Sucursales monitoreadas
- Gráfica de actividad diaria con resaltado de anomalías.
- Distribución de transacciones por sucursal.
- Distribución por tipo de transacción (empeño, retiro, abono, apertura, cierre).

#### Gestión de Alertas
- Listado de todas las alertas generadas con filtros por:
  - Severidad (alta / media / baja)
  - Estado (pendiente / revisada / descartada)
  - Nivel de riesgo
- El analista puede cambiar el estado de cada alerta (revisarla o descartarla).
- Paginación para volúmenes grandes.

#### Evaluación de Riesgos
- Vista de riesgos identificados por sucursal.
- Cada riesgo incluye: categoría, probabilidad de ocurrencia e impacto estimado.
- Permite identificar las sucursales con mayor exposición al riesgo.

#### Historial de Transacciones
- Acceso al historial completo de transacciones.
- Filtros disponibles: fecha, tipo, sucursal, búsqueda por cliente o referencia.
- Paginación.

#### Detalle de Sucursal
- Vista individual por sucursal con sus métricas propias.
- Historial de transacciones específico de esa sucursal.
- Alertas y riesgos asociados.

#### Configuración
- Panel de parámetros del sistema.

### 6.3 Tipos de transacciones monitoreadas

| Tipo | Descripción |
|---|---|
| Empeño | Entrega de prenda a cambio de dinero |
| Retiro | Recuperación de la prenda al pagar la deuda |
| Abono | Pago parcial de la deuda |
| Apertura | Apertura de nueva cuenta/caja |
| Cierre | Cierre de cuenta/caja |

### 6.4 Proceso ETL (Sincronización con SuperEfectivo)

1. Conexión autenticada a la API de SuperEfectivo.
2. Descarga de transacciones del período.
3. Procesamiento y detección de anomalías.
4. Generación de alertas para transacciones fuera de los parámetros normales.
5. Cálculo de niveles de riesgo por sucursal.
6. Registro en el log de ETL.

---

## 7. Navegación y Experiencia de Usuario

### 7.1 Estructura de navegación

Todos los microservicios comparten una estructura de navegación similar:

```
Hub (login)
└── Dashboard del servicio (página principal)
    ├── Sidebar de navegación lateral
    │   ├── Enlace al dashboard
    │   ├── Módulos del servicio
    │   └── Configuración
    └── Área de contenido principal
        ├── Header con título de la sección
        ├── KPIs / métricas (tarjetas estadísticas)
        ├── Gráficas y visualizaciones
        └── Tablas de datos
```

### 7.2 Componentes de UI reutilizables

Cada servicio implementa:

- **StatCard:** Tarjeta que muestra un KPI con icono, valor, descripción y tendencia opcional.
- **Tablas paginadas:** Para listados de datos con filtros.
- **Gráficas:** Líneas y barras para series temporales.
- **Formularios modales:** Para acciones como fusionar familias o aprobar normalizaciones.

### 7.3 Idioma y región

- Toda la interfaz está en español colombiano.
- Las fechas y monedas siguen el estándar colombiano.
- La zona horaria es `America/Bogota`.

---

## 8. Flujos de Trabajo Principales

### Flujo: Normalización de catálogo en ServiPáramo

```
1. Ejecutar ETL desde dashboard o configuración
2. Sistema sincroniza datos desde ERP SQL Server
3. Sistema genera embeddings para todos los SKUs nuevos/modificados
4. Analista revisa duplicados detectados → decide fusionar o mantener
5. Analista revisa normalizaciones de familias → aprueba o corrige
6. Catálogo queda depurado y disponible para búsqueda semántica
```

### Flujo: Pronóstico de demanda en Avantika

```
1. Analista accede a la sección Forecast
2. Selecciona el SKU de interés
3. Define el período de pronóstico (fecha inicio - fecha fin)
4. Sistema ejecuta el modelo ML y retorna predicción
5. Analista visualiza el pronóstico con intervalos de confianza
6. Sistema sugiere cantidad y fecha de reposición recomendada
```

### Flujo: Gestión de alerta de anomalía en Joz

```
1. ETL sincroniza transacciones desde SuperEfectivo
2. Sistema detecta transacción fuera de parámetros
3. Se genera una alerta con severidad asignada
4. Analista revisa la alerta en el módulo de Alertas
5. Analista la marca como "revisada" o "descartada"
6. Si es relevante, el riesgo de la sucursal se actualiza
```

---

## 9. Casos de Uso No Contemplados (Fuera de Alcance Actual)

- No existe gestión de usuarios (creación, edición, roles desde interfaz)
- No hay notificaciones automáticas (email, SMS, push) ante alertas críticas
- No hay integración bidireccional con el ERP (solo lectura del ERP en ServiPáramo)
- No hay exportación automática de reportes programados
- No hay historial de auditoría de acciones del usuario
- No hay diferenciación de permisos por rol

---

## 10. Glosario

| Término | Definición |
|---|---|
| SKU | Stock Keeping Unit — código único que identifica un producto |
| ERP | Enterprise Resource Planning — sistema de gestión empresarial (SQL Server en ServiPáramo) |
| ETL | Extract, Transform, Load — proceso de sincronización de datos entre sistemas |
| Embedding | Representación vectorial de texto generada por IA para comparación semántica |
| Familia | Agrupación de SKUs del ERP por tipo de producto |
| Clasificación ABC | Método de categorización de inventario por importancia de valor |
| Anomalía | Transacción financiera que se desvía del comportamiento esperado |
| Severidad | Nivel de urgencia de una alerta (alta / media / baja) |
| Sucursal | Punto físico de operación de la empresa Joz / SuperEfectivo |
| Token | Credencial de sesión que autoriza el acceso a los servicios protegidos |
