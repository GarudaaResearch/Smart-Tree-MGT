# System Architecture Document
## AI-Driven IoT Framework for Tree Behaviour Analysis

**Document Version:** 1.0 | **Date:** May 2026

---

## 1. Architecture Overview

The system follows a **5-Layer Edge-to-Cloud Architecture** designed for scalability, reliability, and real-time performance.

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5 — PRESENTATION LAYER                                   │
│  Web Dashboard (React) | Mobile App (Flutter) | GIS Maps        │
│  QR Tree Profiles | Research Export | Power BI / Grafana        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│  LAYER 4 — AI & ANALYTICS LAYER                                 │
│  TensorFlow Health Models | YOLOv8 Disease Detection            │
│  LSTM Growth Forecaster | Anomaly Detector | Carbon Estimator   │
│  Scikit-learn Ensemble | Edge TFLite Inference                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API / gRPC
┌────────────────────────────▼────────────────────────────────────┐
│  LAYER 3 — CLOUD PLATFORM LAYER                                 │
│  FastAPI Backend | AWS IoT Core / GCP IoT Hub                   │
│  MQTT Broker (Mosquitto) | Kafka Streams                        │
│  PostgreSQL | MongoDB Atlas | InfluxDB | Firebase               │
│  Redis Cache | S3 / GCS Object Storage                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ MQTT / LoRaWAN / GSM / NB-IoT
┌────────────────────────────▼────────────────────────────────────┐
│  LAYER 2 — EDGE GATEWAY LAYER                                   │
│  Raspberry Pi 4B (per cluster of 10 trees)                      │
│  Edge AI Inference (TFLite) | Local MQTT Broker                 │
│  Data Buffering | OTA Update Manager | GPS Sync                 │
└────────────────────────────┬────────────────────────────────────┘
                             │ LoRa / I2C / SPI / UART
┌────────────────────────────▼────────────────────────────────────┐
│  LAYER 1 — SENSOR NODE LAYER                                    │
│  ESP32 Smart Tree Node (per tree)                               │
│  18 Sensors | GPS Module | Camera | Solar + Battery             │
│  LoRa SX1276 | Deep Sleep / Wake Cycle                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Smart Tree Sensor Node (ESP32)

