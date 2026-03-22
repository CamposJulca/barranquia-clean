# BarranquIA Hub — Makefile
# Uso: make <comando>  (ejecutar desde la raíz del repo)
#
# Comandos principales:
#   make up               Levanta todos los servicios (Docker)
#   make down             Detiene y elimina contenedores
#   make restart          Reinicia todos los servicios
#   make build            Reconstruye imágenes sin caché
#   make logs             Muestra logs en vivo (todos los servicios)
#   make ps               Estado de los contenedores
#
# Deploy en bare-metal (systemd):
#   make deploy-nginx     Aplica config nginx y recarga (requiere sudo)
#   make deploy-ngrok     Instala y activa el túnel ngrok (requiere sudo)
#   make deploy           Aplica nginx + ngrok en un solo comando
#
# Frontend ServiPáramo:
#   make build-serviparamo  Reconstruye el dist de Vite
#   make reload-backend     Recarga gunicorn sin downtime (HUP)

COMPOSE = docker compose -f docker/docker-compose.yml --env-file .env
BACKEND = barranquia_hub_backend
FRONTEND = barranquia_serviparamo_frontend
GUNICORN_MASTER = $(shell pgrep -f "gunicorn barranquia.wsgi" | head -1)

.PHONY: up down restart build rebuild logs ps \
        restart-backend restart-frontend \
        logs-backend logs-frontend logs-nginx logs-db \
        migrate etl etl-skus etl-catalogo shell db-shell \
        deploy deploy-nginx deploy-ngrok \
        build-serviparamo reload-backend setup

# ── Ciclo de vida ─────────────────────────────────────────────────────────────

up:
	$(COMPOSE) up -d
	@echo ""
	@echo "Servicios corriendo:"
	@echo "  API Hub        → http://localhost:8005/api/"
	@echo "  ServiPáramo UI → http://localhost:9005/serviparamo/"
	@echo "  Nginx proxy    → http://localhost:9005"

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

restart-backend:
	$(COMPOSE) restart hub-backend

restart-frontend:
	$(COMPOSE) restart serviparamo-frontend

# ── Build ─────────────────────────────────────────────────────────────────────

build:
	$(COMPOSE) build

rebuild:
	$(COMPOSE) build --no-cache

# Rebuild y restart de un solo servicio
rebuild-backend:
	$(COMPOSE) build --no-cache hub-backend
	$(COMPOSE) up -d hub-backend

rebuild-frontend:
	$(COMPOSE) build --no-cache serviparamo-frontend
	$(COMPOSE) up -d serviparamo-frontend

# ── Logs ─────────────────────────────────────────────────────────────────────

logs:
	$(COMPOSE) logs -f

logs-backend:
	$(COMPOSE) logs -f hub-backend

logs-frontend:
	$(COMPOSE) logs -f serviparamo-frontend

logs-nginx:
	$(COMPOSE) logs -f nginx

logs-db:
	$(COMPOSE) logs -f postgres

# ── Estado ────────────────────────────────────────────────────────────────────

ps:
	$(COMPOSE) ps

# ── Django shortcuts ──────────────────────────────────────────────────────────

migrate:
	$(COMPOSE) exec hub-backend python manage.py migrate

shell:
	$(COMPOSE) exec hub-backend python manage.py shell

# ── ETL Servipáramo ───────────────────────────────────────────────────────────

etl:
	$(COMPOSE) exec hub-backend python serviparamo/etl.py
	@echo "ETL completado. Revisa los logs para detalles."

etl-skus:
	$(COMPOSE) exec hub-backend python serviparamo/etl.py --tablas CatalogoSKU

etl-catalogo:
	$(COMPOSE) exec hub-backend python serviparamo/etl.py --tablas RawCategoria RawFamilia

# ── Base de datos ─────────────────────────────────────────────────────────────

db-shell:
	$(COMPOSE) exec postgres psql -U $${DB_USER:-barranquia} -d $${DB_NAME:-barranquia_hub}

# ── Deploy bare-metal (nginx + ngrok, requieren sudo) ─────────────────────────

deploy-nginx:
	sudo bash scripts/deploy-nginx.sh

deploy-ngrok:
	sudo bash scripts/deploy-ngrok.sh

deploy: deploy-nginx deploy-ngrok
	@echo ""
	@echo "=== Deploy completo ==="
	@echo "  Local   → http://localhost:9005/serviparamo/"
	@echo "  Público → https://barranquia-hub.ngrok.io/serviparamo/"

# ── Frontend ServiPáramo ───────────────────────────────────────────────────────

build-serviparamo:
	cd frontend/serviparamo && npm run build
	@echo "Build listo en frontend/serviparamo/dist/"

reload-backend:
	kill -HUP $(GUNICORN_MASTER)
	@echo "Gunicorn recargado (PID: $(GUNICORN_MASTER))"

# ── Primer arranque ───────────────────────────────────────────────────────────
# Construye todo, levanta servicios, espera a que la BD esté lista.
setup:
	@echo "Verificando .env..."
	@test -f .env || (echo "ERROR: falta el archivo .env — copiar .env.example y completar" && exit 1)
	@echo "Construyendo imágenes..."
	$(COMPOSE) build
	@echo "Levantando servicios..."
	$(COMPOSE) up -d
	@echo ""
	@echo "=== Setup completo ==="
	@echo "  ServiPáramo UI → http://localhost:9005/serviparamo/"
	@echo "  API stats      → http://localhost:9005/api/serviparamo/stats/"
