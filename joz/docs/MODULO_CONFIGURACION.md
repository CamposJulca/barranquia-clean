# Módulo: Configuración — Ajustes del Sistema

**Ruta:** `/settings`
**Acceso:** Requiere autenticación (token)
**URL:** https://joz-ccb.ngrok.io/settings

---

## 1. Descripción General

Panel de configuración con 2 tabs: gestión del usuario actual (información y cambio de contraseña) y configuración de las 11 reglas del motor de detección de anomalías con sus umbrales numéricos.

---

## 2. Estructura Visual

### 2.1 Tab: Usuario

#### Información del usuario actual

| Campo | Valor |
|-------|-------|
| Usuario | `admin` (de `localStorage('joz_username')`) |
| Rol | Administrador (badge "Superuser") |

#### Cambio de contraseña

| Campo | Validación |
|-------|-----------|
| Contraseña actual | Verificada contra BD |
| Nueva contraseña | Mínimo 6 caracteres |
| Confirmar contraseña | Debe coincidir con la nueva |

Al cambiar contraseña:
1. Se valida la contraseña actual (`user.check_password`)
2. Se actualiza en BD (`user.set_password`)
3. Se elimina el token anterior y se genera uno nuevo
4. El nuevo token se devuelve en la respuesta

**Endpoint:** `POST /api/joz/change-password/`

```json
// Request
{ "current_password": "admin123", "new_password": "nuevoPass456" }

// Response
{ "ok": true, "message": "Contraseña actualizada.", "token": "nuevo_token_aqui" }
```

---

### 2.2 Tab: Detección

Configuración de las 11 reglas del motor de detección de anomalías, organizadas por categoría. Cada regla tiene un switch on/off y los umbrales numéricos se configuran globalmente.

#### Reglas con switch on/off

| Categoría | Regla | Switch | Descripción |
|-----------|-------|--------|-------------|
| **Coherencia Transaccional** | Sin partida doble | `enabled_partida_doble` | Movimientos cruzados entre tiendas sin contraparte |
| | Desbalance cruzado | `enabled_desbalance_cruzado` | Diferencia >2% entre aporte y retiro en pares |
| | Duplicidad cruzada | `enabled_duplicidad_cruzada` | Más de un retiro asociado al mismo doccruce |
| **Cuadre de Caja** | Cuadre de caja anómalo | `enabled_cuadre_caja` | Balance neto diario que se desvía del promedio histórico |
| **Comportamiento** | Desviación de monto | `enabled_desviacion_monto` | Monto excede N desviaciones estándar del promedio por almacén |
| | Horario atípico | `enabled_horario_atipico` | Operaciones fuera del horario operativo |
| | Concentración de cajero | `enabled_concentracion_cajero` | Cajero con volumen >Nx el promedio global |
| **Score Global** | Score por transacción | `enabled_score_transaccion` | Score compuesto (monto + hora + concentración) |
| **Reincidencia** | Reincidencia de tienda | `enabled_reincidencia_tienda` | Tasa de anomalías del almacén supera umbral |
| | Reincidencia de cajero | `enabled_reincidencia_cajero` | Tasa de anomalías del cajero supera umbral |

#### Umbrales numéricos (11)

| Umbral | Campo | Default | Descripción |
|--------|-------|---------|-------------|
| Z-score media | `zscore_media` | 2.0 | Umbral para severidad media |
| Z-score alta | `zscore_alta` | 3.0 | Umbral para severidad alta/crítica |
| Score mínimo | `score_umbral` | 0.5 | Score compuesto mínimo para generar alerta (0-1) |
| Horario inicio | `hora_inicio` | 6 | Hora de inicio del horario operativo (0-23) |
| Horario fin | `hora_fin` | 21 | Hora de fin del horario operativo (0-23) |
| Ratio cajero | `cajero_ratio` | 2.0 | Factor sobre promedio para alertar concentración |
| Cuadre caja media (USD) | `cuadre_umbral_media` | 10,000 | Diferencia mínima para alerta media |
| Cuadre caja alta (USD) | `cuadre_umbral_alta` | 50,000 | Diferencia mínima para alerta alta |
| Reincidencia tienda (%) | `reincidencia_tienda_pct` | 5 | Tasa de anomalías/transacciones por almacén |
| Reincidencia cajero (%) | `reincidencia_cajero_pct` | 3 | Tasa de anomalías/transacciones por cajero |
| Desbalance tolerancia (%) | `desbalance_tolerancia` | 2 | Tolerancia para diferencia en pares cruzados |

---

## 3. Endpoints consumidos

| Endpoint | Método | Uso |
|----------|--------|-----|
| `GET /api/joz/config/deteccion/` | GET | Cargar configuración actual |
| `PATCH /api/joz/config/deteccion/` | PATCH | Guardar cambios de configuración |
| `POST /api/joz/change-password/` | POST | Cambiar contraseña del usuario |

### `PATCH /api/joz/config/deteccion/`

**Body (parcial, solo los campos que cambian):**
```json
{
  "enabled_partida_doble": true,
  "enabled_desbalance_cruzado": true,
  "enabled_horario_atipico": false,
  "zscore_media": 2.0,
  "score_umbral": 0.5
}
```

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "enabled_partida_doble": true,
    "enabled_desbalance_cruzado": true,
    "enabled_horario_atipico": false,
    "zscore_media": 2.0,
    "score_umbral": 0.5,
    "updated_at": "2026-04-21T16:30:00Z"
  }
}
```

---

## 4. Persistencia

La configuración se almacena en la tabla `joz_config_deteccion` (singleton, siempre `pk=1`). Los 11 switches y los 11 umbrales numéricos se persisten en esta tabla y se leen por el motor de detección al ejecutarse.

---

## 5. Notas Técnicas

- **Archivo frontend:** `joz/frontend/src/pages/Settings.tsx`
- **Archivo backend (config):** `joz/backend/joz/views.py` (función `config_deteccion`)
- **Archivo backend (password):** `joz/backend/joz/views.py` (función `change_password`)
- **Modelo:** `joz/backend/joz/models.py` → `ConfigDeteccion`
- **Tabs:** 2 (Usuario, Detección)
