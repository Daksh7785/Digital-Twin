import pytest
from fastapi.testclient import TestClient
import sys
import os

# Include backend path in sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))
from main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"

def test_global_map_endpoint():
    response = client.get("/global/map")
    assert response.status_code == 200
    data = response.json()
    assert "grid" in data
    assert len(data["grid"]) > 0

def test_country_analytics_endpoint():
    response = client.get("/country/India")
    assert response.status_code == 200
    data = response.json()
    assert "country" in data
    assert "grid" in data

def test_cursor_data_endpoint():
    response = client.get("/cursor/data?lat=21.5&lon=77.5")
    assert response.status_code == 200
    data = response.json()
    assert "lat" in data
    assert "lon" in data
    assert "temperature" in data
    assert "rainfall" in data

def test_scenario_run_endpoint():
    response = client.post("/scenario/run", json={
        "temp_change": 2.0,
        "rain_change": -0.2,
        "el_nino_la_nina": "El Nino"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["scenarios_offset"]["temp_change"] == 2.0

def test_risk_compute_endpoint():
    response = client.get("/risk/compute?lat=21.5&lon=77.5")
    assert response.status_code == 200
    data = response.json()
    assert "flood_risk" in data
    assert "drought_risk" in data
    assert "overall_risk" in data

def test_verify_and_adapt_endpoint():
    response = client.post("/api/verify", json={
        "lat": 21.5,
        "lon": 77.5,
        "observed_temp": 30.5,
        "observed_rain": 10.0
    })
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "assimilated_state" in data
