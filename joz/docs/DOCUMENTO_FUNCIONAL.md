# Documento Funcional — Módulo Joz · SuperEfectivo
**BarranquIA** · Versión 1.0 · Abril 2026

---

## 1. Resumen ejecutivo

Se desarrolló un módulo de visualización de movimientos financieros para **SuperEfectivo S.A.**, una cadena de casas de empeño con presencia en múltiples almacenes. El módulo consume la API interna de SuperEfectivo, procesa los movimientos del día y los presenta en un dashboard web accesible desde el Hub central de BarranquIA.

---

## 2. Lo que se construyó

### 2.1 Backend (Django · Python)

| Componente | Descripción |
|---|---|
| `joz/backend` | Servicio Django autónomo, base de datos PostgreSQL propia (`joz`) |
| `Transaccion` | Modelo principal: almacena cada movimiento con referencia, tipo, monto, cliente, almacén, cajero |
| `ETLLog` | Registro de cada ejecución del ETL: filas recibidas, insertadas, errores |
| `Alerta` | Modelo para futuras alertas de anomalías (pendiente de activar) |
| `Riesgo` | Modelo para scoring de riesgo por almacén (pendiente de activar) |
| ETL (`joz/etl.py`) | Módulo de integración con la API de SuperEfectivo — listo para conectar en tiempo real |
| API REST (`/api/joz/`) | Endpoints: `historial`, `stats`, `alertas`, `riesgos`, `anomalias-por-dia`, `etl/run`, `etl/status` |

### 2.2 Frontend (React · Vite)

Dashboard único accesible desde `https://barranquia-hub.ngrok.io/joz/` con:

- **Tarjetas por tipo de operación** (clicables para filtrar):
  - Empeño — cliente entrega artículo, recibe dinero
  - Retiro de empeño — cliente recupera artículo o retira efectivo
  - Abono / Interés — cliente paga para extender plazo
  - Apertura / Cierre de caja — movimientos operativos del cajero
- **Resumen por almacén** — conteo y monto total de cada sucursal
- **Tabla de transacciones** con buscador en tiempo real (cliente, referencia, descripción)

### 2.3 Infraestructura

- Contenedores Docker: `barranquia_joz_backend` (`:8003`) y `barranquia_joz_frontend` (`:9023`)
- Nginx gateway en `:9005` enruta `/joz/` → frontend y `/api/joz/` → backend
- Acceso público vía `https://barranquia-hub.ngrok.io/joz/`

---

## 3. Datos actuales en base de datos

Los datos cargados provienen del archivo `Documento_SitioWebApiIA.pdf` entregado por SuperEfectivo, que corresponde a la respuesta real de la API para el **27 de marzo de 2026**.

| Concepto | Valor |
|---|---|
| Total transacciones | 244 |
| Rango de IDs | 25304 – 25547 |
| Almacenes con actividad | 02, 06, 07, 09, 10, 12, 16 (y otros) |
| Período | Un solo día: 2026-03-27 |

**Desglose por tipo de operación:**

| Operación | Cantidad | Monto total |
|---|---|---|
| Abono / Pago de interés | 61 | ~$1.730 |
| Retiro de empeño | 75 | ~$8.582 |
| Empeño | 52 | ~$7.415 |
| Apertura de caja | 32 | ~$111.654 |
| Cierre de caja | 6 | ~$32.155 |
| Otro | 18 | ~$2.243 |

**Artículos empeñados más frecuentes:** joyas en oro 10KT/18KT (anillos, cadenas, pulseras, dijes), electrónicos (celulares, laptops), relojería.

---

## 4. API de SuperEfectivo — Especificación técnica

### 4.1 Autenticación

Todas las peticiones requieren un objeto `pSWacceso` en el body:

```json
{
  "pSWacceso": {
    "pUsuario": "<usuario>",
    "pPassword": "<contraseña>",
    "pToken": "<token_de_sesion>"
  }
}
```

### 4.2 Endpoint implementado

#### `POST /api/AportesRetiros/Movimientos/porfecha`

Retorna todos los movimientos de aportes y retiros en un rango de fechas.

**Query params:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `Codalmacen` | int | Almacén específico. `0` = todos los almacenes |
| `fechaInicio` | date | `YYYY-MM-DD` |
| `fechaFin` | date | `YYYY-MM-DD` |

**Almacenes disponibles:** 0 (todos) · 1 al 30

**Respuesta exitosa:**

