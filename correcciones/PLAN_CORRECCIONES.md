# Plan de Correcciones - BarranquIA

> Generado: 2026-04-20  
> Origen: Validacion de Juan Santamaria + PDF "Datos en el Frontend"  
> Revisado con: Codex (ajustes de seguridad frontend)  
> Estado: Implementado (2026-04-20) -- pendiente migraciones y validacion en servidor

---

## Resumen de observaciones validadas

| # | Observacion | Severidad | Estado |
|---|-------------|-----------|--------|
| 1 | Seguridad: APIs sin autenticacion (`AllowAny`) + login compartido | CRITICA | Implementado |
| 2 | Boton ETL ServiParamo no funciona | ALTA | Implementado |
| 3 | Hub publico (eliminar login del Hub) | ALTA | Implementado |
| 4 | JOZ: Detalle de riesgo vacio | MEDIA | Implementado |

---

## Correccion 1: Seguridad - Autenticacion por modulo

**Problema:** Ambos backends (JOZ y ServiParamo) tienen `AllowAny` como permiso global. Cualquier persona puede acceder a las APIs sin token. Ningun modulo tiene endpoint `/login/` propio -- dependian del Hub. Ademas, los interceptores Axios y AuthGuards en el frontend hacen fallback al token del Hub (`localStorage.getItem('token')`), permitiendo acceso cruzado entre modulos.

**Estrategia:** Cada modulo tendra su propio login y validara tokens en su propia BD. Cuando se entregue un modulo al cliente, sera completamente independiente.

### 1a. JOZ Backend

#### `joz/backend/core/settings.py`

Agregar `rest_framework.authtoken` a `INSTALLED_APPS`:
```python
INSTALLED_APPS = [
    ...
    'rest_framework',
    'rest_framework.authtoken',   # <-- agregar
    'corsheaders',
    ...
]
```

Cambiar `REST_FRAMEWORK` -- agregar autenticacion y permisos:
```python
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}
```

#### `joz/backend/joz/views.py`

Agregar imports y endpoint de login:
```python
from django.contrib.auth import authenticate
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if not user:
        return Response(
            {'error': 'Credenciales invalidas'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'username': user.username})
```

#### `joz/backend/joz/urls.py`

Agregar ruta de login:
```python
path('login/', views.login, name='joz-login'),
```

#### Migraciones
```bash
cd joz/backend && python manage.py migrate
```

### 1b. ServiParamo Backend

#### `serviparamo/backend/core/settings.py`
Mismos cambios que JOZ:
- Agregar `rest_framework.authtoken` a `INSTALLED_APPS`
- Agregar `DEFAULT_AUTHENTICATION_CLASSES` con `TokenAuthentication`
- Cambiar `DEFAULT_PERMISSION_CLASSES` a `IsAuthenticated`

#### `serviparamo/backend/serviparamo/views.py`
Agregar endpoint `login()` con `@permission_classes([AllowAny])` (mismo codigo que JOZ).

#### `serviparamo/backend/serviparamo/urls.py`
Agregar: `path('login/', views.login, name='serviparamo-login')`

#### Migraciones
```bash
cd serviparamo/backend && python manage.py migrate
```

### 1c. Frontend JOZ - Aislar token y redirecciones

#### `joz/frontend/src/services/AuthGuard.jsx`

**Antes:**
```javascript
const token = localStorage.getItem('joz_token') || localStorage.getItem('token')
```

**Despues:**
```javascript
const token = localStorage.getItem('joz_token')
```

#### `joz/frontend/src/services/api.js`

**Problema actual (linea 10-15):** `getToken()` lee `localStorage.getItem('token')` (token del Hub).  
**Problema actual (linea 17-19):** `logoutAndRedirect()` redirige al Hub (`HUB_URL`).

**Cambios necesarios:**

