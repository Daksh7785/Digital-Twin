import sqlite3
from datetime import datetime

DATABASE_NAME = "climate_twin.db"

def init_db():
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    # 1. climate_observations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS climate_observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        lat REAL,
        lon REAL,
        rainfall REAL,
        temperature REAL,
        lst REAL,
        sst REAL,
        enso REAL,
        iod REAL
    )
    """)
    
    # 2. climate_forecast
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS climate_forecast (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        forecast_time TEXT,
        lat REAL,
        lon REAL,
        rain_pred REAL,
        temp_pred REAL,
        confidence REAL,
        p10_temp REAL,
        p90_temp REAL,
        p10_rain REAL,
        p90_rain REAL
    )
    """)
    
    # 3. extreme_events
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS extreme_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        event_type TEXT,
        severity TEXT,
        lat REAL,
        lon REAL,
        probability REAL,
        description TEXT
    )
    """)
    
    # 4. model_performance (Self-Learning Loop)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS model_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        lat REAL,
        lon REAL,
        temp_rmse REAL,
        rain_rmse REAL,
        total_samples INTEGER
    )
    """)
    
    conn.commit()
    conn.close()

def log_observation(timestamp: str, lat: float, lon: float, rainfall: float, temp: float, lst: float, sst: float, enso: float, iod: float):
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO climate_observations (timestamp, lat, lon, rainfall, temperature, lst, sst, enso, iod)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (timestamp, lat, lon, rainfall, temp, lst, sst, enso, iod))
    conn.commit()
    conn.close()

def log_forecast(forecast_time: str, lat: float, lon: float, rain_pred: float, temp_pred: float, confidence: float, p10_t: float, p90_t: float, p10_r: float, p90_r: float):
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO climate_forecast (forecast_time, lat, lon, rain_pred, temp_pred, confidence, p10_temp, p90_temp, p10_rain, p90_rain)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (forecast_time, lat, lon, rain_pred, temp_pred, confidence, p10_t, p90_t, p10_r, p90_r))
    conn.commit()
    conn.close()

def log_performance(timestamp: str, lat: float, lon: float, temp_rmse: float, rain_rmse: float, samples: int):
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO model_performance (timestamp, lat, lon, temp_rmse, rain_rmse, total_samples)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (timestamp, lat, lon, temp_rmse, rain_rmse, samples))
    conn.commit()
    conn.close()

def get_historical_errors():
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT timestamp, AVG(temp_rmse), AVG(rain_rmse) FROM model_performance GROUP BY timestamp ORDER BY id DESC LIMIT 20")
    rows = cursor.fetchall()
    conn.close()
    return [{"timestamp": r[0], "temp_rmse": r[1], "rain_rmse": r[2]} for r in rows]
