"""
TreeSense AI — SQLAlchemy ORM Models (SQLite-compatible)
Author: Prof. Anjit Raja R — RGU CII | Version: 1.0.0 | May 2026
"""

from sqlalchemy import (
    Column, String, Float, Integer, Boolean,
    DateTime, Text, ForeignKey, Index, JSON, func
)
from sqlalchemy.orm import declarative_base, relationship
import uuid

Base = declarative_base()


def _uuid():
    return str(uuid.uuid4())


class Tree(Base):
    __tablename__ = "trees"
    id              = Column(String(36), primary_key=True, default=_uuid)
    tree_code       = Column(String(20), unique=True, nullable=False, index=True)
    common_name     = Column(String(100), nullable=False)
    scientific_name = Column(String(150), nullable=False)
    family          = Column(String(100))
    age_years       = Column(Float)
    height_m        = Column(Float)
    girth_cm        = Column(Float)
    canopy_spread_m = Column(Float)
    latitude        = Column(Float, nullable=False)
    longitude       = Column(Float, nullable=False)
    altitude_m      = Column(Float)
    location_name   = Column(String(200))
    zone            = Column(String(50))
    health_score    = Column(Float, default=100.0)
    status          = Column(String(20), default="Healthy")
    is_active       = Column(Boolean, default=True)
    last_seen       = Column(DateTime, server_default=func.now())
    qr_url          = Column(String(500))
    planted_by      = Column(String(100))
    planted_date    = Column(DateTime)
    notes           = Column(Text)
    extra           = Column(JSON, default=dict)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, onupdate=func.now())
    sensor_readings = relationship("SensorReading", back_populates="tree", lazy="select")
    alerts          = relationship("Alert", back_populates="tree", lazy="select")
    __table_args__ = (
        Index("ix_trees_location", "latitude", "longitude"),
        Index("ix_trees_zone", "zone"),
    )

    def to_dict(self):
        return {
            "id": self.id, "tree_code": self.tree_code,
            "common_name": self.common_name, "scientific_name": self.scientific_name,
            "latitude": self.latitude, "longitude": self.longitude,
            "health_score": self.health_score, "status": self.status,
            "zone": self.zone,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
        }


class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id            = Column(String(36), primary_key=True, default=_uuid)
    tree_id       = Column(String(36), ForeignKey("trees.id"), nullable=False)
    node_id       = Column(String(30))
    timestamp     = Column(DateTime, nullable=False, server_default=func.now())
    temperature_c = Column(Float)
    humidity_pct  = Column(Float)
    pressure_hpa  = Column(Float)
    wind_speed_ms = Column(Float)
    wind_direction= Column(Float)
    rainfall_mm   = Column(Float)
    lux           = Column(Float)
    uv_index      = Column(Float)
    soil_moisture = Column(Float)
    soil_temp_c   = Column(Float)
    soil_ph       = Column(Float)
    soil_ec       = Column(Float)
    nitrogen      = Column(Float)
    phosphorus    = Column(Float)
    potassium     = Column(Float)
    co2_ppm       = Column(Float)
    voc_ppb       = Column(Float)
    pm25          = Column(Float)
    pm10          = Column(Float)
    trunk_vib_hz  = Column(Float)
    bark_temp_c   = Column(Float)
    leaf_wetness  = Column(Float)
    health_score  = Column(Float)
    anomaly_score = Column(Float)
    disease_risk  = Column(Float)
    battery_pct   = Column(Float)
    signal_rssi   = Column(Integer)
    comm_type     = Column(String(10), default="MQTT")
    raw_payload   = Column(JSON)
    tree = relationship("Tree", back_populates="sensor_readings")
    __table_args__ = (
        Index("ix_sr_tree_ts", "tree_id", "timestamp"),
        Index("ix_sr_timestamp", "timestamp"),
    )


class Alert(Base):
    __tablename__ = "db_alerts"
    id          = Column(String(36), primary_key=True, default=_uuid)
    tree_id     = Column(String(36), ForeignKey("trees.id"), nullable=False)
    severity    = Column(String(10), nullable=False)
    category    = Column(String(30))
    message     = Column(Text, nullable=False)
    value       = Column(Float)
    threshold   = Column(Float)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    created_at  = Column(DateTime, server_default=func.now())
    tree = relationship("Tree", back_populates="alerts")
    __table_args__ = (
        Index("ix_alerts_tree", "tree_id"),
        Index("ix_alerts_severity", "severity"),
        Index("ix_alerts_resolved", "is_resolved"),
    )