```javascript
// ANTES:
const getToken = () => {
  const token = localStorage.getItem('token')    // <-- token del Hub
  if (!token) return null
  const trimmed = token.trim()
  return trimmed.length > 0 ? trimmed : null
}

const logoutAndRedirect = () => {
  localStorage.removeItem('token')
  window.location.replace(HUB_URL)               // <-- redirige al Hub
}

// DESPUES:
const getToken = () => {
  const token = localStorage.getItem('joz_token') // <-- token propio de JOZ
  if (!token) return null
  const trimmed = token.trim()
  return trimmed.length > 0 ? trimmed : null
}

const logoutAndRedirect = () => {
  localStorage.removeItem('joz_token')
  localStorage.removeItem('joz_username')
  window.location.replace('/joz/login')           // <-- redirige al login de JOZ
}
```

Se puede eliminar `const HUB_URL = ...` (linea 3) ya que no se usara mas.

### 1d. Frontend ServiParamo - Aislar token y redirecciones

#### `serviparamo/frontend/src/guards/AuthGuard.jsx`

**Antes:**
```javascript
const token = localStorage.getItem('serviparamo_token') || localStorage.getItem('token')
```

**Despues:**
```javascript
const token = localStorage.getItem('serviparamo_token')
```

#### `serviparamo/frontend/src/services/api.js`

**Problema actual (linea 11-18):** `getToken()` hace fallback a `localStorage.getItem('token')` (token del Hub).  
**Problema actual (linea 21-24):** `logoutAndRedirect()` redirige al Hub.

**Cambios necesarios:**

```javascript
// ANTES:
const getToken = () => {
  const storeToken = useSessionStore.getState().token
  if (storeToken && storeToken.trim().length > 0) return storeToken.trim()
  const localToken = localStorage.getItem('token')  // <-- fallback al Hub
  if (!localToken) return null
  const trimmed = localToken.trim()
  return trimmed.length > 0 ? trimmed : null
}

const logoutAndRedirect = () => {
  useSessionStore.getState().setToken(null)
  localStorage.removeItem('token')
  window.location.replace(HUB_URL)                  // <-- redirige al Hub
}

// DESPUES:
const getToken = () => {
  const storeToken = useSessionStore.getState().token
  if (storeToken && storeToken.trim().length > 0) return storeToken.trim()
  const localToken = localStorage.getItem('serviparamo_token')  // <-- token propio
  if (!localToken) return null
  const trimmed = localToken.trim()
  return trimmed.length > 0 ? trimmed : null
}

const logoutAndRedirect = () => {
  useSessionStore.getState().setToken(null)
  localStorage.removeItem('serviparamo_token')
  localStorage.removeItem('serviparamo_username')
  window.location.replace('/serviparamo/login')      // <-- redirige a login propio
}
```

Se puede eliminar `const HUB_URL = ...` (linea 4) ya que no se usara mas.

### Resultado esperado

Cada modulo autentica independientemente. No hay acceso cruzado. Las APIs rechazan peticiones sin token con HTTP 401. Un token de JOZ no sirve en ServiParamo y viceversa (BDs separadas).

---

## Correccion 2: Boton ETL ServiParamo

**Problema:** El componente `ETLMonitor.tsx` importa funciones inexistentes de `../services/api`. Las funciones correctas estan en `serviparamoService.js` con nombres ligeramente diferentes.

**Archivo:** `serviparamo/frontend/src/pages/ETLMonitor.tsx` (linea 9)

**Cambio:**
```typescript
// ANTES (roto):
import { getEtlStatus, runEtl } from "../services/api";

// DESPUES (correcto):
import { getETLStatus, runETL } from "../services/serviparamoService";
```

Ademas, buscar y reemplazar en el mismo archivo todas las llamadas:
- `getEtlStatus(` -> `getETLStatus(`
- `runEtl(` -> `runETL(`

**Resultado:** El boton invoca correctamente `POST /api/serviparamo/etl/run/` y el estado se actualiza.

---

## Correccion 3: Hub publico (sin login)

> **Prerequisito:** Correccion 1 debe estar completa (para que no queden APIs abiertas al quitar el login del Hub).

**Problema:** El Hub requiere login para ver las tarjetas de servicios. Se quiere que sea una landing publica.

