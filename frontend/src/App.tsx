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
  const [selectedParam, setSelectedParam] = useState<"temperature" | "rainfall" | "lst" | "sst" | "risk_index" | "flood_risk" | "drought_risk" | "heatwave_risk">("temperature");
  const [selectedPixel, setSelectedPixel] = useState<{ lat: number; lon: number } | null>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [globalDrivers, setGlobalDrivers] = useState<{ enso: number; iod: number }>({ enso: 0, iod: 0 });
  const [systemTime, setSystemTime] = useState<string>("");
  const [zoom, setZoom] = useState<number>(5.0);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize socket stream connection for dynamic real-time twin state feeds
  useEffect(() => {
    fetchInitialState(zoom);
    fetchAlerts();

    wsRef.current = new WebSocket("ws://localhost:8000/ws/stream");
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.grid) setGrid(data.grid);
      if (data.global_drivers) setGlobalDrivers(data.global_drivers);
      if (data.timestamp) setSystemTime(data.timestamp);
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Fetch state on zoom changes
  useEffect(() => {
    fetchInitialState(zoom);
  }, [zoom]);

  // Fetch forecast when a pixel coordinate is selected
  useEffect(() => {
    if (selectedPixel) {
      fetchForecast(selectedPixel.lat, selectedPixel.lon);
    }
  }, [selectedPixel, systemTime]);

  const fetchInitialState = async (currentZoom: number) => {
    try {
      const res = await fetch(`http://localhost:8000/api/state?zoom=${currentZoom}`);
      const data = await res.json();
      setGrid(data.grid || data.geojson?.features.map((f: any) => ({
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        ...f.properties
      })) || []);
      if (data.global_drivers) setGlobalDrivers(data.global_drivers);
      if (data.timestamp) setSystemTime(data.timestamp);
    } catch (e) {
      console.error("Connection error loading initial state:", e);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/alerts");
      const data = await res.json();
      setAlerts(data.alerts);
    } catch (e) {
      console.error("Error fetching live warnings:", e);
    }
  };

  const fetchForecast = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`http://localhost:8000/api/forecast?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      setForecast(data.forecast);
    } catch (e) {
      console.error("Error loading forecast data:", e);
    }
  };

  const handleApplyScenario = async (tempChange: number, rainChange: number) => {
    try {
      await fetch("http://localhost:8000/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temp_change: tempChange, rain_change: rainChange })
      });
      // Refresh observations and update alerts list immediately
      fetchInitialState();
      fetchAlerts();
    } catch (e) {
      console.error("Error applying scenario simulation:", e);
    }
  };

  const activePixelData = grid.find(
    p => selectedPixel && Math.abs(p.lat - selectedPixel.lat) < 0.01 && Math.abs(p.lon - selectedPixel.lon) < 0.01
  ) || grid[0] || { temperature: 28.4, rainfall: 5.2, lst: 30.1, sst: 26.5, state: "Maharashtra", country: "India" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "1.5rem", gap: "1.5rem" }}>
      {/* Header Bar */}
      <header className="glass" style={{ padding: "1.25rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", background: "linear-gradient(90deg, #60a5fa, #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            CLIMATE SENTINEL: INDIA CLIMATE DIGITAL TWIN
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            High-Fidelity Virtual Climate Simulator & AI Forecast Hub
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
            <span style={{ color: "#64748b" }}>Time Cycle:</span>{" "}
            <span style={{ color: "#f43f5e", fontWeight: "bold" }}>{systemTime || "Connecting..."}</span>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main style={{ display: "grid", gridTemplateColumns: "3fr 1.2fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Left Column Map Panel */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.9rem", color: "#94a3b8", fontWeight: "bold" }}>Grid Visualization Layer:</span>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {(["temperature", "rainfall", "lst", "sst", "risk_index", "flood_risk", "drought_risk", "heatwave_risk"] as const).map((param) => (
                <button
                  key={param}
                  onClick={() => setSelectedParam(param)}
                  style={{
                    padding: "0.4rem 0.75rem",
                    borderRadius: "6px",
                    border: selectedParam === param ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.05)",
                    backgroundColor: selectedParam === param ? "rgba(59, 130, 246, 0.15)" : "transparent",
                    color: selectedParam === param ? "#60a5fa" : "#94a3b8",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    fontSize: "0.75rem",
                    fontWeight: "500"
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
            onZoomChange={setZoom}
            selectedPixel={selectedPixel}
          />
        </section>

        {/* Right Column Control Panels */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <ScenarioSimulator onApplyScenario={handleApplyScenario} />
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
          riskIndex={activePixelData.risk_index || 0}
          locationName={`${activePixelData.state || "Maharashtra"}, ${activePixelData.country || "India"}`}
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
