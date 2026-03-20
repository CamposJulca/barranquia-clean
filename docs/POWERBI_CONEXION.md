# Documento Técnico — Conexión Power BI Desktop a BarranquIA Hub
**Versión:** 1.0
**Fecha:** 2026-03-20
**Estado:** En implementación
**Autor:** Equipo BarranquIA

---

## 1. Objetivo

Habilitar la conexión de **Power BI Desktop** a la base de datos **PostgreSQL** del proyecto BarranquIA Hub desde fuera de la red local, utilizando el túnel TCP de **ngrok** ya configurado en el servidor.

---

## 2. Arquitectura de Conectividad

```
┌─────────────────────────┐         Internet          ┌──────────────────────────┐
│   Power BI Desktop      │ ◄────────────────────────► │   ngrok (nube)           │
│   (máquina analista)    │   TCP  0.tcp.ngrok.io:XXXX │   túnel db → puerto 5432 │
└─────────────────────────┘                            └───────────┬──────────────┘
                                                                   │ TCP local
                                                      ┌────────────▼─────────────┐
                                                      │   Servidor BarranquIA    │
                                                      │   192.168.0.101          │
                                                      │                          │
                                                      │   PostgreSQL 16          │
                                                      │   puerto 5432            │
                                                      │   BD: barranquia_hub     │
                                                      └──────────────────────────┘
```

**Flujo:** Power BI → ngrok cloud (TCP) → servidor 192.168.0.101:5432 → PostgreSQL

---

## 3. Infraestructura del Servidor

| Componente | Detalle |
|---|---|
| SO | Ubuntu 24.04 LTS |
| IP local | 192.168.0.101 |
| Base de datos | PostgreSQL 16 |
| Puerto PostgreSQL | 5432 |
| Túnel SSH (ngrok) | `ssh desarrollo@0.tcp.ngrok.io -p 19493` |
| Túnel DB (ngrok) | `0.tcp.ngrok.io:<PUERTO_DB>` *(ver sección 4.3)* |
| Framework backend | Django 4.2 + Django REST Framework |
| Base de datos Django | `barranquia_hub` |

---

## 4. Configuración del Servidor (pasos de implementación)

> Estos pasos los ejecuta el administrador del servidor **una sola vez**.

### 4.1 Crear usuario y base de datos en PostgreSQL

Conectarse al servidor vía SSH:

```bash
ssh desarrollo@0.tcp.ngrok.io -p 19493
```

Crear el usuario y la base de datos:

```bash
sudo -u postgres psql << 'EOF'
CREATE USER barranquia WITH PASSWORD 'Barranquia2024Hub';
CREATE DATABASE barranquia_hub OWNER barranquia;
GRANT ALL PRIVILEGES ON DATABASE barranquia_hub TO barranquia;
EOF
```

### 4.2 Habilitar conexiones remotas en PostgreSQL

```bash
# Escuchar en todas las interfaces de red
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" \
  /etc/postgresql/16/main/postgresql.conf

# Agregar regla de acceso para conexiones externas autenticadas
echo "host    barranquia_hub    barranquia    0.0.0.0/0    scram-sha-256" | \
  sudo tee -a /etc/postgresql/16/main/pg_hba.conf

# Aplicar cambios
sudo systemctl restart postgresql
```

### 4.3 Verificar el túnel ngrok activo para PostgreSQL

El archivo de configuración de ngrok (`~/.config/ngrok/ngrok.yml`) ya tiene definido el túnel:

```yaml
tunnels:
  ssh:
    proto: tcp
    addr: 22
  web:
    proto: http
    addr: 8000
  db:
    proto: tcp
    addr: 5432
```

Para iniciar todos los túneles y conocer el puerto asignado para la BD:

```bash
ngrok start --all
```

En la salida de ngrok aparecerá algo como:

```
Forwarding  tcp://0.tcp.ngrok.io:XXXXX  ->  localhost:5432
```

**Anotar ese puerto `XXXXX`** — es el que se usa en Power BI.

> **Nota:** Con la cuenta gratuita de ngrok, el puerto TCP cambia cada vez que se reinicia el servicio. Si se requiere un puerto fijo, se puede contratar un **TCP reservado** en el plan ngrok Pro, o automatizar la distribución del puerto actual a los analistas.

### 4.4 Migrar datos de SQLite a PostgreSQL

```bash
cd /home/desarrollo/barranquIA-hub/hub/backend
source venv/bin/activate

# 1. Exportar datos desde SQLite
python manage.py dumpdata \
  --exclude auth.permission \
  --exclude contenttypes \
  --indent 2 \
  -o /tmp/sqlite_backup.json

# 2. Crear esquema en PostgreSQL
python manage.py migrate

# 3. Cargar datos
python manage.py loaddata /tmp/sqlite_backup.json

# 4. Reiniciar servicio backend
sudo systemctl restart barranquia-hub
```

---

## 5. Credenciales de Conexión

