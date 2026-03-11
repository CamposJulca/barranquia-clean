#!/bin/bash
set -e
BASE=/home/desarrollo/barranquIA-hub/hub

echo "=== BarranquIA Hub Setup ==="

# Create Python virtual environment
cd $BASE
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r backend/requirements.txt

# Django setup
cd backend
python manage.py collectstatic --noinput
python manage.py migrate

echo "=== Backend ready ==="

# Frontend build
cd $BASE/frontend
npm install
npm run build

echo "=== Frontend built ==="
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "1. sudo cp $BASE/nginx.conf /etc/nginx/sites-available/barranquia-hub"
echo "2. sudo ln -sf /etc/nginx/sites-available/barranquia-hub /etc/nginx/sites-enabled/"
echo "3. sudo nginx -t && sudo systemctl reload nginx"
echo "4. sudo cp /home/desarrollo/barranquIA-hub/hub/barranquia-hub.service /etc/systemd/system/"
echo "5. sudo systemctl daemon-reload && sudo systemctl enable --now barranquia-hub"