```
┌──────────────────────────────────────────────────────┐
│                    ESP32 NODE                        │
│                                                      │
│  ┌──────────┐    ┌─────────────────────────────┐    │
│  │  SENSORS │    │  COMMUNICATION              │    │
│  │ DHT22    │    │  LoRa SX1276 (primary)       │    │
│  │ BME280   │    │  GSM SIM800L (backup)        │    │
│  │ SoilMoi  │    │  WiFi ESP32 (local)          │    │
│  │ pH       │    └─────────────────────────────┘    │
│  │ NPK      │                                        │
│  │ CO2      │    ┌─────────────────────────────┐    │
│  │ AQI      │    │  POWER MANAGEMENT           │    │
│  │ BH1750   │    │  Solar Panel (10W)           │    │
│  │ MPU6050  │    │  LiPo Battery (10,000mAh)    │    │
│  │ Rain     │    │  MPPT Controller             │    │
│  │ Therm    │    │  Deep Sleep (5min cycle)     │    │
│  │ Ultrasn  │    └─────────────────────────────┘    │
│  │ Camera   │                                        │
│  │ GPS      │    ┌─────────────────────────────┐    │
│  └──────────┘    │  STORAGE                    │    │
│                  │  MicroSD Card (local buffer)│    │
│                  │  EEPROM (config/ID)          │    │
│                  └─────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### 2.2 Edge Gateway (Raspberry Pi 4B)

Each gateway serves a **cluster of 10 tree nodes** within 2km LoRa range.

**Responsibilities:**
- Receive LoRa packets from ESP32 nodes
- Run local MQTT broker (Mosquitto)
- Execute TFLite edge AI models for instant alerts
- Buffer data during cloud disconnection (SQLite)
- Forward processed data to cloud via MQTT/HTTPS
- OTA firmware update distribution
- GPS-based cluster synchronization

### 2.3 Cloud Platform

```
               ┌─────────────────┐
               │   AWS IoT Core  │  ← MQTT Endpoint
               └────────┬────────┘
                        │
          ┌─────────────▼──────────────┐
          │      Message Router        │
          │  (AWS IoT Rules Engine)    │
          └──┬──────────┬─────────────┘
             │          │          
    ┌────────▼──┐  ┌────▼────────┐
    │  InfluxDB │  │  Kinesis    │
    │ (raw time │  │  Streams    │
    │  series)  │  │  (realtime) │
    └────────┬──┘  └────┬────────┘
             │          │
    ┌────────▼──────────▼────────┐
    │     FastAPI Backend        │
    │   (Python + Uvicorn)       │
    └──┬────────┬────────┬───────┘
       │        │        │
  ┌────▼──┐ ┌──▼────┐ ┌──▼──────┐
  │Postgres│ │MongoDB│ │ Redis   │
  │(users,│ │(tree  │ │(cache,  │
  │ trees)│ │history│ │sessions)│
  └────────┘ └───────┘ └─────────┘
```

---

## 3. Data Flow Architecture

### 3.1 Real-Time Sensor Data Flow

```
[ESP32 Node] → [LoRa 915MHz] → [RPi Gateway]
    → [Edge AI Check] → [Local MQTT]
    → [Cloud MQTT: aws-iot-endpoint:8883]
    → [IoT Rules Engine] → [InfluxDB] + [Kinesis]
    → [FastAPI Consumer] → [AI Analysis]
    → [WebSocket Push] → [React Dashboard]
    → [Mobile Push Notification] (if alert)
```

### 3.2 Image / Camera Data Flow

```
[ESP32 Camera (OV2640)] → [JPEG Capture on trigger]
    → [LoRa: fragmented packet OR GSM upload]
    → [RPi Gateway: reassemble + pre-process]
    → [Edge YOLOv8-tiny: quick check]
    → [S3 / GCS bucket: image storage]
    → [Cloud YOLOv8-full: detailed analysis]
    → [Disease Report + Alert generation]
    → [Dashboard + Mobile App display]
```

### 3.3 Alert Decision Flow

```
Sensor Reading → Edge Threshold Check
    ├─ CRITICAL → Instant local alert + GSM SMS
    ├─ WARNING  → Cloud AI model analysis
    │               → Confirmed? → Push notification + Dashboard alert
    │               → False positive? → Log and continue
    └─ NORMAL   → Archive to InfluxDB + trend analysis
```

---

## 4. Network Topology

### 4.1 LoRaWAN Mesh Network

```
[Tree 1]──┐
[Tree 2]──┤                    ┌─────────────────┐
[Tree 3]──┼──[LoRa]──[Gateway 1]──[4G/Ethernet]──│                 │
[Tree 4]──┤                    │                 │
[Tree 5]──┘                    │   CLOUD BACKEND │
                               │                 │
[Tree 6]──┐                    │                 │
[Tree 7]──┤                    │                 │
[Tree 8]──┼──[LoRa]──[Gateway 2]──[4G/Ethernet]──│                 │
[Tree 9]──┤                    │                 │
[Tree 10]─┘                    └─────────────────┘
```

### 4.2 Communication Protocols

| Protocol | Use Case | Layer | Range |
|---------|---------|-------|-------|
| LoRa 915MHz | Node → Gateway | Physical | 2–15 km |
| MQTT | Gateway → Cloud | Application | Internet |
| WebSocket | Cloud → Dashboard | Application | Internet |
| REST/HTTPS | Mobile → Cloud | Application | Internet |
| BLE 5.0 | Config/Setup | Physical | 10m |
| GSM/NB-IoT | Backup uplink | Physical | National |

---

## 5. Security Architecture

### 5.1 Security Layers

```
[Device Level]
  - Unique device certificate (X.509)
  - Hardware security key (ATECC608A)
  - Encrypted firmware (AES-128)
  - Secure boot + code signing

[Transport Level]
  - TLS 1.3 for all communications
  - MQTT over TLS (port 8883)
  - Certificate pinning in mobile app

[Application Level]
  - JWT-based authentication
  - Role-Based Access Control (RBAC)
  - API rate limiting
  - Input validation / SQL injection protection

[Data Level]
  - AES-256 encryption at rest
  - Field-level encryption for PII
  - Automatic backup every 6 hours
  - Point-in-time recovery (30 days)
```

### 5.2 RBAC Roles

| Role | Permissions |
|------|------------|
| Super Admin | Full system access, user management |
| Researcher | Read all data, export datasets |
| Field Officer | View assigned trees, update records |
| Viewer | Read-only dashboard access |
| Mobile User | QR scan, view public tree profile |

---

## 6. Scalability Design

### 6.1 Horizontal Scaling

- **Sensor Nodes**: Add nodes independently (plug-and-play LoRa registration)
- **Gateways**: Deploy additional RPi gateways to extend coverage
- **Backend**: Kubernetes auto-scaling based on MQTT throughput
- **Database**: InfluxDB clustering, MongoDB Atlas M30+ sharding
- **AI Models**: GPU instances on AWS SageMaker for batch inference

### 6.2 Capacity Planning

| Scale | Nodes | Gateways | Cloud Instance | DB Storage/Year |
|-------|-------|----------|---------------|----------------|
| Pilot | 50 | 5 | t3.medium | 2 GB |
| Campus | 200 | 20 | t3.large | 8 GB |
| City | 5,000 | 500 | c5.2xlarge (×3) | 200 GB |
| National | 100,000 | 10,000 | c5.4xlarge (×10) | 4 TB |

---

## 7. Technology Stack (Detailed)

### Frontend
```
React 18 + Vite
├── Chart.js 4 (sensor graphs)
├── Leaflet.js / Google Maps API (GIS)
├── Socket.io-client (real-time updates)
├── Axios (API calls)
├── QRCode.js (QR generation)
└── Tailwind CSS (styling)
```

### Backend
```
FastAPI (Python 3.11)
├── Pydantic v2 (data validation)
├── SQLAlchemy 2 (ORM)
├── Celery + Redis (task queue)
├── paho-mqtt (MQTT client)
├── influxdb-client (time-series)
└── motor (async MongoDB)
```

### AI/ML Stack
```
Training:
├── TensorFlow 2.15 / Keras
├── PyTorch 2.1
├── Scikit-learn 1.4
├── OpenCV 4.9
└── Ultralytics YOLOv8

Deployment:
├── TFLite (Edge/RPi)
├── ONNX Runtime (Cloud)
└── FastAPI model serving
```

### Database
```
PostgreSQL 16    → Users, trees, metadata, roles
MongoDB Atlas    → Tree history, sensor logs, reports
InfluxDB 2.7    → Real-time time-series sensor data
Firebase RTDB   → Mobile real-time sync
Redis 7.2       → Sessions, cache, pub/sub
S3 / GCS        → Images, model artifacts, exports
```

---

*Document Version 1.0 | TBA-2026-RGU | System Architecture*
