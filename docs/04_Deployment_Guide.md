# Deployment Guide
## TreeSense AI — AI-Driven IoT Framework for Tree Behaviour Analysis

**Document Version:** 1.0 | **Date:** May 2026 | **Author:** Prof. Anjit Raja R — RGU CII

---

## 1. Prerequisites

| Component | Version | Notes |
|-----------|---------|-------|
| Docker Desktop | 24.x+ | Required for containerised deployment |
| Docker Compose | 2.24+ | Included with Docker Desktop |
| Python | 3.11+ | For local development |
| Node.js | 20 LTS | For frontend tooling |
| Git | 2.40+ | Version control |
| Arduino IDE | 2.3+ | For ESP32 firmware flashing |

---

## 2. Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/rgu-cii/treesense-ai.git
cd treesense-ai

# 2. Copy environment config
cp .env.example .env
# Edit .env with your credentials

# 3. Launch the full stack
docker compose up -d

# 4. Verify services
docker compose ps

# 5. Open the dashboard
# → Frontend:   http://localhost
# → API Docs:   http://localhost:8000/docs
# → Grafana:    http://localhost:3000  (admin / admin2026)
# → Prometheus: http://localhost:9090
```

---

## 3. Environment Variables (.env)

```env
# Database
DATABASE_URL=postgresql+asyncpg://treesense:treesense_secret_2026@localhost:5432/treesense_ai
POSTGRES_DB=treesense_ai
POSTGRES_USER=treesense
POSTGRES_PASSWORD=treesense_secret_2026

# Redis
REDIS_URL=redis://localhost:6379

# MQTT
MQTT_BROKER=localhost
MQTT_PORT=1883
MQTT_WS_PORT=9001
MQTT_USERNAME=treesense_node
MQTT_PASSWORD=node_secret_2026

# API
SECRET_KEY=your-jwt-secret-key-here
API_VERSION=v1
ENVIRONMENT=production
LOG_LEVEL=info

# AWS (optional)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=ap-south-1
AWS_S3_BUCKET=treesense-ai-data

# Notifications
TWILIO_SID=your-twilio-sid
TWILIO_TOKEN=your-twilio-token
ALERT_PHONE=+91XXXXXXXXXX
SENDGRID_API_KEY=your-sendgrid-key
ALERT_EMAIL=admin@rgu.ac.in

# Firebase (mobile push)
FIREBASE_CREDENTIALS_PATH=./deployment/firebase-credentials.json
```

---

## 4. Local Development (Without Docker)

### 4.1 Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux/Mac

pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4.2 Frontend
```bash
# Simply open the frontend in a browser (no build step needed)
# Using VS Code Live Server or Python HTTP server:
cd frontend
python -m http.server 3001
# → http://localhost:3001
```

### 4.3 MQTT Broker (Local)
```bash
# Install Mosquitto
# Windows: https://mosquitto.org/download/
# Linux:
sudo apt install mosquitto mosquitto-clients

# Start broker
mosquitto -c deployment/mosquitto.conf

# Test with:
mosquitto_sub -t "treesense/+/sensors" -v
```

---

## 5. ESP32 Firmware Deployment

### 5.1 Arduino IDE Setup
1. Open **Arduino IDE 2.x**
2. Add ESP32 board: `File → Preferences → Additional Board URLs`
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Install: `Tools → Board Manager → esp32`

### 5.2 Required Libraries
Install via **Library Manager**:
- `PubSubClient` (MQTT)
- `ArduinoJson` v7
- `LoRa` by Sandeep Mistry
- `DHT sensor library` by Adafruit
- `Adafruit BME280`
- `TinyGPSPlus`
- `BH1750`
- `SD`

### 5.3 Configuration
Edit `firmware/esp32_sensor_node/config.h`:
```cpp
#define WIFI_SSID       "YourWiFiName"
#define WIFI_PASSWORD   "YourWiFiPassword"
#define MQTT_BROKER     "192.168.1.100"   // Your server IP
#define TREE_ID         "RGU-TBA-0001"    // Unique per node
```

### 5.4 Flash
```
1. Connect ESP32 via USB
2. Select board: Tools → Board → ESP32 Dev Module
3. Select port: Tools → Port → COMx (Windows) / /dev/ttyUSB0 (Linux)
4. Click Upload (→)
5. Open Serial Monitor at 115200 baud to verify
```

---

## 6. AWS Cloud Deployment

### 6.1 Architecture
```
Internet → Route 53 → CloudFront → ALB → ECS Fargate (Backend)
                                       → S3 (Frontend)
                      RDS PostgreSQL (Multi-AZ)
                      ElastiCache Redis
                      IoT Core (MQTT)
                      S3 (Sensor data archive)
```

### 6.2 Deploy with AWS CLI
```bash
# Build and push Docker image
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.ap-south-1.amazonaws.com

docker build -t treesense-backend ./backend
docker tag treesense-backend:latest \
  123456789.dkr.ecr.ap-south-1.amazonaws.com/treesense-backend:latest
docker push \
  123456789.dkr.ecr.ap-south-1.amazonaws.com/treesense-backend:latest

# Deploy ECS service
aws ecs update-service \
  --cluster treesense-cluster \
  --service treesense-backend \
  --force-new-deployment
```

---

## 7. Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "add tree table"

# Apply all migrations
alembic upgrade head

# Rollback one version
alembic downgrade -1

# View migration history
alembic history
```

---

## 8. Monitoring

| Service | URL | Credentials |
|---------|-----|-------------|
| API Docs (Swagger) | http://localhost:8000/docs | — |
| Grafana Dashboard | http://localhost:3000 | admin / admin2026 |
| Prometheus | http://localhost:9090 | — |
| Mosquitto Logs | `docker logs treesense-mqtt` | — |

### Key Grafana Panels
- **Node Health Overview** — all trees health score trends
- **Sensor Telemetry** — temperature, humidity, moisture time-series
- **Alert Volume** — alerts per hour, severity breakdown
- **Node Connectivity** — RSSI, battery, uptime per node
- **Carbon Sequestration** — CO₂ credits over time

---

## 9. Backup & Recovery

```bash
# Backup PostgreSQL
docker exec treesense-db pg_dump -U treesense treesense_ai > backup.sql

# Restore
docker exec -i treesense-db psql -U treesense treesense_ai < backup.sql

# Backup Redis
docker exec treesense-redis redis-cli BGSAVE
docker cp treesense-redis:/data/dump.rdb ./backup/redis-dump.rdb
```

---

## 10. Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| ESP32 can't connect to MQTT | Firewall blocking port 1883 | Open port in firewall/security group |
| Dashboard shows no data | Backend offline | Check `docker compose ps` |
| Database connection error | Wrong credentials in .env | Verify `DATABASE_URL` |
| High memory on Raspberry Pi | Too many processes | Reduce Celery workers |
| LoRa packet loss | Distance/interference | Adjust SF and TX power in config.h |

---

*© 2026 RGU Centre for Innovation and Incubation — Prof. Anjit Raja R*
