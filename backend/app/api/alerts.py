"""
TreeSense AI — Alerts API Router
Manages alert creation, retrieval, resolution, and notification dispatch.
Author: Prof. Anjit Raja R — RGU CII | Version: 1.0.0 | May 2026
"""

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID, uuid4

router = APIRouter(prefix="/alerts", tags=["Alerts"])


# ─── SCHEMAS ──────────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id:          str
    tree_id:     str
    tree_code:   str
    severity:    str   # info | warning | critical
    category:    str   # health | soil | weather | disease | battery | connectivity
    message:     str
    value:       Optional[float]
    threshold:   Optional[float]
    is_resolved: bool
    created_at:  str
    resolved_at: Optional[str]


class AlertResolveRequest(BaseModel):
    notes: Optional[str] = None


# ─── MOCK STORE (Replace with DB in production) ───────────────────────────────

MOCK_ALERTS: List[dict] = [
    {
        "id": str(uuid4()), "tree_id": "tree-001", "tree_code": "RGU-TBA-0005",
        "severity": "critical", "category": "health",
        "message": "Critical health score 28/100 — Royal Poinciana requires immediate intervention.",
        "value": 28.0, "threshold": 30.0, "is_resolved": False,
        "created_at": "2026-05-12T08:00:00Z", "resolved_at": None
    },
    {
        "id": str(uuid4()), "tree_id": "tree-002", "tree_code": "RGU-TBA-0003",
        "severity": "warning", "category": "soil",
        "message": "Low soil moisture 18% detected on Mango Tree — irrigation recommended.",
        "value": 18.0, "threshold": 20.0, "is_resolved": False,
        "created_at": "2026-05-12T09:15:00Z", "resolved_at": None
    },
    {
        "id": str(uuid4()), "tree_id": "tree-003", "tree_code": "RGU-TBA-0002",
        "severity": "warning", "category": "battery",
        "message": "Low battery 14% on node TEAK-NODE-002 — recharge or replace required.",
        "value": 14.0, "threshold": 15.0, "is_resolved": False,
        "created_at": "2026-05-12T10:30:00Z", "resolved_at": None
    },
    {
        "id": str(uuid4()), "tree_id": "tree-004", "tree_code": "RGU-TBA-0001",
        "severity": "info", "category": "weather",
        "message": "High temperature 38.2°C recorded — monitor Banyan Tree hydration.",
        "value": 38.2, "threshold": 38.0, "is_resolved": True,
        "created_at": "2026-05-11T14:00:00Z", "resolved_at": "2026-05-11T16:00:00Z"
    },
    {
        "id": str(uuid4()), "tree_id": "tree-005", "tree_code": "RGU-TBA-0003",
        "severity": "critical", "category": "disease",
        "message": "AI disease risk 61% detected on Mango Tree — fungal infection suspected.",
        "value": 61.0, "threshold": 50.0, "is_resolved": False,
        "created_at": "2026-05-12T07:45:00Z", "resolved_at": None
    },
]


# ─── ENDPOINTS ────────────────────────────────────────────────────────────────

@router.get("/", summary="List all alerts")
async def list_alerts(
    severity:    Optional[str]  = Query(None, description="Filter: info|warning|critical"),
    category:    Optional[str]  = Query(None, description="Filter: health|soil|weather|disease|battery"),
    resolved:    Optional[bool] = Query(None, description="Filter by resolved status"),
    tree_code:   Optional[str]  = Query(None),
    limit:       int            = Query(50, ge=1, le=200),
    offset:      int            = Query(0, ge=0),
):
    """Retrieve all alerts with optional filtering."""
    alerts = MOCK_ALERTS.copy()

    if severity:
        alerts = [a for a in alerts if a["severity"] == severity]
    if category:
        alerts = [a for a in alerts if a["category"] == category]
    if resolved is not None:
        alerts = [a for a in alerts if a["is_resolved"] == resolved]
    if tree_code:
        alerts = [a for a in alerts if a["tree_code"] == tree_code]

    # Sort newest first
    alerts.sort(key=lambda x: x["created_at"], reverse=True)
    total = len(alerts)

    return {
        "total":   total,
        "offset":  offset,
        "limit":   limit,
        "alerts":  alerts[offset:offset + limit],
        "summary": {
            "critical": sum(1 for a in MOCK_ALERTS if a["severity"] == "critical" and not a["is_resolved"]),
            "warning":  sum(1 for a in MOCK_ALERTS if a["severity"] == "warning"  and not a["is_resolved"]),
            "info":     sum(1 for a in MOCK_ALERTS if a["severity"] == "info"     and not a["is_resolved"]),
        }
    }


@router.get("/active/count", summary="Count of active (unresolved) alerts")
async def active_alert_count():
    """Quick count for dashboard badge."""
    unresolved = [a for a in MOCK_ALERTS if not a["is_resolved"]]
    return {
        "total":    len(unresolved),
        "critical": sum(1 for a in unresolved if a["severity"] == "critical"),
        "warning":  sum(1 for a in unresolved if a["severity"] == "warning"),
        "info":     sum(1 for a in unresolved if a["severity"] == "info"),
    }


@router.get("/{alert_id}", summary="Get a single alert by ID")
async def get_alert(alert_id: str):
    """Retrieve a specific alert by its UUID."""
    alert = next((a for a in MOCK_ALERTS if a["id"] == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/{alert_id}/resolve", summary="Mark an alert as resolved")
async def resolve_alert(alert_id: str, body: AlertResolveRequest):
    """Mark an alert as resolved, optionally with notes."""
    alert = next((a for a in MOCK_ALERTS if a["id"] == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert["is_resolved"]:
        return {"status": "already_resolved", "alert_id": alert_id}

    alert["is_resolved"] = True
    alert["resolved_at"] = datetime.utcnow().isoformat() + "Z"
    if body.notes:
        alert["notes"] = body.notes

    return {"status": "resolved", "alert_id": alert_id, "resolved_at": alert["resolved_at"]}


@router.post("/resolve/all", summary="Resolve all active alerts")
async def resolve_all_alerts():
    """Bulk resolve all unresolved alerts (admin action)."""
    now = datetime.utcnow().isoformat() + "Z"
    count = 0
    for alert in MOCK_ALERTS:
        if not alert["is_resolved"]:
            alert["is_resolved"] = True
            alert["resolved_at"] = now
            count += 1
    return {"status": "ok", "resolved_count": count}


@router.post("/", summary="Create a manual alert")
async def create_alert(
    tree_code: str,
    severity:  str,
    category:  str,
    message:   str,
    value:     Optional[float] = None,
    threshold: Optional[float] = None,
):
    """Manually create an alert (for admin/testing use)."""
    new_alert = {
        "id":          str(uuid4()),
        "tree_id":     f"tree-manual-{tree_code}",
        "tree_code":   tree_code,
        "severity":    severity,
        "category":    category,
        "message":     message,
        "value":       value,
        "threshold":   threshold,
        "is_resolved": False,
        "created_at":  datetime.utcnow().isoformat() + "Z",
        "resolved_at": None,
    }
    MOCK_ALERTS.append(new_alert)
    return {"status": "created", "alert": new_alert}
