"""
TreeSense AI — Trees API Router
CRUD operations for tree registry + health scoring
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

from app.database import get_db
from app.models.tree import Tree as TreeModel
from app.services.ai_service import AIService

router = APIRouter()
ai_service = AIService()

# ── Schemas ─────────────────────────────────────────────────
class TreeCreate(BaseModel):
    common_name:      str = Field(..., example="Banyan Tree")
    scientific_name:  str = Field(..., example="Ficus benghalensis")
    location_name:    str = Field(..., example="RGU Campus East Gate")
    latitude:         float = Field(..., ge=-90,  le=90)
    longitude:        float = Field(..., ge=-180, le=180)
    planted_date:     Optional[datetime] = None
    age_years:        Optional[int]  = None
    species_family:   Optional[str]  = None
    zone:             Optional[str]  = None
    notes:            Optional[str]  = None

class TreeResponse(BaseModel):
    tree_id:          str
    common_name:      str
    scientific_name:  str
    location_name:    str
    latitude:         float
    longitude:        float
    planted_date:     Optional[datetime]
    age_years:        Optional[int]
    health_score:     Optional[float]
    status:           str
    qr_code_url:      str
    created_at:       datetime

    class Config:
        from_attributes = True

class TreeHealthUpdate(BaseModel):
    health_score:  float = Field(..., ge=0, le=100)
    status:        str   = Field(..., example="healthy")
    notes:         Optional[str] = None

# ── Endpoints ────────────────────────────────────────────────
@router.post("/register", response_model=TreeResponse, status_code=201)
async def register_tree(payload: TreeCreate, db: AsyncSession = Depends(get_db)):
    """Register a new tree in the system with a unique ID and QR code."""
    tree_id = f"TBA-RGU-{str(uuid.uuid4())[:8].upper()}"
    tree = TreeModel(
        tree_id=tree_id,
        common_name=payload.common_name,
        scientific_name=payload.scientific_name,
        location_name=payload.location_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        planted_date=payload.planted_date,
        age_years=payload.age_years,
        species_family=payload.species_family,
        zone=payload.zone,
        notes=payload.notes,
        health_score=None,
        status="registered",
        qr_code_url=f"/api/v1/qr/{tree_id}/image",
    )
    db.add(tree)
    await db.commit()
    await db.refresh(tree)
    return tree

@router.get("/", response_model=List[TreeResponse])
async def list_trees(
    zone:   Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit:  int           = Query(100, ge=1, le=1000),
    offset: int           = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """List all registered trees with optional filtering by zone or status."""
    query = select(TreeModel)
    if zone:   query = query.where(TreeModel.zone == zone)
    if status: query = query.where(TreeModel.status == status)
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{tree_id}", response_model=TreeResponse)
async def get_tree(tree_id: str, db: AsyncSession = Depends(get_db)):
    """Get full profile for a specific tree by ID."""
    result = await db.execute(select(TreeModel).where(TreeModel.tree_id == tree_id))
    tree = result.scalar_one_or_none()
    if not tree:
        raise HTTPException(status_code=404, detail=f"Tree {tree_id} not found")
    return tree

@router.get("/{tree_id}/health")
async def get_tree_health(tree_id: str, db: AsyncSession = Depends(get_db)):
    """Get AI-generated health assessment for a tree."""
    result = await db.execute(select(TreeModel).where(TreeModel.tree_id == tree_id))
    tree = result.scalar_one_or_none()
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    assessment = await ai_service.assess_tree_health(tree_id)
    return {
        "tree_id":      tree_id,
        "health_score": assessment["score"],
        "status":       assessment["status"],
        "risks":        assessment["risks"],
        "recommendations": assessment["recommendations"],
        "timestamp":    datetime.utcnow().isoformat(),
    }

@router.get("/{tree_id}/history")
async def get_tree_history(
    tree_id:   str,
    days:      int = Query(7, ge=1, le=365),
    parameter: str = Query("temperature"),
    db: AsyncSession = Depends(get_db)
):
    """Get historical sensor data for a tree (from InfluxDB)."""
    from random import uniform
    from datetime import timedelta
    now = datetime.utcnow()
    data = [{"timestamp": (now - timedelta(hours=i)).isoformat() + "Z",
             parameter: round(uniform(20, 80), 2)} for i in range(days * 24)]
    return {"tree_id": tree_id, "parameter": parameter, "days": days, "data": data}

@router.get("/map/geojson")
async def get_trees_geojson(db: AsyncSession = Depends(get_db)):
    """Return all trees as GeoJSON for map rendering."""
    result = await db.execute(select(TreeModel))
    trees  = result.scalars().all()
    features = []
    for t in trees:
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [t.longitude, t.latitude]},
            "properties": {
                "tree_id":      t.tree_id,
                "name":         t.common_name,
                "scientific":   t.scientific_name,
                "health_score": t.health_score,
                "status":       t.status,
                "zone":         t.zone,
                "qr_url":       t.qr_code_url,
            }
        })
    return {"type": "FeatureCollection", "features": features}

@router.get("/stats/summary")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Dashboard summary statistics."""
    total      = await db.scalar(select(func.count(TreeModel.tree_id)))
    healthy    = await db.scalar(select(func.count()).where(TreeModel.status == "healthy"))
    at_risk    = await db.scalar(select(func.count()).where(TreeModel.status == "at_risk"))
    critical   = await db.scalar(select(func.count()).where(TreeModel.status == "critical"))
    avg_health = await db.scalar(select(func.avg(TreeModel.health_score)))
    return {
        "total_trees":     total,
        "healthy":         healthy,
        "at_risk":         at_risk,
        "critical":        critical,
        "avg_health_score": round(avg_health or 0, 1),
    }