### Frontend -- `hub/frontend/src/App.jsx`
- Eliminar import de `Login` (linea 4)
- Eliminar estados `token`/`username` y funciones `handleLogin`/`handleLogout` (lineas 112-132)
- Eliminar la guarda `if (!token) return <Login .../>` (linea 134)
- Renderizar `<Hub />` directamente sin props de auth
- Eliminar el bloque `user-menu` del header (lineas 84-87)

### Backend -- `hub/backend/api/views.py`
- Eliminar endpoint `login()` (lineas 39-47)
- Eliminar endpoint `logout()` (lineas 50-54)
- Quitar `@permission_classes([IsAuthenticated])` de `services_list()` (linea 63)
- Mantener `health_check()` como esta

### Backend -- `hub/backend/api/urls.py`
- Eliminar rutas `login/` y `logout/`
- Mantener `health/` y `services/`

### Limpieza
- Eliminar `hub/frontend/src/Login.jsx` y su CSS asociado
- Eliminar `rest_framework.authtoken` de `INSTALLED_APPS` en `hub/backend/barranquia/settings.py` (linea 21)
- Eliminar `DEFAULT_AUTHENTICATION_CLASSES` del `REST_FRAMEWORK` config (lineas 100-102)

**Resultado:** El Hub se convierte en una landing page publica con las tarjetas de Avantika, JOZ y ServiParamo.

---

## Correccion 4: JOZ - Detalle de riesgo vacio

**Problema:** El modelo `Riesgo` existe pero no tiene registros. No hay ETL, management command, ni tarea que lo pobla. El documento funcional lo marca como "pendiente de activar -- siguiente fase".

**Situacion actual:**
- El endpoint `GET /api/joz/riesgos/` devuelve `count: 0`
- "Ver detalle" hace `GET /api/joz/riesgos/{id}/` -> HTTP 404
- Las "tiendas con riesgo" que SI se muestran se calculan on-the-fly desde `Transaccion`

**Solucion: Poblar con datos derivados (scoring inicial)**

> **Nota importante:** Este scoring es *derivado* de transacciones existentes, no de un analisis de anomalias real con modelo ML. Es una aproximacion inicial para que el modulo no aparezca vacio.

Crear management command: `joz/backend/joz/management/commands/calcular_riesgos.py`

Logica: reutilizar el calculo que ya hace `views.py:429-456`:
1. Agregar transacciones por almacen
2. Calcular porcentaje de transacciones anomalas
3. Asignar nivel: `alto` (>=70%), `medio` (>=40%), `bajo` (<40%)
4. Insertar/actualizar registros en modelo `Riesgo`

Campos a poblar:
- `categoria`: nombre del almacen
- `descripcion`: "X transacciones anomalas detectadas por monto/frecuencia (scoring derivado)"
- `nivel`: alto/medio/bajo segun porcentaje
- `probabilidad`: porcentaje de transacciones anomalas
- `impacto_estimado`: suma de montos anomalos

Ejecutar como parte del ETL de JOZ o manualmente:
```bash
cd joz/backend && python manage.py calcular_riesgos
```

---

## Observaciones no criticas (sin accion inmediata)

### Colores institucionales
- ServiParamo tiene paleta CSS definida; JOZ usa paleta dark/amber
- Los clientes no mostraron inquietud al respecto
- **Accion:** No prioritario. Se ajustara si el cliente lo solicita formalmente

### Fragmentacion de transacciones (del PDF)
- Una referencia puede aparecer multiples veces con diferentes valores
- Es comportamiento esperado de la API de origen (SuperEfectivo)
- **Accion:** Documentar el comportamiento. Considerar agrupacion visual a futuro

---

## Orden de ejecucion

