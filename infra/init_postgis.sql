-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. countries table
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    geom GEOMETRY(MultiPolygon, 4326)
);

-- 2. states table
CREATE TABLE IF NOT EXISTS states (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    geom GEOMETRY(MultiPolygon, 4326),
    UNIQUE(name, country_name)
);

-- 3. climate_grid table (1x1 degree global grid cells)
CREATE TABLE IF NOT EXISTS climate_grid (
    id SERIAL PRIMARY KEY,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    geom GEOMETRY(Point, 4326),
    temperature REAL,
    rainfall REAL,
    lst REAL,
    sst REAL,
    anomaly_score REAL,
    risk_index REAL,
    country_name VARCHAR(100),
    state_name VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lat, lon)
);

-- Indexes for fast spatial queries
CREATE INDEX IF NOT EXISTS idx_climate_grid_geom ON climate_grid USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_countries_geom ON countries USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_states_geom ON states USING GIST(geom);

-- 4. forecasts table
CREATE TABLE IF NOT EXISTS forecasts (
    id SERIAL PRIMARY KEY,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    forecast_step INTEGER NOT NULL,
    temp_p10 REAL,
    temp_p50 REAL,
    temp_p90 REAL,
    rain_p10 REAL,
    rain_p50 REAL,
    rain_p90 REAL,
    anomaly_score REAL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lat, lon, forecast_step)
);

-- 5. risk_scores table
CREATE TABLE IF NOT EXISTS risk_scores (
    id SERIAL PRIMARY KEY,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    flood_risk REAL,
    drought_risk REAL,
    heatwave_risk REAL,
    agricultural_stress REAL,
    overall_risk REAL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lat, lon)
);

-- 6. scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
    id SERIAL PRIMARY KEY,
    scenario_name VARCHAR(100) NOT NULL,
    temp_offset REAL DEFAULT 0.0,
    rain_factor REAL DEFAULT 1.0,
    el_nino_la_nina VARCHAR(50) DEFAULT 'Neutral',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
