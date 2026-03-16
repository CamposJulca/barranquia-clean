# Documento Funcional — BarranquIA Hub
**Versión:** 1.0
**Fecha:** 2026-03-14
**Estado:** En desarrollo activo

---

## 1. Visión del Producto

BarranquIA Hub es una plataforma centralizada de servicios inteligentes para empresas en Barranquilla, Colombia. Su propósito es unificar bajo una sola interfaz múltiples aplicaciones de negocio potenciadas por inteligencia artificial, reduciendo la fricción operativa y ofreciendo una experiencia de usuario coherente.

**Objetivo principal:** Proveer a las organizaciones acceso ágil a herramientas de IA aplicadas (pronóstico de demanda, detección de alertas, gestión de catálogos, business intelligence) desde un único punto de acceso autenticado.

---

## 2. Actores del Sistema

| Actor | Descripción |
|---|---|
| **Usuario final** | Empleado de empresa cliente que accede a los módulos del hub |
| **Administrador** | Gestiona usuarios, servicios activos y configuración del sistema |
| **Sistema externo** | Módulos hijos (Avantika, Joz, ServiPáramo, Power BI) |

---

## 3. Módulos del Sistema

### 3.1 Hub Central

El hub es el portal de entrada. Gestiona la identidad del usuario y presenta el catálogo de servicios disponibles.

**Funcionalidades:**
- Autenticación de usuarios
- Listado visual de servicios activos
- Acceso directo a cada módulo mediante tarjetas interactivas
- Indicador de estado del sistema (health check)
- Cierre de sesión global

---

### 3.2 Avantika — Gestión de Inventario y Pronóstico de Demanda

Módulo orientado a empresas distribuidoras (sector automotriz como caso de uso inicial). Proporciona visibilidad del inventario en tiempo real y proyecciones de demanda basadas en modelos estadísticos.

**Submódulos:**

#### Vista General (Dashboard)
Panel ejecutivo con indicadores clave de desempeño:
- Total de SKUs gestionados
- SKUs en situación de riesgo (stock crítico o bajo)
- Valor total del inventario en COP
- Demanda total registrada
- Gráfico de pronóstico de demanda (14 días)
- Tabla de inventario con estado por producto
- Panel de alertas activas
- Distribución de categorías de producto

#### Gestión de SKUs
Catálogo de productos del inventario:
- Visualización de todos los productos con datos completos
- Estado de stock con semáforo visual:
  - **Crítico (rojo):** stock ≤ 50% del nivel de reorden
  - **Bajo (amarillo):** stock ≤ nivel de reorden
  - **Normal (verde):** stock suficiente
- Precio unitario en pesos colombianos (COP)
- Información de proveedor y última actualización
- Acciones: importar, exportar, agregar nuevo SKU

**Categorías de productos gestionados:**
- Lubricantes (aceites de motor)
- Filtros (aire, aceite)
- Baterías
- Frenos (pastillas, discos)
- Neumáticos
- Fluidos (refrigerante, transmisión)
- Suspensión (amortiguadores, resortes)
- Encendido (bujías, sistema de ignición)

#### Pronóstico de Demanda
Módulo predictivo con horizonte de 14 días:
- Indicadores del modelo:
  - Precisión: 94.2%
  - Período de predicción: 14 días
  - Tendencia: +6.8% de crecimiento
  - Volatilidad: Baja (±3.2%)
- Gráfico de área con intervalos de confianza
- Métricas de calidad del modelo:
  - MAE (Error Absoluto Medio): 8.5 unidades
  - RMSE (Raíz del Error Cuadrático Medio): 12.3 unidades
  - R² (Coeficiente de determinación): 0.942

---

### 3.3 Joz — Sistema de Alertas (En desarrollo)

Módulo dedicado a la detección de anomalías y generación de alertas operativas. Disponible como placeholder en la navegación de Avantika.

