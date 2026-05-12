"""TreeSense AI — QR Codes API Router (Local Stub)"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime

router = APIRouter()

MOCK_TREES_QR = {
    "RGU-TBA-0001": {"common_name": "Banyan Tree",      "scientific_name": "Ficus benghalensis",  "zone": "campus_east",  "health_score": 82.4, "status": "Healthy"},
    "RGU-TBA-0002": {"common_name": "Teak",             "scientific_name": "Tectona grandis",     "zone": "campus_west",  "health_score": 68.1, "status": "Moderate"},
    "RGU-TBA-0003": {"common_name": "Mango Tree",       "scientific_name": "Mangifera indica",    "zone": "campus_north", "health_score": 54.7, "status": "At Risk"},
    "RGU-TBA-0004": {"common_name": "Neem Tree",        "scientific_name": "Azadirachta indica",  "zone": "campus_north", "health_score": 91.2, "status": "Healthy"},
    "RGU-TBA-0005": {"common_name": "Royal Poinciana",  "scientific_name": "Delonix regia",       "zone": "campus_south", "health_score": 28.3, "status": "Critical"},
}

@router.get("/{tree_code}", summary="Get tree identity card via QR")
async def get_tree_qr_info(tree_code: str):
    tree = MOCK_TREES_QR.get(tree_code)
    if not tree:
        raise HTTPException(status_code=404, detail=f"Tree {tree_code} not found")
    return {
        "tree_code": tree_code,
        "qr_url": f"/api/v1/qr/{tree_code}/image",
        "scanned_at": datetime.utcnow().isoformat() + "Z",
        **tree,
    }

@router.get("/{tree_code}/image", summary="Generate QR code image (placeholder)")
async def get_qr_image(tree_code: str):
    return JSONResponse({
        "message": "QR image generation requires 'qrcode' library in production",
        "tree_code": tree_code,
        "scan_url": f"http://localhost:8000/api/v1/qr/{tree_code}",
    })

@router.get("/", summary="List all tree QR codes")
async def list_qr_codes():
    result = []
    for code, info in MOCK_TREES_QR.items():
        result.append({
            "tree_code": code,
            "common_name": info["common_name"],
            "qr_url": f"/api/v1/qr/{code}/image",
            "health_score": info["health_score"],
            "status": info["status"],
        })
    return {"total": len(result), "qr_codes": result}
