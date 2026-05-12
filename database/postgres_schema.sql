-- ============================================================
-- TreeSense AI — PostgreSQL Database Schema
-- Project: AI-Driven IoT Framework for Tree Behaviour Analysis
-- Author: Prof. Anjit Raja R — RGU CII | Version: 1.0.0
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";        -- GIS spatial queries
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Fuzzy text search

-- ── ENUM Types ───────────────────────────────────────────────
CREATE TYPE tree_status AS ENUM (
    'registered', 'healthy', 'moderate', 'at_risk', 'critical', 'deceased', 'removed'
);
CREATE TYPE alert_severity AS ENUM ('info', 'low', 'medium', 'high', 'critical');
CREATE TYPE user_role AS ENUM ('super_admin', 'researcher', 'field_officer', 'viewer', 'mobile_user');
CREATE TYPE sensor_status AS ENUM ('online', 'offline', 'error', 'low_battery', 'maintenance');

-- ─────────────────────────────────────────────────────────────
--  USERS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(64) UNIQUE NOT NULL,
    email           VARCHAR(128) UNIQUE NOT NULL,
    full_name       VARCHAR(128),
    password_hash   TEXT NOT NULL,
    role            user_role DEFAULT 'viewer',
    institution     VARCHAR(128),
    department      VARCHAR(128),
    phone           VARCHAR(20),
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_role     ON users(role);

