"""TreeSense AI — Users API Router (Local Stub)"""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

MOCK_USERS = [
    {"id": "usr-001", "name": "Prof. Anjit Raja R", "role": "admin", "email": "anjit@rgu.ac.in"},
    {"id": "usr-002", "name": "Field Technician A", "role": "technician", "email": "tech1@rgu.ac.in"},
    {"id": "usr-003", "name": "Researcher B", "role": "viewer", "email": "researcher@rgu.ac.in"},
]

@router.get("/", summary="List users")
async def list_users():
    return {"users": MOCK_USERS, "total": len(MOCK_USERS)}

@router.get("/me", summary="Current user profile")
async def get_me():
    return MOCK_USERS[0]

@router.get("/{user_id}", summary="Get user by ID")
async def get_user(user_id: str):
    user = next((u for u in MOCK_USERS if u["id"] == user_id), None)
    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")
    return user
