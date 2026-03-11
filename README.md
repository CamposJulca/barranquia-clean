# BarranquIA Hub

Plataforma central de acceso a servicios de inteligencia artificial desarrollados en Barranquilla, Colombia.

## URL Pública

**https://barranquia-hub.ngrok.io**

---

## Arquitectura

```
Internet
   │
   ▼
ngrok (HTTPS automático)
   │
   ▼
Nginx :9005  ─── /api/*        ──► Django/Gunicorn :8005
             ─── /avantika/*   ──► FastAPI :9001  (Daniel)
             ─── /serviparamo/*──► FastAPI :9002  (Daniel)
             ─── /joz/*        ──► FastAPI :9003  (Daniel)
             ─── /*            ──► React SPA (staticfiles)
```

### Stack del Hub

| Capa | Tecnología | Puerto |
|------|-----------|--------|
| Frontend | React 18 + Vite | — (SPA estática) |
| Backend | Django 4.2 + DRF | 127.0.0.1:8005 |
| Proxy | Nginx | 0.0.0.0:9005 |
| Tunnel | ngrok | → 9005 |

---

## Estructura del Repositorio

```
barranquIA-hub/
├── hub/                    # Hub central (operativo)
│   ├── frontend/           # React + Vite
│   ├── backend/            # Django REST Framework
│   ├── venv/               # Virtualenv Python
│   ├── nginx.conf          # Config Nginx (instalada en sites-enabled)
│   ├── barranquia-hub.service  # Systemd unit (instalado)
│   └── setup.sh            # Script de despliegue inicial
├── avantika/               # Módulo Avantika (en desarrollo - Daniel)
├── serviparamo/            # Módulo ServiPáramo (en desarrollo - Daniel)
├── joz/                    # Módulo Joz (en desarrollo - Daniel)
└── powerbi/                # Módulo Power BI (pendiente)
```

---

## Estado Actual

| Componente | Estado |
|-----------|--------|
| Hub Frontend (React) | ✅ Operativo |
| Hub Backend (Django) | ✅ Operativo |
| Autenticación con token | ✅ Operativo |
| Nginx en :9005 | ✅ Operativo |
| Tunnel ngrok | ✅ Activo |
| Servicio systemd | ✅ Activo (auto-start) |
| Módulo Avantika | 🔧 En desarrollo |
| Módulo ServiPáramo | 🔧 En desarrollo |
| Módulo Joz | 🔧 En desarrollo |
| Módulo Power BI | ⏳ Pendiente |

---

## API Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/health/` | No | Estado del servicio |
| POST | `/api/login/` | No | Obtener token |
| POST | `/api/logout/` | Token | Invalidar token |
| GET | `/api/services/` | Token | Lista de módulos disponibles |

### Ejemplo de login

```bash
curl -X POST https://barranquia-hub.ngrok.io/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "***"}'
```

Respuesta:
```json
{ "token": "abc123...", "username": "admin" }
```

---

## Despliegue en 192.168.0.101

### Servicios activos

```bash
# Ver estado del backend
sudo systemctl status barranquia-hub

# Reiniciar backend
sudo systemctl restart barranquia-hub

# Ver logs en tiempo real
sudo journalctl -u barranquia-hub -f
```

### Actualizar después de cambios en el código

```bash
# 1. Rebuild del frontend
cd hub/frontend && npm run build

# 2. Collectstatic
cd hub/backend && ../venv/bin/python manage.py collectstatic --noinput

# 3. Reiniciar backend
sudo systemctl restart barranquia-hub
```

### Agregar un nuevo módulo FastAPI (Daniel)

Cada módulo debe correr en su puerto asignado:

```
Avantika   → 127.0.0.1:9001
ServiPáramo → 127.0.0.1:9002
Joz        → 127.0.0.1:9003
```

Nginx ya está configurado para enrutar a esos puertos. Solo hace falta levantar la API en el puerto correspondiente.

---

## Equipo

- **Juan** — Hub frontend (React / Sprint 2)
- **Daniel** — Módulos FastAPI (Avantika, ServiPáramo, Joz)

---

*Barranquilla, Colombia · 2026*
