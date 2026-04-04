# BarranquIA Hub — Makefile
# Uso: make <comando>  (ejecutar desde la raíz del repo)
#
# Comandos principales:
#   make up               Levanta todos los servicios
#   make down             Detiene y elimina contenedores
#   make build            Reconstruye imágenes
#   make logs             Logs en vivo (todos los servicios)
#   make ps               Estado de los contenedores
#
# Por empresa:
#   make up-serviparamo   Levanta solo serviparamo (backend + frontend)
#   make up-avantika      Levanta solo avantika
#   make up-joz           Levanta solo joz
#
# Django shortcuts:
#   make migrate-serviparamo / migrate-avantika / migrate-joz / migrate-hub
#   make shell-serviparamo / shell-avantika / shell-joz / shell-hub
#   make etl              Dispara el ETL de ServiPáramo
#
# Deploy bare-metal:
#   make deploy-nginx     Aplica config nginx (requiere sudo)
#   make deploy-ngrok     Instala túnel ngrok (requiere sudo)

COMPOSE     = docker compose -f shared/docker-compose.yml --env-file .env
COMPOSE_CTX = docker compose -f shared/docker-compose.yml --env-file .env --project-directory .

.PHONY: up down restart build rebuild logs ps \
        up-serviparamo up-avantika up-joz up-hub \
        restart-serviparamo restart-avantika restart-joz restart-hub \
        rebuild-serviparamo rebuild-avantika rebuild-joz rebuild-hub \
        logs-serviparamo logs-avantika logs-joz logs-hub logs-nginx logs-db \
        migrate-serviparamo migrate-avantika migrate-joz migrate-hub \
        shell-serviparamo shell-avantika shell-joz shell-hub \
        etl etl-skus db-shell \
        deploy deploy-nginx deploy-ngrok setup

# ── Ciclo de vida ─────────────────────────────────────────────────────────────

up:
	$(COMPOSE) up -d
	@echo ""
	@echo "Servicios activos:"
	@echo "  Nginx proxy      → http://localhost:9005"
	@echo "  Hub API          → http://localhost:9005/api/"
	@echo "  ServiPáramo UI   → http://localhost:9005/serviparamo/"
	@echo "  ServiPáramo API  → http://localhost:9005/api/serviparamo/stats/"
	@echo "  Avantika UI      → http://localhost:9005/avantika/"
	@echo "  Avantika API     → http://localhost:9005/api/avantika/stats/"
	@echo "  Joz UI           → http://localhost:9005/joz/"
	@echo "  Joz API          → http://localhost:9005/api/joz/stats/"

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

# ── Build ─────────────────────────────────────────────────────────────────────

build:
	$(COMPOSE) build

rebuild:
	$(COMPOSE) build --no-cache

rebuild-serviparamo:
	$(COMPOSE) build --no-cache serviparamo-backend serviparamo-frontend
	$(COMPOSE) up -d serviparamo-backend serviparamo-frontend

rebuild-avantika:
	$(COMPOSE) build --no-cache avantika-backend avantika-frontend
	$(COMPOSE) up -d avantika-backend avantika-frontend

rebuild-joz:
	$(COMPOSE) build --no-cache joz-backend joz-frontend
	$(COMPOSE) up -d joz-backend joz-frontend

rebuild-hub:
	$(COMPOSE) build --no-cache hub-backend
	$(COMPOSE) up -d hub-backend

# ── Levantar por empresa ──────────────────────────────────────────────────────

up-serviparamo:
	$(COMPOSE) up -d postgres serviparamo-backend serviparamo-frontend nginx

up-avantika:
	$(COMPOSE) up -d postgres avantika-backend avantika-frontend nginx

up-joz:
	$(COMPOSE) up -d postgres joz-backend joz-frontend nginx

up-hub:
	$(COMPOSE) up -d postgres hub-backend nginx

# ── Restart por servicio ──────────────────────────────────────────────────────

restart-serviparamo:
	$(COMPOSE) restart serviparamo-backend serviparamo-frontend

restart-avantika:
	$(COMPOSE) restart avantika-backend avantika-frontend

restart-joz:
	$(COMPOSE) restart joz-backend joz-frontend

restart-hub:
	$(COMPOSE) restart hub-backend

# ── Logs ─────────────────────────────────────────────────────────────────────

logs:
	$(COMPOSE) logs -f

logs-serviparamo:
	$(COMPOSE) logs -f serviparamo-backend serviparamo-frontend

logs-avantika:
	$(COMPOSE) logs -f avantika-backend avantika-frontend

logs-joz:
	$(COMPOSE) logs -f joz-backend joz-frontend

logs-hub:
	$(COMPOSE) logs -f hub-backend

logs-nginx:
	$(COMPOSE) logs -f nginx

logs-db:
	$(COMPOSE) logs -f postgres

# ── Estado ────────────────────────────────────────────────────────────────────

ps:
	$(COMPOSE) ps

# ── Django: migraciones ───────────────────────────────────────────────────────

migrate-serviparamo:
	$(COMPOSE) exec serviparamo-backend python manage.py migrate

migrate-avantika:
	$(COMPOSE) exec avantika-backend python manage.py migrate

migrate-joz:
	$(COMPOSE) exec joz-backend python manage.py migrate

migrate-hub:
	$(COMPOSE) exec hub-backend python manage.py migrate

# ── Django: shell ─────────────────────────────────────────────────────────────

shell-serviparamo:
	$(COMPOSE) exec serviparamo-backend python manage.py shell

shell-avantika:
	$(COMPOSE) exec avantika-backend python manage.py shell

shell-joz:
	$(COMPOSE) exec joz-backend python manage.py shell

shell-hub:
	$(COMPOSE) exec hub-backend python manage.py shell

# ── ETL ServiPáramo ───────────────────────────────────────────────────────────

etl:
	$(COMPOSE) exec serviparamo-backend python serviparamo/etl.py
	@echo "ETL completado. Revisa los logs para detalles."

etl-skus:
	$(COMPOSE) exec serviparamo-backend python serviparamo/etl.py --tablas CatalogoSKU

# ── Base de datos ─────────────────────────────────────────────────────────────

db-shell:
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-barranquia} -d $${POSTGRES_DB:-barranquia_hub}

db-shell-serviparamo:
	$(COMPOSE) exec postgres psql -U serviparamo -d serviparamo

db-shell-avantika:
	$(COMPOSE) exec postgres psql -U avantika -d avantika

db-shell-joz:
	$(COMPOSE) exec postgres psql -U joz -d joz

# ── Deploy bare-metal ─────────────────────────────────────────────────────────

deploy-nginx:
	sudo bash shared/scripts/deploy-nginx.sh

deploy-ngrok:
	sudo bash shared/scripts/deploy-ngrok.sh

deploy: deploy-nginx deploy-ngrok
	@echo ""
	@echo "=== Deploy completo ==="
	@echo "  Público → https://barranquia-hub.ngrok.io"

# ── Primer arranque ───────────────────────────────────────────────────────────

setup:
	@echo "Verificando .env..."
	@test -f .env || (echo "ERROR: falta .env — copiar .env.example y completar" && exit 1)
	@echo "Construyendo imágenes..."
	$(COMPOSE) build
	@echo "Levantando servicios..."
	$(COMPOSE) up -d
	@echo ""
	@echo "=== Setup completo ==="
	@echo "  ServiPáramo → http://localhost:9005/serviparamo/"
	@echo "  Avantika    → http://localhost:9005/avantika/"
	@echo "  Joz         → http://localhost:9005/joz/"
