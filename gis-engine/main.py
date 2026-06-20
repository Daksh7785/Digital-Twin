import os
import httpx
import geojson
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime

app = FastAPI(title="Climate GIS Engine", version="1.0.0")

DATA_PIPELINE_URL = os.getenv("DATA_PIPELINE_URL", "http://data-pipeline:8004")

# Local scenario parameter state
temp_offset = 0.0
rain_factor = 1.0

class ScenarioInput(BaseModel):
    temp_change: float
    rain_change: float

@app.get("/health")
def health():
    return {"status": "healthy", "service": "gis-engine"}

@app.post("/api/scenario")
def set_scenario(params: ScenarioInput):
    global temp_offset, rain_factor
    temp_offset = params.temp_change
    rain_factor = 1.0 + params.rain_change
    return {"status": "success", "temp_offset": temp_offset, "rain_factor": rain_factor}

@app.get("/api/state")
async def get_state(zoom: float = Query(5.0, description="Map zoom level to dynamically control resolution")):
    # Select resolution based on zoom
    if zoom < 4.0:
        resolution = "global"
    elif zoom < 7.0:
        resolution = "regional"
    else:
        resolution = "local"

    timestamp = datetime.utcnow().isoformat()
    
    async with httpx.AsyncClient() as client:
        try:
            # Query data-pipeline for the raw fused data
            res = await client.post(
                f"{DATA_PIPELINE_URL}/api/ingest",
                json={"timestamp": timestamp, "resolution": resolution},
                timeout=5.0
            )
            raw_grid = res.json()["data"]
        except Exception:
            # Standalone fallback if pipeline service is down
            raw_grid = [
                {"lat": 19.5, "lon": 75.5, "temperature": 28.4, "rainfall": 5.2, "lst": 30.1, "sst": 26.5, "enso": 0.1, "iod": -0.05, "country": "India", "state": "Maharashtra"},
                {"lat": 36.7, "lon": -119.4, "temperature": 22.1, "rainfall": 1.2, "lst": 24.5, "sst": 18.0, "enso": 0.1, "iod": -0.05, "country": "USA", "state": "California"}
            ]

    # Apply scenario overlays and calculate risk scores
    processed_features = []
    for pixel in raw_grid:
        # Apply what-if adjustments
        p_temp = pixel["temperature"] + temp_offset
        p_rain = pixel["rainfall"] * rain_factor
        
        # Calculate Risk and Impact Scores (Rule-based models)
        flood_risk = min(1.0, max(0.0, p_rain / 120.0))
        drought_risk = min(1.0, max(0.0, (35.0 - p_temp) / 15.0)) if p_rain < 2.0 else 0.0
        heatwave_risk = min(1.0, max(0.0, (p_temp - 38.0) / 10.0))
        
        # Aggregate Risk Index (0.0 to 1.0)
        risk_index = max(flood_risk, drought_risk, heatwave_risk)
        
        # Build GeoJSON Geometry Point
        geom = geojson.Point((pixel["lon"], pixel["lat"]))
        feat = geojson.Feature(
            geometry=geom,
            properties={
                "temperature": round(p_temp, 2),
                "rainfall": round(p_rain, 2),
                "lst": round(pixel["lst"], 2),
                "sst": round(pixel["sst"], 2),
                "risk_index": round(risk_index, 2),
                "flood_risk": round(flood_risk, 2),
                "drought_risk": round(drought_risk, 2),
                "heatwave_risk": round(heatwave_risk, 2),
                "country": pixel.get("country", "Unknown"),
                "state": pixel.get("state", "Unknown")
            }
        )
        processed_features.append(feat)
        
    feature_collection = geojson.FeatureCollection(processed_features)
    return {
        "timestamp": timestamp,
        "resolution": resolution,
        "zoom": zoom,
        "geojson": feature_collection
    }

@app.get("/api/alerts")
async def get_alerts():
    # Helper to generate warnings for high risk regions
    state = await get_state(zoom=8.0) # High-res check
    alerts = []
    
    for feat in state["geojson"]["features"]:
        props = feat["properties"]
        coords = feat["geometry"]["coordinates"]
        
        if props["risk_index"] > 0.7:
            level = "Red" if props["risk_index"] > 0.85 else "Orange"
            variable = "rainfall" if props["flood_risk"] > props["heatwave_risk"] else "temperature"
            msg = f"Critical flood risk of {int(props['flood_risk']*100)}%" if variable == "rainfall" else f"Severe heatwave warning: {props['temperature']}°C"
            
            alerts.append({
                "lat": coords[1],
                "lon": coords[0],
                "variable": variable,
                "level": level,
                "message": msg
            })
            
    return {"alerts": alerts[:15]}
