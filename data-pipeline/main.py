from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
import numpy as np
import math

app = FastAPI(title="Climate Data Ingestion & Fusion Engine", version="1.0.0")

class IngestionRequest(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    resolution: str = Field(default="regional", description="global (coarse), regional (mid), local (high)")

# Define grid bounds and resolutions
# Level 0: Global (1.0 degree)
# Level 1: Regional/South Asia (0.25 degree)
# Level 2: India Local (0.1 degree)
GRID_CONFIGS = {
    "global": {"lat_bounds": (-60.0, 60.0), "lon_bounds": (-180.0, 180.0), "res": 5.0}, # Coarse default to keep payload lightweight
    "regional": {"lat_bounds": (5.0, 38.0), "lon_bounds": (60.0, 100.0), "res": 1.0}, # South Asia mid-res
    "local": {"lat_bounds": (18.0, 25.0), "lon_bounds": (73.0, 82.0), "res": 0.5}   # India-first high-res PoC
}

def simulate_source_data(lat: float, lon: float, date: datetime):
    day_of_year = date.timetuple().tm_yday
    
    # 1. IMD (India Ground Stations) / Regional Temperature Signal
    temp_base = 28.0 - (lat - 20.0) * 0.4
    temp_seasonal = 8.0 * math.sin(2 * math.pi * ((day_of_year - 80) / 365.0))
    temp_noise = np.random.normal(0, 0.4)
    imd_temp = temp_base + temp_seasonal + temp_noise
    
    # 2. NASA GPM (Global Precipitation Measurement)
    is_monsoon = 150 <= day_of_year <= 270
    gpm_rain_base = 12.0 - (lon - 75.0) * 0.5 if is_monsoon and (10 <= lat <= 30) else 0.0
    gpm_rain = max(0.0, gpm_rain_base * (math.sin(2 * math.pi * (day_of_year / 15.0)) + 1.0) + np.random.normal(0, 3.0))
    
    # 3. INSAT LST (Land Surface Temp)
    insat_lst = imd_temp - (gpm_rain * 0.12) + np.random.normal(0, 0.5)
    
    # 4. ERA5 Global Reanalysis SST
    sst = 27.2 + 0.6 * math.sin(2 * math.pi * (day_of_year / 365.0)) + np.random.normal(0, 0.2) if lat < 15 else 0.0
    
    # Global indices (ENSO / IOD)
    enso = 0.4 * math.sin(2 * math.pi * (day_of_year / 365.0))
    iod = 0.2 * math.cos(2 * math.pi * (day_of_year / 365.0))
    
    return {
        "lat": lat,
        "lon": lon,
        "temperature": float(imd_temp),
        "rainfall": float(gpm_rain),
        "lst": float(insat_lst),
        "sst": float(sst),
        "enso": float(enso),
        "iod": float(iod)
    }

@app.get("/health")
def health():
    return {"status": "healthy", "service": "data-pipeline"}

@app.post("/api/ingest")
def ingest_and_fuse(req: IngestionRequest):
    """
    Ingests mock datasets from IMD, INSAT, NASA GPM, and ERA5,
    applies spatial-temporal data fusion, checks validation, and returns normalized grids.
    """
    try:
        date = datetime.fromisoformat(req.timestamp.replace("Z", "+00:00"))
    except ValueError:
        date = datetime.utcnow()
        
    res_key = req.resolution.lower()
    if res_key not in GRID_CONFIGS:
        res_key = "local"
        
    cfg = GRID_CONFIGS[res_key]
    lats = np.arange(cfg["lat_bounds"][0], cfg["lat_bounds"][1] + 0.01, cfg["res"])
    lons = np.arange(cfg["lon_bounds"][0], cfg["lon_bounds"][1] + 0.01, cfg["res"])
    
    fused_grid = []
    for lat in lats:
        for lon in lons:
            raw_data = simulate_source_data(lat, lon, date)
            
            # --- Strict Data Validation (QA/QC Checks) ---
            # 1. Temperature range check (-50C to +60C)
            if not (-50.0 <= raw_data["temperature"] <= 60.0):
                continue
            # 2. Rainfall range check (0 to 1000mm/day)
            if not (0.0 <= raw_data["rainfall"] <= 1000.0):
                raw_data["rainfall"] = 0.0 # Impute
            # 3. Missing Value Handling
            if math.isnan(raw_data["lst"]):
                raw_data["lst"] = raw_data["temperature"]
                
            fused_grid.append(raw_data)
            
    return {
        "timestamp": req.timestamp,
        "resolution": res_key,
        "grid_size": len(fused_grid),
        "data": fused_grid
    }
