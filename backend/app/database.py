"""
TreeSense AI — Database Connection & Session Management
Async SQLAlchemy setup with SQLite (local mode).
Author: Prof. Anjit Raja R — RGU CII | Version: 1.0.0 | May 2026
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import text
import os
import logging

logger = logging.getLogger(__name__)

# ─── DATABASE URL ─────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./treesense.db"   # SQLite for local dev
)

# Convert postgres:// → postgresql+asyncpg:// (Heroku/Railway style URLs)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

# ─── ENGINE ───────────────────────────────────────────────────────────────────

is_sqlite = "sqlite" in DATABASE_URL

if is_sqlite:
    engine = create_async_engine(
        DATABASE_URL,
        echo=os.getenv("SQL_ECHO", "false").lower() == "true",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    engine = create_async_engine(
        DATABASE_URL,
        echo=os.getenv("SQL_ECHO", "false").lower() == "true",
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

# ─── SESSION FACTORY ──────────────────────────────────────────────────────────

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# ─── DEPENDENCY ───────────────────────────────────────────────────────────────

async def get_db() -> AsyncSession:
    """FastAPI dependency — yields an async DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ─── LIFECYCLE ────────────────────────────────────────────────────────────────

async def init_db():
    """Create all tables on startup (development mode)."""
    from app.models.tree import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database tables initialised (SQLite)")


async def close_db():
    """Dispose engine on shutdown."""
    await engine.dispose()
    logger.info("✅ Database engine disposed")


async def ping_db() -> bool:
    """Health check — verify DB connectivity."""
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"DB ping failed: {e}")
        return False
