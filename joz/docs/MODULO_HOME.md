# Modulo: Home -- Pantalla de Inicio

**Ruta:** `/home`
**Acceso:** Requiere autenticacion (token)
**URL:** https://joz-ccb.ngrok.io/home

---

## 1. Descripcion General

Pantalla de bienvenida post-login que ofrece una vista panoramica del sistema JOZ Monitoring. Presenta un resumen ejecutivo con KPIs en vivo, las capacidades del motor de deteccion y accesos directos a todos los modulos disponibles.

Es la primera pantalla que ve el usuario despues de autenticarse. Al acceder a `/` se redirige automaticamente a `/home`.

---

## 2. Estructura Visual

### 2.1 Bienvenida personalizada

| Elemento | Detalle |
|----------|---------|
| Saludo dinamico | "Buenos dias/tardes/noches" segun la hora del navegador |
| Nombre de usuario | Se obtiene de `localStorage('joz_username')` |
| Descripcion del sistema | Texto explicativo de la plataforma y su proposito |
| CTA principal | Boton "Ir al Dashboard" -> `/dashboard` |

### 2.2 KPIs en tiempo real (4 tarjetas)

Datos consumidos del endpoint `GET /api/joz/stats/`.

| Tarjeta | Campo del API | Descripcion | Valor actual |
|---------|--------------|-------------|--------------|
| Transacciones | `total_transacciones` | Total acumulado de transacciones importadas desde SuperEfectivo | 6,230 |
| Alertas abiertas | `alertas_abiertas` | Alertas en estado `abierta` pendientes de gestion | 1,600 |
| Criticas | `alertas_criticas` | Alertas con severidad `critica` en estado `abierta` | 60 |
| Volumen total | `total_monto` | Suma de todos los montos en USD (entradas + salidas) | USD 2,477,226 |

### 2.3 Capacidades del sistema (3 tarjetas)

Informacion estatica que describe las capacidades del motor:

| Capacidad | Descripcion |
|-----------|-------------|
| Deteccion automatica | 11 reglas de deteccion ejecutandose en cada ciclo ETL |
| Scoring de riesgo | Puntaje por almacen basado en frecuencia y severidad de anomalias |
| ETL programado | Carga automatica cada hora desde la API de SuperEfectivo |

### 2.4 Estado ETL en vivo

Datos consumidos del endpoint `GET /api/joz/etl/status/`.

| Elemento | Detalle |
|----------|---------|
| Indicador de estado | Punto verde (en espera) o amber pulsante (ejecutando) |
| Ultimo resultado | Cantidad de filas del ultimo ETL ejecutado |
| Link | "Ver monitor" -> `/etl` |

### 2.5 Modulos del sistema (10 tarjetas con enlace)

| Modulo | Ruta | Descripcion |
|--------|------|-------------|
| Home | `/home` | Pantalla de bienvenida con KPIs y accesos directos |
| Dashboard | `/dashboard` | KPIs en tiempo real, volumen de transacciones y actividad por almacen |
| Alertas | `/alerts` | Anomalias detectadas con severidad, tipo y gestion de estados |
| Riesgos | `/risks` | Scoring de riesgo operativo por almacen basado en patrones |
| Inteligencia Artificial | `/ia` | Deteccion de anomalias con Isolation Forest (machine learning no supervisado) |
| Historial | `/history` | Exploracion detallada de transacciones con filtros avanzados |
| Monitor ETL | `/etl` | Pipeline de carga, historial de ejecuciones y programacion |
| Consola SQL | `/sql` | Consultas directas para analisis ad-hoc y reportes |
| Configuracion | `/settings` | 2 tabs: Usuario (cambio de contrasena) + Deteccion (11 reglas con switches/umbrales) |
| Detalle de Tienda | `/store/:nombre` | Vista individual por almacen con transacciones, alertas y metricas |

### 2.6 Footer

Branding: "JOZ Monitoring System -- Powered by SuperEfectivo - Joyerias Joz S.A."

---

## 3. Endpoints consumidos

| Endpoint | Metodo | Datos utilizados |
|----------|--------|-----------------|
| `/api/joz/stats/` | GET | `total_transacciones`, `alertas_abiertas`, `alertas_criticas`, `total_monto` |
| `/api/joz/etl/status/` | GET | `corriendo` (boolean), `data[0].filas_insertadas` |

---

## 4. Comportamiento

- La pagina carga los KPIs y el estado del ETL al montar el componente (una sola vez).
- No tiene auto-refresh; los datos se actualizan al recargar la pagina o navegar de vuelta.
- Si los endpoints fallan, los valores muestran `...` como placeholder.
- El layout usa grid de 12 columnas para aprovechar el espacio completo.

---

## 5. Notas tecnicas

- **Archivo fuente:** `joz/frontend/src/pages/Home.tsx`
- **Router:** Definido en `joz/frontend/src/router/router.jsx` como `{ path: "home", element: <Home /> }`
- **Redireccion:** `index: true` en el router redirige `/` -> `/home`
- **Moneda:** Todos los valores monetarios se formatean en USD (Balboas panamenos, equivalente 1:1).
- **Datos actuales:** 6,230 transacciones, 30 tiendas, 114 cajeros, 1,600 alertas, 312 anomalias IA.
