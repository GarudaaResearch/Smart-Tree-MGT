# API Reference
## TreeSense AI — REST API v1

**Base URL:** `http://localhost:8000/api/v1`
**Docs (Swagger):** `http://localhost:8000/docs`
**OpenAPI Schema:** `http://localhost:8000/openapi.json`

---

## Authentication

> All production endpoints require a Bearer token:
> ```
> Authorization: Bearer <your-jwt-token>
> ```

Obtain a token:
```http
POST /auth/token
Content-Type: application/json

{ "username": "admin", "password": "your-password" }
```

---

## Trees API

### List All Trees
```http
GET /api/v1/trees/
Query: page, size, zone, status, species
```
Returns paginated list of registered trees.

### Register a Tree
```http
POST /api/v1/trees/
Content-Type: application/json

{
  "tree_code":       "RGU-TBA-0010",
  "common_name":     "Neem Tree",
  "scientific_name": "Azadirachta indica",
  "latitude":        11.0168,
  "longitude":       76.9558,
  "zone":            "campus"
}
```

### Get Tree by Code
```http
GET /api/v1/trees/{tree_code}
```

### Update Tree
```http
PUT /api/v1/trees/{tree_code}
```

### Delete Tree
```http
DELETE /api/v1/trees/{tree_code}
```

### Tree Health Score
```http
GET /api/v1/trees/{tree_code}/health
```
Returns current AI-computed health score and status.

### GeoJSON Export (All Trees)
```http
GET /api/v1/trees/geojson/all
```
Returns FeatureCollection for GIS map rendering.

---

## Sensors API

### Ingest Sensor Reading (ESP32 → Server)
```http
POST /api/v1/sensors/ingest
Content-Type: application/json

{
  "tree_id":       "RGU-TBA-0001",
  "node_id":       "NODE-001",
  "temperature":   28.4,
  "humidity":      67.2,
  "soil_moisture": 45.3,
  "soil_ph":       6.5,
  "co2_ppm":       412,
  "lux":           8500,
  "battery_pct":   87,
  "signal_rssi":   -65,
  "comm_type":     "MQTT"
}
```

**Response:**
```json
{
  "status":      "accepted",
  "tree_id":     "RGU-TBA-0001",
  "violations":  [],
  "alert_count": 0,
  "timestamp":   "2026-05-12T09:00:00Z"
}
```

### Latest Reading
```http
GET /api/v1/sensors/latest/{tree_code}
```

### Historical Data
```http
GET /api/v1/sensors/history/{tree_code}?hours=24&limit=100
```

### Fleet Statistics
```http
GET /api/v1/sensors/stats/fleet
```

### Alert Thresholds
```http
GET  /api/v1/sensors/thresholds
PUT  /api/v1/sensors/thresholds
```

---

## Alerts API

### List Alerts
```http
GET /api/v1/alerts/
Query: severity, category, resolved, tree_code, limit, offset
```

### Active Alert Count
```http
GET /api/v1/alerts/active/count
```
```json
{ "total": 4, "critical": 2, "warning": 2, "info": 0 }
```

### Get Alert
```http
GET /api/v1/alerts/{alert_id}
```

### Resolve Alert
```http
POST /api/v1/alerts/{alert_id}/resolve
{ "notes": "Irrigation applied, moisture restored." }
```

### Resolve All
```http
POST /api/v1/alerts/resolve/all
```

### Create Manual Alert
```http
POST /api/v1/alerts/
Query: tree_code, severity, category, message, value, threshold
```

---

## AI API

### Run Health Assessment
```http
POST /api/v1/ai/assess
Content-Type: application/json

{ "tree_code": "RGU-TBA-0001" }
```
**Response:**
```json
{
  "tree_code":     "RGU-TBA-0001",
  "health_score":  87.3,
  "status":        "Healthy",
  "anomaly_score": 0.12,
  "disease_risk":  0.08,
  "disease_class": "healthy",
  "confidence":    0.94,
  "recommendations": ["Continue regular monitoring"],
  "timestamp":     "2026-05-12T09:00:00Z"
}
```

### Growth Forecast
```http
GET /api/v1/ai/forecast/{tree_code}?days=30
```

### Carbon Estimation
```http
GET /api/v1/ai/carbon/{tree_code}
```

### Fleet AI Summary
```http
GET /api/v1/ai/fleet/summary
```

---

## WebSocket — Live Data Stream

```
ws://localhost:8000/ws/live
```

**Subscribe to specific tree:**
```json
{ "action": "subscribe", "tree_id": "RGU-TBA-0001" }
```

**Incoming live message:**
```json
{
  "type":          "sensor_update",
  "tree_id":       "RGU-TBA-0001",
  "timestamp":     "2026-05-12T09:00:00Z",
  "temperature_c": 28.4,
  "humidity_pct":  67.2,
  "soil_moisture": 45.3,
  "health_score":  87.3
}
```

---

## MQTT Topics

| Topic | Direction | Description |
|-------|-----------|-------------|
| `treesense/{tree_id}/sensors` | Node → Server | Live sensor payload |
| `treesense/{tree_id}/alert`   | Server → Node | Threshold alert to node |
| `treesense/{tree_id}/config`  | Server → Node | Remote config update |
| `treesense/{tree_id}/status`  | Node → Server | Heartbeat / last will |
| `treesense/lora/{gw_id}`      | Gateway → Server | LoRa aggregated packet |

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Unauthorized — missing/invalid token |
| 403 | Forbidden — insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (duplicate tree_code) |
| 422 | Unprocessable entity |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Rate Limits

| Endpoint Group | Limit |
|---------------|-------|
| Sensor ingestion | 1,000 req/min per node |
| Read endpoints | 300 req/min per IP |
| AI assessment | 60 req/min |
| Alert creation | 100 req/min |

---

*© 2026 RGU Centre for Innovation and Incubation — Prof. Anjit Raja R*
