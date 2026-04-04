#!/bin/bash
set -e
BASE=/home/desarrollo/barranquIA-clean

echo "=== BarranquIA Hub Setup (bare-metal) ==="

# ── Hub Backend ───────────────────────────────────────────────────────────────
echo "--- Hub Backend ---"
cd $BASE/hub/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
deactivate

# ── Hub Frontend ──────────────────────────────────────────────────────────────
echo "--- Hub Frontend ---"
cd $BASE/hub/frontend
npm install
npm run build

# ── ServiPáramo Backend ───────────────────────────────────────────────────────
echo "--- ServiPáramo Backend ---"
cd $BASE/serviparamo/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
deactivate

# ── ServiPáramo Frontend ──────────────────────────────────────────────────────
echo "--- ServiPáramo Frontend ---"
cd $BASE/serviparamo/frontend
npm install
npm run build

# ── Avantika Backend ──────────────────────────────────────────────────────────
echo "--- Avantika Backend ---"
cd $BASE/avantika/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
deactivate

# ── Avantika Frontend ─────────────────────────────────────────────────────────
echo "--- Avantika Frontend ---"
cd $BASE/avantika/frontend
npm install
npm run build

# ── Joz Backend ───────────────────────────────────────────────────────────────
echo "--- Joz Backend ---"
cd $BASE/joz/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
deactivate

# ── Joz Frontend ──────────────────────────────────────────────────────────────
echo "--- Joz Frontend ---"
cd $BASE/joz/frontend
npm install
npm run build

echo ""
echo "=== Setup completo ==="
echo ""
echo "Pasos siguientes (nginx + systemd):"
echo "  sudo cp $BASE/hub/infra/server/nginx/barranquia-hub.conf /etc/nginx/sites-available/barranquia-hub"
echo "  sudo ln -sf /etc/nginx/sites-available/barranquia-hub /etc/nginx/sites-enabled/"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo "  sudo cp $BASE/hub/infra/server/systemd/barranquia-hub.service /etc/systemd/system/"
echo "  sudo systemctl daemon-reload && sudo systemctl enable --now barranquia-hub"