```
Paso 1 -- Correccion 1: Seguridad por modulo (30-45 min)
          |-- 1a. JOZ backend: authtoken + login endpoint + IsAuthenticated
          |-- 1b. ServiParamo backend: authtoken + login endpoint + IsAuthenticated
          |-- 1c. JOZ frontend: api.js (getToken -> joz_token, redirect -> /joz/login)
          |                      AuthGuard.jsx (quitar fallback a token del Hub)
          '-- 1d. ServiParamo frontend: api.js (getToken -> serviparamo_token, redirect -> /serviparamo/login)
                                         AuthGuard.jsx (quitar fallback a token del Hub)

Paso 2 -- Correccion 2: Fix ETL button (5 min)
          '-- ETLMonitor.tsx: cambiar import + nombres de funcion

Paso 3 -- Correccion 3: Hub publico (15-20 min)
          '-- Depende de que Paso 1 este listo

Paso 4 -- Correccion 4: Riesgo JOZ (1-2 horas)
          '-- Management command para scoring derivado
```

---

## Checklist de validacion post-cambio

Ejecutar despues de completar cada correccion:

### Seguridad (despues de Correccion 1) -- Validado 2026-04-20
- [x] `curl /api/joz/stats/` sin token => **HTTP 401** ✓
- [x] `curl /api/serviparamo/stats/` sin token => **HTTP 401** ✓
- [x] `POST /api/joz/login/` con credenciales validas => retorna `{ token, username }` ✓
- [x] `POST /api/serviparamo/login/` con credenciales validas => retorna `{ token, username }` ✓
- [x] `curl -H "Authorization: Token <joz_token>" /api/joz/stats/` => **HTTP 200** ✓
- [x] `curl -H "Authorization: Token <sp_token>" /api/serviparamo/stats/` => **HTTP 200** ✓
- [x] Token de JOZ usado en ServiParamo => **HTTP 401** (BDs separadas) ✓
- [x] Token de ServiParamo usado en JOZ => **HTTP 401** (BDs separadas) ✓
- [ ] Frontend JOZ: login -> dashboard -> todas las paginas cargan datos (pendiente validacion visual)
- [ ] Frontend ServiParamo: login -> dashboard -> todas las paginas cargan datos (pendiente validacion visual)
- [ ] Frontend JOZ: no redirige al Hub en caso de 401, redirige a `/joz/login` (pendiente validacion visual)
- [ ] Frontend ServiParamo: no redirige al Hub, redirige a `/serviparamo/login` (pendiente validacion visual)

### ETL (despues de Correccion 2)
- [x] Import corregido en ETLMonitor.tsx ✓
- [ ] Boton "Actualizar ETL" en ServiParamo responde y lanza sincronizacion (pendiente validacion visual)
- [ ] Estado ETL se actualiza en pantalla despues de ejecutar (pendiente validacion visual)

### Hub publico (despues de Correccion 3)
- [x] `GET /api/health/` => HTTP 200 sin auth ✓
- [x] `GET /api/services/` => HTTP 200 sin auth ✓
- [ ] Abrir `/` en navegador muestra tarjetas sin pedir login (pendiente validacion visual)
- [ ] No hay menu de usuario ni boton "Salir" (pendiente validacion visual)

### Riesgo JOZ (despues de Correccion 4) -- Validado 2026-04-20
- [x] `python manage.py calcular_riesgos` ejecuta sin error => 31 riesgos creados ✓
- [x] `GET /api/joz/riesgos/` retorna `count: 31` ✓
- [x] `GET /api/joz/riesgos/1/` retorna detalle completo (no 404) ✓
- [x] Descripcion indica "scoring derivado" ✓

---

## Notas de despliegue

- **Cada modulo se entrega independiente.** Al cliente se le envia solo la carpeta de su modulo (ej: `joz/` o `serviparamo/`).
- El Hub queda como landing interna/demo, no se entrega a los clientes.
- Despues de aplicar Correccion 1, ejecutar `python manage.py migrate` en cada modulo para crear la tabla `authtoken_token`.
- Crear usuario admin en cada modulo: `python manage.py ensure_admin` o `python manage.py createsuperuser`.
- Los builds de frontend (`npm run build`) deben ejecutarse despues de los cambios en `api.js` y `AuthGuard`.
