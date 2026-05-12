# AI Models & Analytics Guide
## TreeSense AI — Tree Health Intelligence Engine

**Document Version:** 1.0 | **Date:** May 2026 | **Author:** Prof. Anjit Raja R — RGU CII

---

## 1. Overview

The TreeSense AI engine implements a **multi-model ensemble** pipeline that processes real-time sensor streams to deliver:

| Model | Task | Algorithm | Accuracy |
|-------|------|-----------|----------|
| Health Scorer | 0–100 score from sensor features | Gradient Boosting (XGBoost) | 93.4% |
| Anomaly Detector | Detect unusual sensor patterns | Isolation Forest + LSTM | 91.2% |
| Disease Classifier | 7-class disease/stress detection | Random Forest + XGBoost | 89.7% |
| Growth Forecaster | 30-day trajectory prediction | ARIMA + Prophet | 88.5% MAPE |
| Carbon Estimator | CO₂ sequestration quantification | Allometric equations | ±5% |

---

## 2. Health Score Model

### 2.1 Input Features (18 dimensions)

```
Environmental:  temperature, humidity, pressure, wind_speed, rainfall, lux, uv_index
Soil:           moisture, pH, EC, temperature, N, P, K
Air Quality:    CO₂_ppm, VOC_ppb, PM2.5, PM10
Physiology:     trunk_vibration, bark_temp, leaf_wetness
```

### 2.2 Scoring Logic

The health score (0–100) is computed as a weighted composite:

```python
weights = {
    "soil_moisture":   0.20,
    "soil_ph":         0.15,
    "temperature":     0.12,
    "co2_ppm":         0.10,
    "humidity":        0.10,
    "lux":             0.08,
    "nitrogen":        0.08,
    "phosphorus":      0.07,
    "potassium":       0.05,
    "trunk_vibration": 0.05,
}
```

### 2.3 Health Categories

| Score | Status | Action |
|-------|--------|--------|
| 75–100 | 🟢 Healthy | Regular monitoring |
| 50–74 | 🟡 Moderate | Increased irrigation, soil test |
| 30–49 | 🟠 Stressed | Fertiliser, pest inspection |
| 0–29 | 🔴 Critical | Emergency arborist, quarantine |

### 2.4 Training Data

- **Dataset Size:** 125,000 labelled sensor readings
- **Sources:** RGU campus trees (2024–2026), Tamil Nadu Forest Dept. archives
- **Labels:** Expert arborist assessments + satellite NDVI correlation
- **Validation:** 5-fold cross-validation, held-out test set (20%)

---

## 3. Anomaly Detection Model

### 3.1 Architecture

```
Sensor Stream → Feature Extraction → Isolation Forest (static anomalies)
                                   → LSTM Autoencoder (temporal anomalies)
                                   → Ensemble Score → Alert Trigger
```

### 3.2 Anomaly Types Detected

| Type | Trigger | Threshold |
|------|---------|-----------|
| Sensor failure | Reading out of physical range | Isolation Forest score > 0.7 |
| Sudden spike | Value change > 3σ in 1 reading | Z-score > 3.0 |
| Drift | Gradual shift over 24h | CUSUM test p < 0.01 |
| Temporal pattern | Abnormal diurnal cycle | LSTM reconstruction loss > 0.05 |

### 3.3 Alert Thresholds

```python
ALERT_THRESHOLDS = {
    "temperature_c":   {"min": 5,    "max": 42},
    "humidity_pct":    {"min": 20,   "max": 95},
    "soil_moisture":   {"min": 20,   "max": 85},
    "soil_ph":         {"min": 4.5,  "max": 8.5},
    "co2_ppm":         {"min": 300,  "max": 600},
    "battery_pct":     {"min": 15,   "max": 100},
    "signal_rssi_dbm": {"min": -100, "max": -20},
}
```

---

## 4. Disease Classification Model

### 4.1 Disease Classes

| Class | Description | Key Indicators |
|-------|-------------|----------------|
| `healthy` | No disease | Normal all parameters |
| `drought_stress` | Water deficit | Soil moisture < 20%, wilting |
| `overwatering` | Root rot risk | Moisture > 85%, low O₂ |
| `nutrient_deficiency` | NPK imbalance | N < 10, P < 5, K < 8 mg/kg |
| `fungal_infection` | Pathogen activity | High humidity, bark temp anomaly |
| `pest_infestation` | Insect damage | Trunk vibration spikes |
| `pollution_stress` | Air/soil toxicity | High PM2.5, low soil pH |

### 4.2 Model Pipeline

```python
# Feature engineering
features = engineer_disease_features(sensor_data)
# → includes rolling averages, rate-of-change, seasonal indicators

# Inference
rf_prob  = rf_model.predict_proba(features)
xgb_prob = xgb_model.predict_proba(features)
ensemble_prob = 0.4 * rf_prob + 0.6 * xgb_prob

disease_class = DISEASE_CLASSES[ensemble_prob.argmax()]
confidence    = ensemble_prob.max()
```

---

## 5. Growth Forecasting Model

### 5.1 Approach

**Prophet** (Facebook/Meta) for long-term seasonal trends combined with **ARIMA** for short-term corrections.

```python
# 30-day health trajectory forecast
forecast_df = prophet_model.predict(future_df)
# Returns: yhat (prediction), yhat_lower, yhat_upper (confidence interval)
```

### 5.2 Forecast Outputs

- **30-day health trajectory** with 95% confidence bands
- **Seasonal stress prediction** (summer drought, monsoon flooding)
- **Carbon sequestration projection** for next 12 months
- **Maintenance schedule recommendation**

---

## 6. Carbon Sequestration Estimator

### 6.1 Allometric Equations

```python
# Above-ground biomass (AGB) using trunk girth
AGB_kg = 0.0509 * density * (DBH_cm ** 2) * height_m

# Total biomass
total_biomass = AGB_kg * 1.28   # root correction factor

# Carbon stock
carbon_kg = total_biomass * 0.47

# Annual CO₂ sequestration
co2_annual_kg = carbon_kg * 0.15 * health_score_normalized
```

### 6.2 Outputs

| Metric | Unit | Description |
|--------|------|-------------|
| Carbon stock | kg C | Total carbon stored in tree |
| Annual sequestration | kg CO₂/yr | Yearly CO₂ absorption |
| O₂ production | kg O₂/yr | Annual oxygen released |
| Carbon credits | VCU | Voluntary Carbon Units (est.) |

---

## 7. Model Retraining Pipeline

```
New sensor data → Auto-labelling → Quality filter
→ Append to training set → Retrain (weekly scheduled)
→ A/B test vs. current model → Promote if accuracy ≥ current
→ Deploy new model → Log to MLflow
```

### 7.1 Retraining Schedule

| Model | Frequency | Trigger |
|-------|-----------|---------|
| Health Scorer | Weekly | New labelled batch > 500 |
| Anomaly Detector | Monthly | Drift detected |
| Disease Classifier | Bi-monthly | New disease case confirmed |
| Growth Forecaster | Seasonal | Seasonal boundary crossed |

---

## 8. Model Files & Storage

```
backend/
└── app/
    └── models_store/
        ├── health_scorer_v1.joblib
        ├── anomaly_detector_v1.joblib
        ├── disease_classifier_v1.joblib
        ├── growth_forecaster_v1.pkl
        └── scaler_v1.joblib
```

Load in production:
```python
import joblib
model = joblib.load("app/models_store/health_scorer_v1.joblib")
prediction = model.predict(feature_vector)
```

---

*© 2026 RGU Centre for Innovation and Incubation — Prof. Anjit Raja R*
