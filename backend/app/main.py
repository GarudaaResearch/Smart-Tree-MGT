"""
TreeSense AI — FastAPI Local Backend
Main Application Entry Point (Local / No-Docker Mode)
Project: AI-Driven IoT Framework for Tree Behaviour Analysis
Author: Prof. Anjit Raja R — RGU CII | Version: 1.0.0 | May 2026
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import asyncio, json, logging
from datetime import datetime

from app.database import engine, init_db, close_db
from app.api import trees, sensors, alerts, users, analytics, qr_codes
from app.services.websocket_manager import ConnectionManager

# ── Logging ─────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("treesense")

# ── WebSocket Manager (global) ───────────────────────────────
ws_manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🌳 TreeSense AI Backend starting (Local Mode)...")

    # Create DB tables (SQLite)
    await init_db()
    logger.info("✅ Database tables ready (SQLite)")

    yield  # Application runs here

    # Shutdown
    await close_db()
    logger.info("🛑 TreeSense AI Backend shut down")


# ── FastAPI App ──────────────────────────────────────────────
app = FastAPI(
    title="TreeSense AI — Backend API",
    description="""
    AI-Driven IoT Framework for Tree Behaviour Analysis.
    Real-time environmental monitoring, AI health prediction,
    GIS mapping, and QR-based tree identity management.
    
    **Institution:** Rathinam Global University — CII  
    **PI:** Prof. Anjit Raja R
    
    > Running in **Local Mode** (SQLite, mock data — no Docker required)
    """,
    version="1.0.0",
    contact={"name": "Prof. Anjit Raja R", "email": "anjit@rgu.ac.in"},
    license_info={"name": "MIT"},
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── Middleware ───────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include Routers ──────────────────────────────────────────
app.include_router(trees.router,     prefix="/api/v1/trees",     tags=["Trees"])
app.include_router(sensors.router,   prefix="/api/v1/sensors",   tags=["Sensors"])
app.include_router(alerts.router,    prefix="/api/v1/alerts",    tags=["Alerts"])
app.include_router(users.router,     prefix="/api/v1/users",     tags=["Users"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(qr_codes.router,  prefix="/api/v1/qr",        tags=["QR Identity"])

# ── WebSocket — Real-time Dashboard Feed ─────────────────────
@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "subscribe_tree":
                    await ws_manager.subscribe(websocket, msg.get("tree_id"))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

@app.websocket("/ws/tree/{tree_id}")
async def websocket_tree(websocket: WebSocket, tree_id: str):
    await ws_manager.connect(websocket, channel=tree_id)
    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

# ── Health Check ─────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    from app.database import ping_db
    return {
        "status": "healthy",
        "service": "TreeSense AI Backend",
        "mode": "local (SQLite)",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "db_ping": await ping_db(),
    }

@app.get("/", tags=["System"])
async def root():
    return {
        "project": "TreeSense AI — IoT Tree Behaviour Analysis",
        "institution": "Rathinam Global University — CII",
        "pi": "Prof. Anjit Raja R",
        "api_docs": "/api/docs",
        "version": "1.0.0",
        "mode": "local",
    }
