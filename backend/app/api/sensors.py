"""
TreeSense AI — Sensors API Router
Handles sensor data ingestion from ESP32/LoRa nodes and time-series queries.
Author: Prof. Anjit Raja R — RGU CII | Version: 1.0.0 | May 2026
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.future import select as async_select
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
from uuid import UUID
import json

router = APIRouter(tags=["Sensor Data"])


# ─── SCHEMAS ──────────────────────────────────────────────────────────────────

class SensorPayload(BaseModel):
    """Inbound sensor payload from ESP32 node (matches firmware JSON structure)."""
    tree_id:       str              = Field(..., description="Tree code e.g. RGU-TBA-0001")
    node_id:       Optional[str]   = None
    timestamp:     Optional[str]   = None

    # Environmental
    temperature:   Optional[float] = None
    humidity:      Optional[float] = None
    pressure:      Optional[float] = None
    wind_speed:    Optional[float] = None
    wind_dir:      Optional[float] = None
    rainfall_mm:   Optional[float] = None
    lux:           Optional[float] = None
    uv_index:      Optional[float] = None

    # Soil
    soil_moisture: Optional[float] = None
    soil_temp:     Optional[float] = None
    soil_ph:       Optional[float] = None
    soil_ec:       Optional[float] = None

    # NPK
    nitrogen:      Optional[float] = None
    phosphorus:    Optional[float] = None
    potassium:     Optional[float] = None

    # Air quality
    co2_ppm:       Optional[float] = None
    voc_ppb:       Optional[float] = None
    pm25:          Optional[float] = None
    pm10:          Optional[float] = None

    # Tree physiology
    trunk_vib_hz:  Optional[float] = None
    bark_temp:     Optional[float] = None
    leaf_wetness:  Optional[float] = None

    # Telemetry
    battery_pct:   Optional[float] = None
    signal_rssi:   Optional[int]   = None
    comm_type:     Optional[str]   = "MQTT"

    class Config:
        schema_extra = {
            "example": {
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
        }


class SensorReadingOut(BaseModel):
    id:            str
    tree_id:       str
    timestamp:     datetime
    temperature_c: Optional[float]
    humidity_pct:  Optional[float]
    soil_moisture: Optional[float]
    soil_ph:       Optional[float]
    co2_ppm:       Optional[float]
    lux:           Optional[float]
    health_score:  Optional[float]
    battery_pct:   Optional[float]
    signal_rssi:   Optional[int]
    comm_type:     Optional[str]

    class Config:
        orm_mode = True


# ─── THRESHOLD DEFINITIONS ────────────────────────────────────────────────────

THRESHOLDS = {
    "temperature":   {"min": 5,   "max": 42,  "unit": "°C"},
    "humidity":      {"min": 20,  "max": 95,  "unit": "%"},
    "soil_moisture": {"min": 20,  "max": 85,  "unit": "%"},
    "soil_ph":       {"min": 4.5, "max": 8.5, "unit": "pH"},
    "co2_ppm":       {"min": 300, "max": 600, "unit": "ppm"},
    "battery_pct":   {"min": 15,  "max": 100, "unit": "%"},
}


def check_thresholds(payload: SensorPayload) -> list:
    """Return list of threshold violations for alert generation."""
    violations = []
    checks = {
        "temperature":   payload.temperature,
        "humidity":      payload.humidity,
        "soil_moisture": payload.soil_moisture,
        "soil_ph":       payload.soil_ph,
        "co2_ppm":       payload.co2_ppm,
        "battery_pct":   payload.battery_pct,
    }
    for param, value in checks.items():
        if value is None:
            continue
        th = THRESHOLDS.get(param, {})
        if th.get("min") and value < th["min"]:
            violations.append({
                "param": param, "value": value,
                "threshold": th["min"], "type": "low",
                "severity": "warning" if value > th["min"] * 0.8 else "critical"
            })
        if th.get("max") and value > th["max"]:
            violations.append({
                "param": param, "value": value,
                "threshold": th["max"], "type": "high",
                "severity": "warning" if value < th["max"] * 1.2 else "critical"
            })
    return violations


# ─── ENDPOINTS ────────────────────────────────────────────────────────────────

@router.post("/ingest", summary="Ingest sensor reading from ESP32 node")
async def ingest_sensor_data(
    payload: SensorPayload,
    background_tasks: BackgroundTasks,
):
    """
    Primary ingestion endpoint for ESP32 IoT nodes.
    Accepts sensor JSON, validates thresholds, queues AI scoring.
    """
    # Threshold checks
    violations = check_thresholds(payload)

    # In production: persist to DB and run AI scoring asynchronously
    # background_tasks.add_task(run_ai_scoring, reading_id, payload)
    # background_tasks.add_task(emit_websocket_update, payload)

    return {
        "status":     "accepted",
        "tree_id":    payload.tree_id,
        "violations": violations,
        "alert_count": len(violations),
        "timestamp":  datetime.utcnow().isoformat() + "Z",
    }


@router.get("/latest/{tree_code}", summary="Latest sensor reading for a tree")
async def get_latest_reading(tree_code: str):
    """Return the most recent sensor reading for a given tree."""
    # In production, query DB: SELECT * FROM sensor_readings WHERE tree_id=... ORDER BY timestamp DESC LIMIT 1
    from random import uniform, randint
    return {
        "tree_code":     tree_code,
        "timestamp":     datetime.utcnow().isoformat() + "Z",
        "temperature_c": round(uniform(22, 38), 1),
        "humidity_pct":  round(uniform(40, 90), 1),
        "soil_moisture": round(uniform(25, 75), 1),
        "soil_ph":       round(uniform(5.5, 7.5), 2),
        "co2_ppm":       randint(370, 520),
        "lux":           randint(1000, 12000),
        "wind_speed_ms": round(uniform(0, 12), 1),
        "rainfall_mm":   round(uniform(0, 3), 1),
        "health_score":  round(uniform(50, 98), 1),
        "battery_pct":   randint(40, 100),
        "signal_rssi":   randint(-85, -40),
        "comm_type":     "MQTT",
    }


@router.get("/history/{tree_code}", summary="Historical readings for a tree")
async def get_history(
    tree_code: str,
    hours:     int = Query(24, ge=1, le=720, description="Hours of history"),
    limit:     int = Query(100, ge=1, le=1000),
):
    """Return time-series sensor history. Production: TimescaleDB query."""
    from random import uniform, randint
    now = datetime.utcnow()
    readings = []
    for i in range(min(limit, hours * 2)):
        ts = now - timedelta(minutes=i * 30)
        readings.append({
            "timestamp":     ts.isoformat() + "Z",
            "temperature_c": round(25 + 5 * (i % 8) / 8, 1),
            "humidity_pct":  round(60 + 15 * ((i + 3) % 8) / 8, 1),
            "soil_moisture": round(45 + 20 * ((i + 1) % 6) / 6, 1),
            "co2_ppm":       randint(380, 480),
            "lux":           max(0, 8000 - i * 50),
            "health_score":  round(uniform(70, 95), 1),
        })
    return {
        "tree_code": tree_code,
        "period_hours": hours,
        "count":     len(readings),
        "readings":  readings,
    }


@router.get("/stats/fleet", summary="Fleet-wide sensor statistics")
async def fleet_stats():
    """Aggregated statistics across all active tree nodes."""
    from random import uniform, randint
    return {
        "total_nodes":    5,
        "online_nodes":   4,
        "offline_nodes":  1,
        "readings_today": randint(1200, 2000),
        "avg_health":     round(uniform(62, 88), 1),
        "alerts_active":  randint(0, 8),
        "avg_battery":    round(uniform(65, 90), 1),
        "avg_signal_rssi": randint(-75, -50),
        "last_update":    datetime.utcnow().isoformat() + "Z",
    }


@router.get("/thresholds", summary="Get alert threshold definitions")
async def get_thresholds():
    """Return configured sensor alert thresholds."""
    return {"thresholds": THRESHOLDS}


@router.put("/thresholds", summary="Update alert thresholds")
async def update_thresholds(new_thresholds: dict):
    """Update threshold values (admin only in production)."""
    THRESHOLDS.update(new_thresholds)
    return {"status": "updated", "thresholds": THRESHOLDS}