| Parámetro | Valor |
|---|---|
| **Servidor** | `0.tcp.ngrok.io` |
| **Puerto** | `<PUERTO asignado por ngrok al túnel db>` |
| **Base de datos** | `barranquia_hub` |
| **Usuario** | `barranquia` |
| **Contraseña** | `Barranquia2024Hub` |
| **SSL** | No requerido (ngrok maneja el cifrado en tránsito) |

> Las credenciales deben entregarse a los analistas de manera segura (no por correo en texto plano).

---

## 6. Pasos para Conectar Power BI Desktop

### 6.1 Requisitos previos

- Power BI Desktop instalado (versión enero 2024 o superior recomendada)
- Acceso a internet
- Puerto ngrok activo en el servidor (verificar con el administrador)

### 6.2 Configurar la conexión

1. Abrir **Power BI Desktop**
2. Clic en **Inicio → Obtener datos**
3. Buscar y seleccionar **Base de datos PostgreSQL**
4. Clic en **Conectar**

![Obtener datos → PostgreSQL](https://i.imgur.com/placeholder.png)

5. Ingresar los datos de conexión:

| Campo | Valor |
|---|---|
| Servidor | `0.tcp.ngrok.io:XXXXX` *(puerto actual del túnel db)* |
| Base de datos | `barranquia_hub` |

6. Modo de conectividad: seleccionar **Importar** (recomendado) o **DirectQuery**
7. Clic en **Aceptar**
8. En la ventana de credenciales:
   - Tipo: **Base de datos**
   - Usuario: `barranquia`
   - Contraseña: `Barranquia2024Hub`
9. Clic en **Conectar**

### 6.3 Seleccionar tablas

Una vez conectado, el navegador mostrará las tablas disponibles:

| Tabla | Descripción |
|---|---|
| `serviparamo_catalogosku` | Catálogo de SKUs del módulo ServiPáramo |
| `serviparamo_catalogoembedding` | Vectores semánticos por SKU |
| `auth_user` | Usuarios del sistema |
| `authtoken_token` | Tokens de autenticación |
| `api_*` | Tablas del módulo Hub API |

Seleccionar las tablas requeridas y clic en **Cargar** o **Transformar datos**.

---

## 7. Mantenimiento y Operación

### 7.1 ¿Qué hacer cuando cambia el puerto de ngrok?

Cada vez que se reinicie ngrok, el puerto TCP del túnel `db` cambia. El administrador debe:

1. Verificar el nuevo puerto:
   ```bash
   curl -s http://localhost:4040/api/tunnels | python3 -m json.tool | grep "public_url"
   ```

2. Comunicar el nuevo puerto a los analistas de Power BI.

3. Los analistas actualizan la conexión en Power BI:
   - **Inicio → Transformar datos → Configuración del origen de datos**
   - Editar la cadena de conexión con el nuevo puerto.

### 7.2 Verificar estado del servicio

```bash
# Estado PostgreSQL
sudo systemctl status postgresql

# Estado ngrok (si corre como servicio)
systemctl --user status ngrok

# Verificar conectividad de la BD
psql -U barranquia -h localhost -d barranquia_hub -c "SELECT version();"
```

### 7.3 Verificar túnel activo

```bash
curl -s http://localhost:4040/api/tunnels | python3 -m json.tool
```

---

## 8. Seguridad

| Aspecto | Medida implementada |
|---|---|
| **Cifrado en tránsito** | ngrok cifra el tráfico TCP entre Power BI y el servidor |
| **Autenticación BD** | Usuario dedicado `barranquia` con contraseña (scram-sha-256) |
| **Aislamiento** | El usuario `barranquia` solo tiene acceso a la BD `barranquia_hub` |
| **Sin exposición directa** | El puerto 5432 no está abierto directamente en el router/firewall |

### Recomendaciones adicionales

- Rotar la contraseña del usuario `barranquia` periódicamente.
- Considerar ngrok Pro para un **TCP reservado** con IP/puerto fijo.
- Restringir el acceso en `pg_hba.conf` a rangos de IP conocidos si es posible.
- No compartir credenciales por canales no seguros.

---

## 9. Solución de Problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| "No se puede conectar al servidor" | Puerto ngrok cambió o túnel inactivo | Verificar puerto activo con `curl localhost:4040/api/tunnels` |
| "Autenticación fallida" | Credenciales incorrectas | Verificar usuario/contraseña en la sección 5 |
| "Base de datos no existe" | Migración no completada | Ejecutar pasos de la sección 4.4 |
| Power BI tarda mucho en cargar | Tabla muy grande (`db.sqlite3` ~1.16 GB) | Usar filtros en Power Query antes de cargar |
| "SSL connection required" | Configuración SSL activa | Agregar `sslmode=disable` en opciones avanzadas de conexión |

---

## 10. Contacto y Soporte

Para problemas de conectividad o solicitud del puerto ngrok actual, contactar al administrador del servidor BarranquIA Hub.

---

*Documento generado para el proyecto BarranquIA Hub — Barranquilla, Colombia*
