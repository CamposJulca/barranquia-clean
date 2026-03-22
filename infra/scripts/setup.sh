#!/bin/bash
set -e
BASE=/home/desarrollo/barranquIA-clean

echo "=== BarranquIA Hub Setup ==="

# Create Python virtual environment
cd $BASE/backend/hub
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Django setup
python manage.py collectstatic --noinput
python manage.py migrate

echo "=== Backend ready ==="

# Frontend build
cd $BASE/frontend/hub
npm install
npm run build

echo "=== Frontend built ==="
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "1. sudo cp $BASE/infra/nginx/barranquia-hub.conf /etc/nginx/sites-available/barranquia-hub"
echo "2. sudo ln -sf /etc/nginx/sites-available/barranquia-hub /etc/nginx/sites-enabled/"
echo "3. sudo nginx -t && sudo systemctl reload nginx"
echo "4. sudo cp $BASE/infra/systemd/barranquia-hub.service /etc/systemd/system/"
echo "5. sudo systemctl daemon-reload && sudo systemctl enable --now barranquia-hub"
