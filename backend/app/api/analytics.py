"""TreeSense AI — Analytics API Router (Local Mock)"""
from fastapi import APIRouter, Query
from datetime import datetime, timedelta
from random import uniform, randint

router = APIRouter()

@router.get("/health-trends", summary="Health score trends over time")
async def health_trends(days: int = Query(7, ge=1, le=90)):
    now = datetime.utcnow()
    data = []
    for i in range(days):
        ts = now - timedelta(days=days - i)
        data.append({
            "date": ts.strftime("%Y-%m-%d"),
            "avg_health": round(uniform(60, 92), 1),
            "min_health": round(uniform(28, 55), 1),
            "max_health": round(uniform(88, 99), 1),
            "critical_count": randint(0, 3),
        })
    return {"period_days": days, "data": data}

@router.get("/species-distribution", summary="Tree species breakdown")
async def species_distribution():
    return {
        "species": [
            {"name": "Banyan Tree",       "scientific": "Ficus benghalensis",   "count": 12, "avg_health": 82.4},
            {"name": "Teak",              "scientific": "Tectona grandis",       "count": 8,  "avg_health": 75.1},
            {"name": "Mango",             "scientific": "Mangifera indica",      "count": 15, "avg_health": 68.9},
            {"name": "Royal Poinciana",   "scientific": "Delonix regia",         "count": 5,  "avg_health": 45.3},
            {"name": "Neem",              "scientific": "Azadirachta indica",    "count": 10, "avg_health": 88.7},
        ]
    }

@router.get("/zone-summary", summary="Health by campus zone")
async def zone_summary():
    return {
        "zones": [
            {"zone": "campus_east",   "trees": 12, "avg_health": 79.2, "alerts": 1},
            {"zone": "campus_west",   "trees": 8,  "avg_health": 65.4, "alerts": 3},
            {"zone": "campus_north",  "trees": 10, "avg_health": 84.1, "alerts": 0},
            {"zone": "campus_south",  "trees": 6,  "avg_health": 52.8, "alerts": 4},
            {"zone": "urban_street",  "trees": 14, "avg_health": 61.3, "alerts": 2},
        ]
    }

@router.get("/disease-risk", summary="AI disease risk summary")
async def disease_risk():
    return {
        "high_risk": [
            {"tree_code": "RGU-TBA-0005", "name": "Royal Poinciana", "risk_pct": 61, "disease": "Fungal Blight"},
            {"tree_code": "RGU-TBA-0003", "name": "Mango Tree",      "risk_pct": 47, "disease": "Anthracnose"},
        ],
        "medium_risk": [
            {"tree_code": "RGU-TBA-0002", "name": "Teak",            "risk_pct": 28, "disease": "Root Rot"},
        ],
        "low_risk_count": 47,
        "scan_timestamp": datetime.utcnow().isoformat() + "Z",
    }

@router.get("/sensor-heatmap", summary="Sensor parameter heatmap data")
async def sensor_heatmap(parameter: str = Query("temperature", description="temperature|humidity|soil_moisture|co2_ppm")):
    trees = [
        {"tree_code": "RGU-TBA-0001", "lat": 11.0168, "lon": 76.9558, "value": round(uniform(22, 38), 1)},
        {"tree_code": "RGU-TBA-0002", "lat": 11.0174, "lon": 76.9563, "value": round(uniform(22, 38), 1)},
        {"tree_code": "RGU-TBA-0003", "lat": 11.0162, "lon": 76.9551, "value": round(uniform(22, 38), 1)},
        {"tree_code": "RGU-TBA-0004", "lat": 11.0180, "lon": 76.9570, "value": round(uniform(22, 38), 1)},
        {"tree_code": "RGU-TBA-0005", "lat": 11.0155, "lon": 76.9545, "value": round(uniform(22, 38), 1)},
    ]
    return {"parameter": parameter, "unit": "°C", "data": trees, "timestamp": datetime.utcnow().isoformat() + "Z"}