**Funcionalidades planificadas:**
- Detección automática de anomalías en series temporales
- Alertas de stock crítico
- Notificaciones de desviaciones de demanda
- Panel de alertas con historial y estado

---

### 3.4 ServiPáramo — Catálogo de Productos (En desarrollo)

Módulo para navegación y gestión del catálogo de productos y servicios.

**Funcionalidades planificadas:**
- Exploración de catálogo con filtros
- Ficha técnica de productos
- Precios y disponibilidad
- Integración con proveedores

---

### 3.5 Power BI — Business Intelligence (Pendiente)

Integración con Microsoft Power BI para visualización avanzada de datos y reportes ejecutivos.

**Funcionalidades planificadas:**
- Acceso directo a dashboards de Power BI
- Reportes de ventas, inventario y operaciones
- Exportación de datos

---

## 4. Flujos de Usuario

### 4.1 Inicio de sesión

```
1. Usuario navega a la URL del Hub
2. Sistema muestra el formulario de login
3. Usuario ingresa usuario y contraseña
4. Sistema valida las credenciales
   ├── Válidas → genera token, redirige al panel de servicios
   └── Inválidas → muestra mensaje de error
5. Token se almacena en el navegador para la sesión
```

### 4.2 Acceso a un módulo

```
1. Usuario está autenticado en el Hub
2. Visualiza las tarjetas de servicios disponibles
3. Hace clic en un módulo (ej. Avantika)
4. El módulo verifica el token con el Hub
   ├── Token válido → carga la aplicación del módulo
   └── Token inválido → redirige al login del Hub
```

### 4.3 Navegación dentro de Avantika

```
1. Usuario accede al módulo Avantika
2. Ve el dashboard general con KPIs y gráficas
3. Puede navegar mediante el menú lateral a:
   ├── Vista General (dashboard con KPIs y pronóstico)
   ├── SKUs (tabla completa de inventario)
   ├── Forecast (análisis predictivo detallado)
   ├── Alertas (módulo Joz — en desarrollo)
   └── Catálogo (módulo ServiPáramo — en desarrollo)
```

### 4.4 Cierre de sesión

```
1. Usuario hace clic en "Cerrar sesión" en el Hub
2. Sistema invalida el token en el servidor
3. Se borra el token del navegador
4. Usuario es redirigido al formulario de login
```

---

## 5. Reglas de Negocio

### 5.1 Gestión de sesión
- El token de sesión se almacena en `localStorage` del navegador
- Los módulos hijos verifican la validez del token antes de cargar
- Si el token expira o es inválido, el sistema redirige automáticamente al Hub
- Un usuario solo puede tener una sesión activa por token

### 5.2 Visibilidad de servicios
- Solo se muestran servicios marcados como `active: true` en el registro
- Los servicios inactivos no aparecen en el panel principal
- El estado de cada servicio es configurable desde el backend

### 5.3 Clasificación de inventario
- Stock **crítico**: unidades disponibles ≤ 50% del nivel de reorden → requiere acción inmediata
- Stock **bajo**: unidades disponibles ≤ nivel de reorden → requiere reposición próxima
- Stock **normal**: unidades disponibles > nivel de reorden → sin acción requerida

### 5.4 Pronóstico de demanda
- El modelo genera proyecciones para los próximos 14 días
- Cada predicción incluye límite superior e inferior (intervalo de confianza)
- Los datos históricos (5 días anteriores) se muestran junto a las predicciones para contexto
- La precisión del modelo se evalúa con MAE, RMSE y R²

---

## 6. Pantallas y Componentes UI

### 6.1 Hub — Login
- Logotipo del hub
- Campo de usuario
- Campo de contraseña
- Botón de ingreso con estado de carga
- Mensaje de error en caso de fallo

### 6.2 Hub — Panel de Servicios
- Encabezado con nombre de usuario y estado del sistema
- Grid de tarjetas de servicios (ícono, nombre, descripción, estado, color distintivo)
- Botón de cierre de sesión
- Indicador de conectividad con el backend

