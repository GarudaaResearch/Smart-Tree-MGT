-- ============================================================
-- TreeSense AI — Seed Data (Sample Trees & Readings)
-- Project: AI-Driven IoT Framework for Tree Behaviour Analysis
-- Author: Prof. Anjit Raja R — RGU CII | Version: 1.0.0
-- Run: psql -U treesense -d treesense_ai -f seed_data.sql
-- ============================================================

-- ─── Sample Trees ──────────────────────────────────────────
INSERT INTO trees (
  tree_code, common_name, scientific_name, family,
  age_years, height_m, girth_cm, canopy_spread_m,
  latitude, longitude, altitude_m, location_name, zone,
  health_score, status, planted_by, notes
) VALUES
(
  'RGU-TBA-0001', 'Banyan Tree', 'Ficus benghalensis', 'Moraceae',
  45, 18.5, 320, 22.0,
  11.0168, 76.9558, 420, 'RGU Main Campus — Block A', 'campus',
  87.3, 'Healthy', 'RGU Horticulture Dept.',
  'Landmark tree at campus entrance. Multi-stemmed aerial roots visible.'
),
(
  'RGU-TBA-0002', 'Teak Tree', 'Tectona grandis', 'Lamiaceae',
  28, 22.0, 185, 14.0,
  11.0182, 76.9571, 418, 'RGU Campus — Nursery Zone', 'campus',
  62.4, 'Moderate', 'Tamil Nadu Forest Dept.',
  'Planted as part of 2000 green campus initiative.'
),
(
  'RGU-TBA-0003', 'Mango Tree', 'Mangifera indica', 'Anacardiaceae',
  35, 12.0, 210, 16.0,
  11.0155, 76.9545, 422, 'RGU Campus — Staff Quarters Road', 'campus',
  45.1, 'Stressed', 'Prof. Anjit Raja R',
  'Shows signs of root compaction. Soil pH drift observed.'
),
(
  'RGU-TBA-0004', 'Neem Tree', 'Azadirachta indica', 'Meliaceae',
  20, 14.5, 155, 12.0,
  11.0175, 76.9532, 419, 'RGU Campus — Parking Lot North', 'campus',
  91.2, 'Healthy', 'RGU Green Cell Initiative 2006',
  'Excellent health. Used as urban heat island reduction specimen.'
),
(
  'RGU-TBA-0005', 'Royal Poinciana', 'Delonix regia', 'Fabaceae',
  12, 10.0, 130, 18.0,
  11.0161, 76.9580, 421, 'RGU Campus — Main Road Median', 'campus',
  28.5, 'Critical', 'City Corporation',
  'CRITICAL: Fungal infection suspected. Canopy dieback. Requires arborist.'
);

-- ─── Sample Sensor Readings ────────────────────────────────
-- Banyan Tree (Healthy)
INSERT INTO sensor_readings (
  tree_id, timestamp,
  temperature_c, humidity_pct, pressure_hpa,
  wind_speed_ms, rainfall_mm, lux,
  soil_moisture, soil_temp_c, soil_ph, soil_ec,
  nitrogen, phosphorus, potassium,
  co2_ppm, pm25, pm10,
  trunk_vib_hz, bark_temp_c, leaf_wetness,
  health_score, anomaly_score, disease_risk,
  battery_pct, signal_rssi, comm_type
)
SELECT
  t.id,
  NOW() - (n || ' minutes')::interval,
  26.5 + random()*4,
  65 + random()*15,
  1010 + random()*10,
  1 + random()*5, 0, 8000 + random()*2000,
  48 + random()*10, 27 + random()*3, 6.5 + random()*0.5, 0.8 + random()*0.3,
  28 + random()*8, 12 + random()*5, 180 + random()*40,
  400 + random()*50, 8 + random()*5, 15 + random()*10,
  0.2 + random()*0.3, 29 + random()*3, 10 + random()*15,
  85 + random()*8, 0.05 + random()*0.1, 0.05 + random()*0.1,
  80 + random()*15, -55 + random()*10, 'MQTT'
FROM trees t, generate_series(0, 47, 1) AS n
WHERE t.tree_code = 'RGU-TBA-0001';

-- Mango Tree (Stressed)
INSERT INTO sensor_readings (
  tree_id, timestamp,
  temperature_c, humidity_pct,
  soil_moisture, soil_ph, co2_ppm,
  health_score, anomaly_score, disease_risk,
  battery_pct, signal_rssi, comm_type
)
SELECT
  t.id,
  NOW() - (n || ' minutes')::interval,
  31 + random()*6,
  42 + random()*15,
  18 + random()*12, 5.2 + random()*0.8, 460 + random()*80,
  42 + random()*10, 0.45 + random()*0.2, 0.55 + random()*0.15,
  65 + random()*20, -72 + random()*15, 'MQTT'
FROM trees t, generate_series(0, 47, 1) AS n
WHERE t.tree_code = 'RGU-TBA-0003';

-- Royal Poinciana (Critical)
INSERT INTO sensor_readings (
  tree_id, timestamp,
  temperature_c, humidity_pct,
  soil_moisture, soil_ph, co2_ppm,
  health_score, anomaly_score, disease_risk,
  battery_pct, signal_rssi, comm_type
)
SELECT
  t.id,
  NOW() - (n || ' minutes')::interval,
  33 + random()*5,
  38 + random()*12,
  14 + random()*8, 4.8 + random()*0.6, 520 + random()*100,
  25 + random()*8, 0.72 + random()*0.2, 0.75 + random()*0.15,
  32 + random()*20, -82 + random()*12, 'LoRa'
FROM trees t, generate_series(0, 47, 1) AS n
WHERE t.tree_code = 'RGU-TBA-0005';

-- ─── Sample Alerts ─────────────────────────────────────────
INSERT INTO alerts (
  tree_id, severity, category, message,
  value, threshold, is_resolved
)
SELECT id, 'critical', 'health',
  'Critical health score 28/100 on Royal Poinciana — emergency intervention needed.',
  28.5, 30.0, false
FROM trees WHERE tree_code = 'RGU-TBA-0005';

INSERT INTO alerts (
  tree_id, severity, category, message,
  value, threshold, is_resolved
)
SELECT id, 'warning', 'soil',
  'Low soil moisture 18% on Mango Tree — irrigation recommended.',
  18.0, 20.0, false
FROM trees WHERE tree_code = 'RGU-TBA-0003';

INSERT INTO alerts (
  tree_id, severity, category, message,
  value, threshold, is_resolved
)
SELECT id, 'critical', 'disease',
  'AI disease risk 76% on Royal Poinciana — fungal infection suspected.',
  76.0, 50.0, false
FROM trees WHERE tree_code = 'RGU-TBA-0005';

INSERT INTO alerts (
  tree_id, severity, category, message,
  value, threshold, is_resolved, resolved_at
)
SELECT id, 'info', 'weather',
  'High temperature 38.5°C on Neem Tree — monitoring hydration.',
  38.5, 38.0, true, NOW() - interval '2 hours'
FROM trees WHERE tree_code = 'RGU-TBA-0004';

-- ─── Verify ────────────────────────────────────────────────
SELECT
  t.tree_code,
  t.common_name,
  t.health_score,
  t.status,
  COUNT(sr.id) AS readings,
  COUNT(a.id)  AS alerts
FROM trees t
LEFT JOIN sensor_readings sr ON sr.tree_id = t.id
LEFT JOIN alerts a ON a.tree_id = t.id
GROUP BY t.id, t.tree_code, t.common_name, t.health_score, t.status
ORDER BY t.health_score DESC;
