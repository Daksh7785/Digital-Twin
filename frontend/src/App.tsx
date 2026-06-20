import React, { useState, useEffect, useRef } from "react";
import { MapDashboardView } from "./components/MapDashboardView";
import { ScenarioSimulator } from "./components/ScenarioSimulator";
import { AlertPanel } from "./components/AlertPanel";
import { ForecastCharts } from "./components/ForecastCharts";
import { GraphNetworkView } from "./components/GraphNetworkView";
import { ClimateExplainer } from "./components/ClimateExplainer";
import { SectoralAdaptationView } from "./components/SectoralAdaptationView";
import { DataConsumersConfig } from "./components/DataConsumersConfig";

interface GridPixel {
  lat: number;
  lon: number;
  temperature: number;
  rainfall: number;
  lst: number;
  sst: number;
  anomaly_score: number;
  risk_index: number;
  country_name?: string;
  state_name?: string;
  country?: string;
  state?: string;
}

interface Alert {
  lat: number;
  lon: number;
  variable: string;
  type: string;
  level: "Yellow" | "Orange" | "Red";
  desc: string;
}

function App() {
  const [grid, setGrid] = useState<GridPixel[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedParam, setSelectedParam] = useState<"temperature" | "rainfall" | "lst" | "sst" | "risk_index" | "anomaly_score">("temperature");
  const [selectedPixel, setSelectedPixel] = useState<{ lat: number; lon: number } | null>(null);
  const [hoveredPixel, setHoveredPixel] = useState<GridPixel | null>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [globalDrivers, setGlobalDrivers] = useState<{ enso: number; iod: number }>({ enso: 0.15, iod: -0.05 });
  const [systemTime, setSystemTime] = useState<string>("");
  const [zoom, setZoom] = useState<number>(3.0);
  const [timeStep, setTimeStep] = useState<number>(0);
  const [compareCountryA, setCompareCountryA] = useState<string>("India");
  const [compareCountryB, setCompareCountryB] = useState<string>("USA");
  const [compareDataA, setCompareDataA] = useState<any>(null);
  const [compareDataB, setCompareDataB] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize socket stream connection for dynamic real-time twin state feeds
  useEffect(() => {
    fetchInitialState();
    fetchAlerts();

    wsRef.current = new WebSocket("ws://localhost:8000/ws/live");
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.grid) {
        setGrid(data.grid);
      }
      if (data.timestamp) setSystemTime(data.timestamp);
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Fetch state on time slider step changes (simulated animation)
  useEffect(() => {
    fetchInitialState();
  }, [timeStep]);

  // Fetch forecast when a pixel coordinate is selected
  useEffect(() => {
    if (selectedPixel) {
      fetchForecast(selectedPixel.lat, selectedPixel.lon);
    }
  }, [selectedPixel, systemTime]);

  // Handle Country Comparison Updates
  useEffect(() => {
    if (grid.length > 0) {
      const dataA = grid.filter(p => (p.country_name || p.country || "").toLowerCase() === compareCountryA.toLowerCase());
      const dataB = grid.filter(p => (p.country_name || p.country || "").toLowerCase() === compareCountryB.toLowerCase());
      
      const avg = (arr: GridPixel[], key: keyof GridPixel) => 
        arr.length > 0 ? arr.reduce((acc, curr) => acc + (curr[key] as number), 0) / arr.length : 0;

      setCompareDataA({
        temp: avg(dataA, "temperature"),
        rain: avg(dataA, "rainfall"),
        risk: avg(dataA, "risk_index"),
        anomaly: avg(dataA, "anomaly_score")
      });

      setCompareDataB({
        temp: avg(dataB, "temperature"),
        rain: avg(dataB, "rainfall"),
        risk: avg(dataB, "risk_index"),
        anomaly: avg(dataB, "anomaly_score")
      });
    }
  }, [compareCountryA, compareCountryB, grid]);

  const fetchInitialState = async () => {
    try {
      const res = await fetch(`http://localhost:8000/global/map`);
      const data = await res.json();
      setGrid(data.grid || []);
      setSystemTime(datetimeToString(timeStep));
    } catch (e) {
      console.error("Connection error loading initial state:", e);
    }
  };

  const datetimeToString = (step: number) => {
    const d = new Date();
    d.setDate(d.getDate() + step);
    return d.toISOString();
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (e) {
      // Mock alerts if service down
      setAlerts([
        { lat: 21.0, lon: 78.0, variable: "temperature", type: "heatwave", level: "Orange", desc: "Monsoon delay & regional heatwave watch in central India" }
      ]);
    }
  };

  const fetchForecast = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`http://localhost:8000/forecast/global?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      setForecast(data.forecast);
    } catch (e) {
      console.error("Error loading forecast data:", e);
    }
  };

  const handleApplyScenario = async (tempChange: number, rainChange: number) => {
    try {
      await fetch("http://localhost:8000/scenario/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temp_change: tempChange, rain_change: rainChange, el_nino_la_nina: "Neutral" })
      });
      // Instantly trigger overlay simulation on frontend grid
      setGrid(prev => prev.map(p => ({
        ...p,
        temperature: p.temperature + tempChange,
        rainfall: Math.max(0, p.rainfall * (1.0 + rainChange)),
        risk_index: Math.min(1.0, Math.max(0.0, p.risk_index + (tempChange * 0.05)))
      })));
    } catch (e) {
      console.error("Error applying scenario simulation:", e);
    }
  };

  const activePixelData = grid.find(
    p => selectedPixel && Math.abs(p.lat - selectedPixel.lat) < 0.1 && Math.abs(p.lon - selectedPixel.lon) < 0.1
  ) || grid[0] || { temperature: 28.4, rainfall: 5.2, lst: 30.1, sst: 26.5, state_name: "Maharashtra", country_name: "India", risk_index: 0.25 };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "1.5rem", gap: "1.5rem", backgroundColor: "#060913" }}>
      {/* Header Bar */}
      <header className="glass" style={{ padding: "1.25rem 2rem", display: "flex", justifySelf: "stretch", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: "bold", background: "linear-gradient(90deg, #60a5fa, #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            🌍 GLOBAL EARTH CLIMATE DIGITAL TWIN
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            Live Spatial Simulation, Anomaly Predictor, & Closed-Loop Kalman Assimilation
          </p>
        </div>
        <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem" }}>
          <div>
            <span style={{ color: "#64748b" }}>ENSO Index:</span>{" "}
            <span style={{ color: "#3b82f6", fontWeight: "bold" }}>{globalDrivers.enso.toFixed(2)}</span>
          </div>
          <div>
            <span style={{ color: "#64748b" }}>IOD Index:</span>{" "}
            <span style={{ color: "#10b981", fontWeight: "bold" }}>{globalDrivers.iod.toFixed(2)}</span>
          </div>
          <div>
            <span style={{ color: "#64748b" }}>Cycle Timestamp:</span>{" "}
            <span style={{ color: "#f43f5e", fontWeight: "bold" }}>{systemTime || "Synchronizing Feed..."}</span>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main style={{ display: "grid", gridTemplateColumns: "3.2fr 1.2fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Left Column Map Panel */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.9rem", color: "#94a3b8", fontWeight: "bold" }}>Geospatial Heatmap Overlays:</span>
              <span style={{ fontSize: "0.8rem", color: "#60a5fa" }}>Grid Resolution: 1° x 1° Global</span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {(["temperature", "rainfall", "lst", "sst", "risk_index", "anomaly_score"] as const).map((param) => (
                <button
                  key={param}
                  onClick={() => setSelectedParam(param)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "6px",
                    border: selectedParam === param ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.05)",
                    backgroundColor: selectedParam === param ? "rgba(59, 130, 246, 0.15)" : "transparent",
                    color: selectedParam === param ? "#60a5fa" : "#94a3b8",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    fontSize: "0.75rem",
                    fontWeight: "600"
                  }}
                >
                  {param.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          
          <MapDashboardView
            grid={grid}
            selectedParam={selectedParam}
            onSelectPixel={(lat, lon) => setSelectedPixel({ lat, lon })}
            onHoverPixel={setHoveredPixel}
            onZoomChange={setZoom}
            selectedPixel={selectedPixel}
          />

          {/* Time Loop Slider Control */}
          <div className="glass" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#94a3b8" }}>
              <span>📅 Time Slider Mode (Assimilated Step Progression)</span>
              <span style={{ color: "#3b82f6", fontWeight: "bold" }}>Forecast Step: +{timeStep} Days</span>
            </div>
            <input
              type="range"
              min="0"
              max="14"
              step="1"
              value={timeStep}
              onChange={(e) => setTimeStep(parseInt(e.target.value))}
              style={{ width: "100%", accentColor: "#3b82f6" }}
            />
          </div>
        </section>

        {/* Right Column Control Panels & Hover Intelligence */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Hover Cursor Card */}
          <div className="glass" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.9rem", color: "#60a5fa", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>🖱️</span> Live Cursor Intelligence
            </h3>
            {hoveredPixel ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.8rem", color: "#94a3b8" }}>
                <div>Region: <strong style={{ color: "#f1f5f9" }}>{hoveredPixel.state_name || hoveredPixel.state}, {hoveredPixel.country_name || hoveredPixel.country}</strong></div>
                <div>Lat/Lon: <strong style={{ color: "#f1f5f9" }}>({hoveredPixel.lat.toFixed(1)}°, {hoveredPixel.lon.toFixed(1)}°)</strong></div>
                <div>Temperature: <strong style={{ color: "#f97316" }}>{hoveredPixel.temperature.toFixed(1)} °C</strong></div>
                <div>Precipitation: <strong style={{ color: "#3b82f6" }}>{hoveredPixel.rainfall.toFixed(1)} mm</strong></div>
                <div>Risk Coefficient: <strong style={{ color: hoveredPixel.risk_index > 0.6 ? "#ef4444" : "#22c55e" }}>{(hoveredPixel.risk_index * 100).toFixed(0)}%</strong></div>
                <div>Anomaly Score: <strong style={{ color: "#d946ef" }}>{hoveredPixel.anomaly_score.toFixed(2)}</strong></div>
              </div>
            ) : (
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontStyle: "italic" }}>
                Hover cursor over any grid node to capture spatial climate frames instantly.
              </div>
            )}
          </div>

          <ScenarioSimulator onApplyScenario={handleApplyScenario} />
          
          {/* Country Comparer Card */}
          <div className="glass" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.9rem", color: "#f1f5f9", marginBottom: "0.75rem" }}>📊 Multi-Country Climate Comparison</h3>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <select
                value={compareCountryA}
                onChange={(e) => setCompareCountryA(e.target.value)}
                style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", padding: "0.3rem", borderRadius: "4px", fontSize: "0.75rem" }}
              >
                <option value="India">India</option>
                <option value="USA">USA</option>
                <option value="Brazil">Brazil</option>
                <option value="France">France</option>
              </select>
              <span style={{ alignSelf: "center", color: "#64748b", fontSize: "0.75rem" }}>VS</span>
              <select
                value={compareCountryB}
                onChange={(e) => setCompareCountryB(e.target.value)}
                style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", padding: "0.3rem", borderRadius: "4px", fontSize: "0.75rem" }}
              >
                <option value="USA">USA</option>
                <option value="India">India</option>
                <option value="Brazil">Brazil</option>
                <option value="France">France</option>
              </select>
            </div>
            {compareDataA && compareDataB ? (
              <table style={{ width: "100%", fontSize: "0.7rem", color: "#94a3b8", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <th style={{ textAlign: "left", padding: "4px 0" }}>Metric</th>
                    <th style={{ textAlign: "right" }}>{compareCountryA}</th>
                    <th style={{ textAlign: "right" }}>{compareCountryB}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "4px 0" }}>Avg Temp</td>
                    <td style={{ textAlign: "right", color: "#f97316" }}>{compareDataA.temp.toFixed(1)} °C</td>
                    <td style={{ textAlign: "right", color: "#f97316" }}>{compareDataB.temp.toFixed(1)} °C</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0" }}>Avg Rain</td>
                    <td style={{ textAlign: "right", color: "#3b82f6" }}>{compareDataA.rain.toFixed(1)} mm</td>
                    <td style={{ textAlign: "right", color: "#3b82f6" }}>{compareDataB.rain.toFixed(1)} mm</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 0" }}>Avg Risk</td>
                    <td style={{ textAlign: "right", color: "#22c55e" }}>{(compareDataA.risk * 100).toFixed(0)}%</td>
                    <td style={{ textAlign: "right", color: "#22c55e" }}>{(compareDataB.risk * 100).toFixed(0)}%</td>
                  </tr>
                </tbody>
              </table>
            ) : null}
          </div>

          <AlertPanel alerts={alerts} />
        </section>
      </main>

      {/* Adaptation & Consumers Config Section */}
      <section style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
        <SectoralAdaptationView
          temperature={activePixelData.temperature}
          rainfall={activePixelData.rainfall}
          lst={activePixelData.lst}
          sst={activePixelData.sst}
          riskIndex={activePixelData.risk_index}
          locationName={`${activePixelData.state_name || activePixelData.state || "Maharashtra"}, ${activePixelData.country_name || activePixelData.country || "India"}`}
        />
        <DataConsumersConfig currentGridData={grid} />
      </section>

      {/* Bottom Chart View Section */}
      <section style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
        <ForecastCharts forecast={forecast} lat={selectedPixel?.lat || 0} lon={selectedPixel?.lon || 0} />
        <ClimateExplainer enso={globalDrivers.enso} iod={globalDrivers.iod} />
      </section>

      {/* Network Resilience Section */}
      <section>
        <GraphNetworkView />
      </section>
    </div>
  );
}

export default App;