### 6.3 Avantika — Dashboard
- Barra lateral de navegación con agrupación por módulo
- Encabezado con buscador y notificaciones
- Tarjetas de KPI (4 métricas principales)
- Gráfico de pronóstico de área interactivo
- Tabla de inventario resumida
- Panel lateral de alertas activas
- Barras de progreso por categoría de producto

### 6.4 Avantika — Tabla de SKUs
- Buscador / filtro
- Tabla con columnas: ID, Nombre, Categoría, Stock, Estado, Precio, Demanda Promedio, Proveedor
- Indicadores de estado con código de color
- Botones de acción: Importar, Exportar, Nuevo SKU

### 6.5 Avantika — Forecast
- 4 métricas de desempeño del modelo en tarjetas
- Gráfico de área con demanda real y predicción
- Bandas de confianza visuales
- Tabla de métricas técnicas del modelo (MAE, RMSE, R²)

---

## 7. Casos de Uso Detallados

### CU-01: Autenticar Usuario
- **Actor:** Usuario final
- **Precondición:** El hub está activo y accesible
- **Flujo principal:**
  1. Usuario abre la URL del Hub
  2. Ingresa credenciales
  3. Sistema valida y devuelve token
  4. Usuario accede al panel de servicios
- **Flujo alternativo:** Credenciales incorrectas → mensaje de error, sin acceso

### CU-02: Consultar Inventario
- **Actor:** Usuario final (autenticado)
- **Precondición:** Sesión activa, token válido
- **Flujo principal:**
  1. Usuario accede a Avantika desde el Hub
  2. Módulo verifica token
  3. Usuario navega a "SKUs"
  4. Visualiza tabla completa de inventario con estados
- **Flujo alternativo:** Token inválido → redirección al Hub

### CU-03: Consultar Pronóstico de Demanda
- **Actor:** Usuario final (autenticado)
- **Precondición:** Sesión activa
- **Flujo principal:**
  1. Usuario navega a "Forecast" en Avantika
  2. Sistema muestra métricas del modelo y gráfico
  3. Usuario puede leer proyecciones para los próximos 14 días
  4. Interpreta intervalos de confianza y tendencias

### CU-04: Cerrar Sesión
- **Actor:** Usuario final
- **Precondición:** Sesión activa
- **Flujo principal:**
  1. Usuario hace clic en "Cerrar sesión"
  2. Token invalidado en el servidor
  3. Limpieza de localStorage
  4. Redirección al formulario de login

---

## 8. Requerimientos No Funcionales

| Requerimiento | Descripción |
|---|---|
| **Disponibilidad** | Servicio continuo vía SystemD con reinicio automático |
| **Seguridad** | Autenticación por token en todos los endpoints protegidos |
| **Idioma** | Español colombiano (es-CO), moneda COP |
| **Accesibilidad** | Interfaz web responsive |
| **Rendimiento** | Gunicorn con 3 workers, timeout de 120s |
| **Escalabilidad** | Arquitectura modular; nuevos módulos agregables por puerto |
| **Trazabilidad** | Tokens rastreables por usuario en BD |

---

## 9. Roadmap Funcional

### Fase 1 — Completado
- [x] Hub con autenticación y panel de servicios
- [x] Módulo Avantika (UI con datos mock)
- [x] Pronóstico de demanda (visualización)
- [x] Inventario de SKUs con clasificación de estado

### Fase 2 — En progreso
- [ ] Backend FastAPI para Avantika (conexión a datos reales)
- [ ] Módulo Joz: sistema de alertas funcional
- [ ] Módulo ServiPáramo: catálogo de productos

### Fase 3 — Planificado
- [ ] Integración Power BI
- [ ] Modelo ML real para pronóstico de demanda
- [ ] Roles y permisos de usuario
- [ ] Notificaciones en tiempo real
- [ ] Panel de administración de servicios
- [ ] Documentación API (Swagger/OpenAPI)
