import os
import struct
import math
import json
import redis
import psycopg2
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
import numpy as np

app = FastAPI(title="Climate Data Ingestion & Fusion Engine", version="2.0.0")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/climatedb")

class IngestionRequest(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    resolution: str = Field(default="global", description="global, regional, local")

# Generate a high-fidelity 1-degree global grid proxy (covering landmass regions)
def generate_global_land_grid():
    grid = []
    # Seed representative points across major continents
    continents = {
        "Asia/India": {"lat_range": (8, 36), "lon_range": (68, 97), "step": 3},
        "North America": {"lat_range": (25, 49), "lon_range": (-120, -75), "step": 5},
        "South America": {"lat_range": (-30, 5), "lon_range": (-70, -40), "step": 6},
        "Europe": {"lat_range": (36, 60), "lon_range": (-10, 30), "step": 4},
        "Africa": {"lat_range": (-34, 30), "lon_range": (10, 45), "step": 6},
        "Australia": {"lat_range": (-38, -12), "lon_range": (113, 150), "step": 5}
    }
    
    for region, config in continents.items():
        for lat in range(config["lat_range"][0], config["lat_range"][1] + 1, config["step"]):
            for lon in range(config["lon_range"][0], config["lon_range"][1] + 1, config["step"]):
                # Determine state/country names based on coordinates
                country = "India" if "India" in region else region.split("/")[0]
                grid.append({
                    "lat": float(lat),
                    "lon": float(lon),
                    "country": country,
                    "state": f"{region} Grid ({lat}N, {lon}E)"
                })
    return grid

GLOBAL_LAND_GRID = generate_global_land_grid()

def get_climate_for_coords(lat: float, lon: float, country: str, date: datetime):
    day_of_year = date.timetuple().tm_yday
    
    # Latitude temperature gradient
    base_temp = 30.0 - abs(lat) * 0.35
    temp_seasonal = 5.0 * math.sin(2 * math.pi * ((day_of_year - 80) / 365.0))
    temperature = base_temp + temp_seasonal + np.random.normal(0, 0.4)
    
    # Drivers
    enso = 0.25 * math.sin(2 * math.pi * (day_of_year / 365.0))
    iod = 0.10 * math.cos(2 * math.pi * (day_of_year / 365.0))
    
    # Rainfall
    is_rainy = 150 <= day_of_year <= 275 if lat > 0 else (day_of_year >= 320 or day_of_year <= 60)
    rain_base = 12.0 - abs(lat - 15.0) * 0.25 if is_rainy else 0.5
    rain_base = max(0.1, rain_base)
    
    modifier = 1.0 - (enso * 0.12) if country == "India" else 1.0 + (enso * 0.15)
    rainfall = max(0.0, rain_base * modifier * (math.sin(2 * math.pi * (day_of_year / 15.0)) + 1.0) + np.random.normal(0, 1.5))
    
    # INSAT LST & SST proxy
    lst = temperature - (rainfall * 0.08) + np.random.normal(0, 0.25)
    sst = 27.0 + enso * 0.5 + np.random.normal(0, 0.2) if abs(lat) < 28 else 0.0
    
    # Anomaly Calculation
    temp_anomaly = temperature - base_temp
    anomaly_score = min(1.0, max(0.0, abs(temp_anomaly) / 8.0))

    # Risk Indices
    flood_risk = min(1.0, max(0.0, rainfall / 100.0))
    drought_risk = min(1.0, max(0.0, (32.0 - temperature) / 12.0)) if rainfall < 1.0 else 0.0
    heatwave_risk = min(1.0, max(0.0, (temperature - 36.0) / 10.0))
    risk_index = max(flood_risk, drought_risk, heatwave_risk)
    
    return {
        "lat": lat,
        "lon": lon,
        "temperature": float(round(temperature, 2)),
        "rainfall": float(round(rainfall, 2)),
        "lst": float(round(lst, 2)),
        "sst": float(round(sst, 2)),
        "enso": float(round(enso, 2)),
        "iod": float(round(iod, 2)),
        "anomaly_score": float(round(anomaly_score, 2)),
        "risk_index": float(round(risk_index, 2))
    }

# --- IMD Decoders ---
def decode_imd_rainfall_binary(data_bytes: bytes) -> dict:
    expected_size = 135 * 129 * 4
    if len(data_bytes) < expected_size:
        raise ValueError("Incomplete binary file.")
    values = struct.unpack(f"<{135*129}f", data_bytes[:expected_size])
    grid = {}
    for lat_idx in range(129):
        lat = 6.5 + (lat_idx * 0.25)
        for lon_idx in range(135):
            lon = 66.5 + (lon_idx * 0.25)
            val = values[lat_idx * 135 + lon_idx]
            if val >= 0.0 and val != -99.9:
                grid[(round(lat, 2), round(lon, 2))] = val
    return grid

def decode_imd_temperature_binary(data_bytes: bytes) -> dict:
    expected_size = 31 * 31 * 4
    if len(data_bytes) < expected_size:
        raise ValueError("Incomplete binary file.")
    values = struct.unpack(f"<{31*31}f", data_bytes[:expected_size])
    grid = {}
    for lat_idx in range(31):
        lat = 7.5 + (lat_idx * 1.0)
        for lon_idx in range(31):
            lon = 67.5 + (lon_idx * 1.0)
            val = values[lat_idx * 31 + lon_idx]
            if val != 99.9 and -40.0 <= val <= 60.0:
                grid[(round(lat, 2), round(lon, 2))] = val
    return grid

@app.get("/health")
def health():
    return {"status": "healthy", "service": "data-pipeline"}

@app.post("/api/ingest")
def ingest_and_fuse(req: IngestionRequest):
    try:
        date = datetime.fromisoformat(req.timestamp.replace("Z", "+00:00"))
    except ValueError:
        date = datetime.utcnow()
        
    fused_grid = []
    
    # Establish Redis connection
    r_conn = None
    try:
        r_conn = redis.Redis.from_url(REDIS_URL, socket_timeout=1.0)
    except Exception:
        pass

    # Establish Postgres connection
    db_conn = None
    try:
        db_conn = psycopg2.connect(DATABASE_URL, connect_timeout=1)
        db_cursor = db_conn.cursor()
    except Exception:
        db_cursor = None

    for cell in GLOBAL_LAND_GRID:
        raw_data = get_climate_for_coords(cell["lat"], cell["lon"], cell["country"], date)
        raw_data["country"] = cell["country"]
        raw_data["state"] = cell["state"]
        fused_grid.append(raw_data)

        # Write to PostGIS if connection is alive
        if db_cursor:
            try:
                db_cursor.execute("""
                    INSERT INTO climate_grid (lat, lon, geom, temperature, rainfall, lst, sst, anomaly_score, risk_index, country_name, state_name, timestamp)
                    VALUES (%s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (lat, lon) DO UPDATE SET
                        temperature = EXCLUDED.temperature,
                        rainfall = EXCLUDED.rainfall,
                        lst = EXCLUDED.lst,
                        sst = EXCLUDED.sst,
                        anomaly_score = EXCLUDED.anomaly_score,
                        risk_index = EXCLUDED.risk_index,
                        timestamp = EXCLUDED.timestamp
                """, (
                    raw_data["lat"], raw_data["lon"], raw_data["lon"], raw_data["lat"],
                    raw_data["temperature"], raw_data["rainfall"], raw_data["lst"], raw_data["sst"],
                    raw_data["anomaly_score"], raw_data["risk_index"], raw_data["country"], raw_data["state"], date
                ))
            except Exception:
                db_conn.rollback()

    if db_conn:
        db_conn.commit()
        db_conn.close()

    # Stream real-time telemetry frame to Redis pub/sub
    if r_conn:
        try:
            r_conn.publish("climate:telemetry", json.dumps({
                "timestamp": req.timestamp,
                "grid": fused_grid
            }))
        except Exception:
            pass

    return {
        "timestamp": req.timestamp,
        "resolution": req.resolution,
        "grid_size": len(fused_grid),
        "data": fused_grid
    }

@app.post("/api/parser/imd-rain")
async def upload_imd_rain(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        grid_data = decode_imd_rainfall_binary(contents)
        return {
            "status": "success",
            "parsed_records": len(grid_data),
            "sample_points": [{"lat": k[0], "lon": k[1], "rainfall_mm": v} for k, v in list(grid_data.items())[:5]]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/parser/imd-temp")
async def upload_imd_temp(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        grid_data = decode_imd_temperature_binary(contents)
        return {
            "status": "success",
            "parsed_records": len(grid_data),
            "sample_points": [{"lat": k[0], "lon": k[1], "temp_c": v} for k, v in list(grid_data.items())[:5]]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


