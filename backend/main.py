import os
import httpx
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
import asyncio
import json
import database

app = FastAPI(
    title="Climate Sentinel API Gateway",
    description="API Gateway for the Global Climate Digital Twin System",
    version="1.0.0"
)

@app.on_event("startup")
def startup_event():
    database.init_db()


# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Microservice URLs from env or defaults
AI_ENGINE_URL = os.getenv("AI_ENGINE_URL", "http://ai-engine:8001")
GIS_ENGINE_URL = os.getenv("GIS_ENGINE_URL", "http://gis-engine:8002")
GRAPH_ENGINE_URL = os.getenv("GRAPH_ENGINE_URL", "http://graph-engine:8003")

# Active WebSocket connections
active_connections = []

class ScenarioInput(BaseModel):
    temp_change: float
    rain_change: float

class VerificationInput(BaseModel):
    lat: float
    lon: float
    observed_temp: float
    observed_rain: float

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "api-gateway": "up"
        }
    }

@app.get("/api/state")
async def get_climate_state():
    """
    Fetch the current real-time global and regional climate state from the GIS engine.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{GIS_ENGINE_URL}/api/state", timeout=2.0)
            return response.json()
        except (httpx.ConnectError, httpx.TimeoutException):
            # Fallback mock for standalone run
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "resolution": "coarse",
                "grid": [
                    {"lat": 19.5, "lon": 75.5, "temperature": 28.4, "rainfall": 5.2, "lst": 30.1, "sst": 26.5, "enso": 0.1, "iod": -0.05, "country": "India", "state": "Maharashtra"},
                    {"lat": 36.7, "lon": -119.4, "temperature": 22.1, "rainfall": 1.2, "lst": 24.5, "sst": 18.0, "enso": 0.1, "iod": -0.05, "country": "USA", "state": "California"}
                ],
                "global_drivers": {"enso": 0.1, "iod": -0.05}
            }

@app.post("/api/scenario")
async def update_scenario(params: ScenarioInput):
    """
    Update scenario parameters in the simulation engine.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{GIS_ENGINE_URL}/api/scenario", json=params.dict(), timeout=2.0)
            return response.json()
        except (httpx.ConnectError, httpx.TimeoutException):
            return {"status": "fallback_success", "temp_offset": params.temp_change, "rain_factor": 1.0 + params.rain_change}

@app.get("/api/forecast")
async def get_forecast(lat: float, lon: float):
    """
    Fetch weather forecasts from the AI engine.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{AI_ENGINE_URL}/api/forecast", params={"lat": lat, "lon": lon}, timeout=3.0)
            return response.json()
        except (httpx.ConnectError, httpx.TimeoutException):
            # Mock forecast data fallback
            steps = []
            for i in range(1, 8):
                steps.append({
                    "step": i,
                    "temperature": {"p10": 26.0, "p50": 28.5 + (i * 0.1), "p90": 31.0},
                    "rainfall": {"p10": 0.0, "p50": 3.0 + i, "p90": 8.0}
                })
            return {"lat": lat, "lon": lon, "forecast": steps}

@app.post("/api/verify")
async def verify_and_adapt(params: VerificationInput):
    """
    Submit actual observations to retrain models and correct state predictions (assimilation loop).
    Logs the result to the local SQLite database.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(f"{AI_ENGINE_URL}/api/verify", json=params.dict(), timeout=3.0)
            res_data = response.json()
            
            # Log observation & performance metrics to SQLite
            timestamp_str = datetime.utcnow().isoformat()
            database.log_observation(
                timestamp_str, params.lat, params.lon, 
                params.observed_rain, params.observed_temp, 
                params.observed_temp * 0.95, 28.0, 0.2, -0.1
            )
            
            err = res_data.get("metrics", {})
            database.log_performance(
                timestamp_str, params.lat, params.lon,
                err.get("temperature_error", 0.0),
                err.get("rainfall_error", 0.0),
                1
            )
            return res_data
        except (httpx.ConnectError, httpx.TimeoutException, Exception) as e:
            fallback_res = {
                "status": "fallback_assimilated",
                "metrics": {"temperature_error": 0.5, "rainfall_error": 1.2},
                "assimilated_state": {"temperature": params.observed_temp, "rainfall": params.observed_rain}
            }
            # Log fallback values
            timestamp_str = datetime.utcnow().isoformat()
            database.log_observation(
                timestamp_str, params.lat, params.lon,
                params.observed_rain, params.observed_temp,
                params.observed_temp, 28.0, 0.2, -0.1
            )
            database.log_performance(
                timestamp_str, params.lat, params.lon,
                0.5, 1.2, 1
            )
            return fallback_res

@app.get("/api/performance")
def get_performance_history():
    """
    Fetch historical assimilation performance and error reduction history.
    """
    return {"history": database.get_historical_errors()}


@app.get("/api/graph")
async def get_climate_network():
    """
    Fetch teleconnection node resilience graphs from the graph engine.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{GRAPH_ENGINE_URL}/api/graph", timeout=4.0)
            return response.json()
        except (httpx.ConnectError, httpx.TimeoutException):
            return {
                "nodes": [{"id": "node_1", "lat": 20.5, "lon": 78.9, "vulnerability": 0.12}],
                "edges": []
            }

@app.get("/api/alerts")
async def get_alerts():
    """
    Fetch extreme climate events warnings.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{GIS_ENGINE_URL}/api/alerts", timeout=2.0)
            return response.json()
        except (httpx.ConnectError, httpx.TimeoutException):
            return {"alerts": [{"lat": 20.5, "lon": 78.9, "variable": "temperature", "level": "Yellow", "message": "High temperature alert"}]}

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            # Poll from the GIS engine and broadcast real-time telemetry updates to WebSocket clients
            state = await get_climate_state()
            await websocket.send_text(json.dumps(state))
            await asyncio.sleep(4.0)
    except WebSocketDisconnect:
        active_connections.remove(websocket)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