```json
{
  "codigo": 200,
  "estado": "OK",
  "msj": "Se encontraron '244' registros!",
  "list": [
    {
      "id": 25304,
      "almorigen": 2,
      "almdestino": 2,
      "nrodocumento": "EM405972",
      "numeroidentificacion": "83107",
      "nombre": "LUIS CARLOS GUTIERREZ MEJIA",
      "descripcion": "Empeño de: ANILLO PIEDRA: 10KT/; ...",
      "valor": 140,
      "entrada": 0,
      "salida": 140,
      "fecha": "2026-03-27T00:00:00",
      "hora": { "hours": 0, "minutes": 8, "seconds": 31, ... },
      "tipo": "Retiro",
      "usuario": "KVALDES"
    }
  ]
}
```

**Campos clave de cada registro:**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | int | ID único del movimiento |
| `almorigen` | int | Código del almacén de origen |
| `nrodocumento` | string | Referencia del documento (ej: `EM405972`, `RE84336`, `AE124948`) |
| `numeroidentificacion` | string | Cédula / ID del cliente |
| `nombre` | string | Nombre completo del cliente |
| `descripcion` | string | Descripción detallada del movimiento |
| `valor` | decimal | Monto de la operación |
| `entrada` | decimal | Dinero que entra al almacén |
| `salida` | decimal | Dinero que sale del almacén |
| `tipo` | string | `"Aporte"` o `"Retiro"` |
| `usuario` | string | Usuario cajero que registró |
| `fecha` | datetime | Fecha del movimiento |
| `hora` | object | Hora en formato `{hours, minutes, seconds}` |

---

## 5. Qué se necesita del cliente para conectar en tiempo real

Para activar el ETL en vivo (el código ya está listo en `joz/etl.py`), SuperEfectivo debe suministrar:

### 5.1 Credenciales de acceso a la API

| Variable | Descripción | Ejemplo |
|---|---|---|
| `JOZ_API_URL` | URL base del servidor de SuperEfectivo | `https://api.superefectivo.com` |
| `JOZ_API_USUARIO` | Usuario asignado para el módulo IA | `barranquia_ia` |
| `JOZ_API_PASSWORD` | Contraseña del usuario | `***` |
| `JOZ_API_TOKEN` | Token de sesión activo | `TKN-XXXXXX` |

Estas variables se agregan al archivo `.env` del servidor y el ETL las lee automáticamente.

### 5.2 Conectividad de red

- La IP pública del servidor de BarranquIA debe estar **en lista blanca (whitelist)** en el firewall/API de SuperEfectivo
- El protocolo es HTTPS — confirmar si el certificado es válido o autofirmado

### 5.3 Aclaración sobre el token

El documento técnico de SuperEfectivo define `pToken` como un *"token de sesión activa"*. Necesitamos saber:

- ¿El token **expira**? ¿Cada cuánto tiempo?
- ¿Hay un endpoint de **renovación/login** para obtener el token programáticamente?
- ¿O es un token fijo asignado por administración?

Esto determina si el ETL puede correr de forma autónoma o si requiere intervención manual periódica.

### 5.4 Frecuencia y ventana de datos

Definir con SuperEfectivo:

- ¿Con qué frecuencia se debe consultar? (cada hora, cada 15 min, al cierre del día)
- ¿La API entrega datos en tiempo real o hay latencia desde el sistema de caja?
- ¿Cuántos días de histórico están disponibles para carga inicial?

---

## 6. Próximos pasos

Una vez se tengan las credenciales, el flujo es:

1. Agregar las 4 variables al `.env` del servidor
2. Ejecutar el ETL manualmente para validar la conexión:
   ```bash
   docker exec barranquia_joz_backend python manage.py shell -c "from joz.etl import run; run()"
   ```
3. Activar ejecución automática (cron o tarea programada) con la frecuencia acordada
4. El dashboard se actualiza automáticamente con cada ejecución del ETL

---

## 7. Alcance del módulo actual vs. futuro

| Funcionalidad | Estado actual |
|---|---|
| Carga desde PDF (datos de prueba) | ✅ Activo |
| Dashboard de movimientos por operación y almacén | ✅ Activo |
| ETL hacia API real de SuperEfectivo | ⏳ Listo — pendiente credenciales |
| Detección de anomalías (IA) | 🔲 Siguiente fase |
| Alertas automáticas | 🔲 Siguiente fase |
| Scoring de riesgo por almacén | 🔲 Siguiente fase |
| Histórico multi-día | 🔲 Post-conexión en tiempo real |