-- ─────────────────────────────────────────────────────────────
--  ZONES TABLE (Geographic Management Zones)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE zones (
    zone_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_name       VARCHAR(128) NOT NULL,
    zone_code       VARCHAR(32) UNIQUE NOT NULL,
    description     TEXT,
    boundary        GEOMETRY(POLYGON, 4326),   -- PostGIS polygon
    tree_count      INTEGER DEFAULT 0,
    responsible_user UUID REFERENCES users(user_id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_zones_boundary ON zones USING GIST(boundary);

-- ─────────────────────────────────────────────────────────────
--  TREES TABLE (Core Registry)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE trees (
    tree_id             VARCHAR(32) PRIMARY KEY,   -- e.g., TBA-RGU-A1B2C3D4
    common_name         VARCHAR(128) NOT NULL,
    scientific_name     VARCHAR(128),
    species_family      VARCHAR(64),
    species_genus       VARCHAR(64),
    location_name       VARCHAR(256),
    latitude            DOUBLE PRECISION NOT NULL,
    longitude           DOUBLE PRECISION NOT NULL,
    geo_point           GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (
                            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                        ) STORED,
    zone_id             UUID REFERENCES zones(zone_id),
    planted_date        DATE,
    age_years           INTEGER,
    height_m            DECIMAL(6,2),
    dbh_cm              DECIMAL(6,2),              -- Diameter at breast height
    canopy_spread_m     DECIMAL(6,2),
    health_score        DECIMAL(5,1),
    status              tree_status DEFAULT 'registered',
    last_reading_at     TIMESTAMPTZ,
    sensor_node_id      VARCHAR(32),               -- TBA-NODE-XXXX
    sensor_status       sensor_status DEFAULT 'offline',
    qr_code_url         TEXT,
    image_url           TEXT,
    notes               TEXT,
    tags                VARCHAR(64)[],
    registered_by       UUID REFERENCES users(user_id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trees_status    ON trees(status);
CREATE INDEX idx_trees_zone      ON trees(zone_id);
CREATE INDEX idx_trees_geo       ON trees USING GIST(geo_point);
CREATE INDEX idx_trees_health    ON trees(health_score);
CREATE INDEX idx_trees_sensor    ON trees(sensor_node_id);

-- ─────────────────────────────────────────────────────────────
--  SENSOR NODES TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE sensor_nodes (
    node_id             VARCHAR(32) PRIMARY KEY,   -- TBA-NODE-XXXX
    tree_id             VARCHAR(32) REFERENCES trees(tree_id),
    firmware_version    VARCHAR(16),
    hardware_version    VARCHAR(16),
    mac_address         VARCHAR(18),
    ip_address          INET,
    last_seen           TIMESTAMPTZ,
    battery_voltage     DECIMAL(4,2),
    battery_pct         INTEGER,
    solar_charging      BOOLEAN,
    rssi_dbm            INTEGER,
    uptime_seconds      BIGINT,
    status              sensor_status DEFAULT 'offline',
    active_sensors      TEXT[],                    -- list of active sensor types
    installation_date   DATE,
    calibration_date    DATE,
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  ALERTS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE alerts (
    alert_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tree_id         VARCHAR(32) REFERENCES trees(tree_id),
    node_id         VARCHAR(32) REFERENCES sensor_nodes(node_id),
    alert_type      VARCHAR(64) NOT NULL,
    severity        alert_severity NOT NULL,
    message         TEXT NOT NULL,
    parameter       VARCHAR(64),
    value           DECIMAL(10,3),
    threshold       DECIMAL(10,3),
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(user_id),
    acknowledged_at TIMESTAMPTZ,
    resolved        BOOLEAN DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ,
    ai_generated    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_tree      ON alerts(tree_id);
CREATE INDEX idx_alerts_severity  ON alerts(severity);
CREATE INDEX idx_alerts_resolved  ON alerts(resolved);
CREATE INDEX idx_alerts_created   ON alerts(created_at DESC);

-- ─────────────────────────────────────────────────────────────
--  HEALTH HISTORY TABLE (daily snapshots from AI)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE health_history (
    id              BIGSERIAL PRIMARY KEY,
    tree_id         VARCHAR(32) REFERENCES trees(tree_id),
    snapshot_date   DATE NOT NULL,
    health_score    DECIMAL(5,1),
    status          tree_status,
    avg_temperature DECIMAL(6,2),
    avg_humidity    DECIMAL(6,2),
    avg_soil_moist  DECIMAL(6,2),
    avg_co2         DECIMAL(8,2),
    risk_flags      TEXT[],
    disease_risks   JSONB,
    carbon_seq_kg   DECIMAL(8,3),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tree_id, snapshot_date)
);

CREATE INDEX idx_health_tree_date ON health_history(tree_id, snapshot_date DESC);

-- ─────────────────────────────────────────────────────────────
--  QR IDENTITY TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE qr_identities (
    qr_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tree_id         VARCHAR(32) REFERENCES trees(tree_id) UNIQUE,
    qr_code_data    TEXT NOT NULL,               -- URL encoded in QR
    qr_image_path   TEXT,
    scan_count      INTEGER DEFAULT 0,
    last_scanned    TIMESTAMPTZ,
    generated_at    TIMESTAMPTZ DEFAULT NOW(),
    generated_by    UUID REFERENCES users(user_id)
);

-- ─────────────────────────────────────────────────────────────
--  RESEARCH EXPORTS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE research_exports (
    export_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(256),
    description     TEXT,
    query_params    JSONB,
    export_format   VARCHAR(16) DEFAULT 'csv',
    file_path       TEXT,
    file_size_bytes BIGINT,
    row_count       BIGINT,
    date_from       DATE,
    date_to         DATE,
    zones           TEXT[],
    tree_ids        TEXT[],
    created_by      UUID REFERENCES users(user_id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
--  AUDIT LOG
-- ─────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
    log_id      BIGSERIAL PRIMARY KEY,
    user_id     UUID REFERENCES users(user_id),
    action      VARCHAR(64) NOT NULL,
    table_name  VARCHAR(64),
    record_id   TEXT,
    old_values  JSONB,
    new_values  JSONB,
    ip_address  INET,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user    ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ─────────────────────────────────────────────────────────────
--  FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trees_updated_at
    BEFORE UPDATE ON trees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update zone tree count on tree insert
CREATE OR REPLACE FUNCTION update_zone_tree_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.zone_id IS NOT NULL THEN
        UPDATE zones SET tree_count = tree_count + 1 WHERE zone_id = NEW.zone_id;
    ELSIF TG_OP = 'DELETE' AND OLD.zone_id IS NOT NULL THEN
        UPDATE zones SET tree_count = tree_count - 1 WHERE zone_id = OLD.zone_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_zone_count
    AFTER INSERT OR DELETE ON trees
    FOR EACH ROW EXECUTE FUNCTION update_zone_tree_count();

-- ─────────────────────────────────────────────────────────────
--  SEED DATA (Demo)
-- ─────────────────────────────────────────────────────────────
INSERT INTO users (username, email, full_name, role, institution, password_hash)
VALUES
    ('admin',       'admin@rgu.ac.in',       'Prof. Anjit Raja R',  'super_admin', 'Rathinam Global University', '$2b$12$placeholder'),
    ('researcher1', 'research@rgu.ac.in',    'Dr. Research User',   'researcher',  'Rathinam Global University', '$2b$12$placeholder'),
    ('field_1',     'field1@rgu.ac.in',      'Field Officer One',   'field_officer','RGU Campus', '$2b$12$placeholder');

INSERT INTO zones (zone_name, zone_code, description)
VALUES
    ('RGU Main Campus',     'RGU-MAIN',   'Primary campus zone with mature trees'),
    ('RGU Sports Ground',   'RGU-SPORT',  'Sports zone with planted saplings'),
    ('RGU Research Garden', 'RGU-RESRCH', 'Research and botanical garden zone');

INSERT INTO trees (tree_id, common_name, scientific_name, species_genus,
                   location_name, latitude, longitude, age_years, health_score, status, dbh_cm)
VALUES
    ('TBA-RGU-0001', 'Banyan Tree',  'Ficus benghalensis',    'ficus',      'RGU Campus East Gate',   11.0165, 76.9562, 25, 92.0, 'healthy', 48.5),
    ('TBA-RGU-0002', 'Teak Tree',    'Tectona grandis',       'tectona',    'RGU Campus North Road',  11.0170, 76.9558, 18, 78.5, 'healthy', 32.1),
    ('TBA-RGU-0003', 'Mango Tree',   'Mangifera indica',      'mangifera',  'RGU Campus Canteen Area',11.0160, 76.9570, 12, 65.2, 'moderate',24.8),
    ('TBA-RGU-0004', 'Neem Tree',    'Azadirachta indica',    'azadirachta','RGU Campus Library',     11.0175, 76.9550, 20, 45.0, 'at_risk', 28.3),
    ('TBA-RGU-0005', 'Rain Tree',    'Samanea saman',         'default',    'RGU Campus Parking',     11.0155, 76.9575,  8, 88.0, 'healthy', 18.2);

-- QR Identities
INSERT INTO qr_identities (tree_id, qr_code_data)
SELECT tree_id, 'https://treesense.rgu.ac.in/tree/' || tree_id FROM trees;

-- Sample alerts
INSERT INTO alerts (tree_id, alert_type, severity, message, parameter, value, threshold, ai_generated)
VALUES
    ('TBA-RGU-0004', 'low_soil_moisture',  'high',   'Soil moisture critically low',  'soil_moisture', 12.3, 15.0, TRUE),
    ('TBA-RGU-0004', 'nutrient_deficiency','medium', 'Nitrogen below optimal range',  'nitrogen',      28.0, 50.0, TRUE),
    ('TBA-RGU-0003', 'ph_alert',           'medium', 'Soil pH above safe range',      'soil_ph',        8.7,  8.5, TRUE);

COMMENT ON TABLE trees          IS 'Core tree registry with GPS and health data';
COMMENT ON TABLE sensor_nodes   IS 'ESP32 IoT node registry and status';
COMMENT ON TABLE alerts         IS 'AI-generated and threshold-based alert log';
COMMENT ON TABLE health_history IS 'Daily AI health snapshot per tree';
COMMENT ON TABLE qr_identities  IS 'QR code digital identity per tree';
