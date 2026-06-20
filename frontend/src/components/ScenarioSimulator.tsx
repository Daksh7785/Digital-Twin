import React, { useState } from "react";

interface ScenarioSimulatorProps {
  onApplyScenario: (tempChange: number, rainChange: number) => void;
}

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({ onApplyScenario }) => {
  const [temp, setTemp] = useState<number>(0.0);
  const [rain, setRain] = useState<number>(0.0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyScenario(temp, rain);
  };

  const handleReset = () => {
    setTemp(0.0);
    setRain(0.0);
    onApplyScenario(0.0, 0.0);
  };

  return (
    <div className="glass" style={{ padding: "1.5rem", height: "100%" }}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "#f1f5f9", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span>🎛️</span> "What-If" Scenario Control
      </h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <label style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            <span>Temperature Adjustment</span>
            <span style={{ color: "#f1f5f9", fontWeight: "bold" }}>{temp > 0 ? `+${temp}` : temp} °C</span>
          </label>
          <input
            type="range"
            min="-3"
            max="3"
            step="0.5"
            value={temp}
            onChange={(e) => setTemp(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#f43f5e" }}
          />
        </div>

        <div>
          <label style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            <span>Rainfall Deviation</span>
            <span style={{ color: "#f1f5f9", fontWeight: "bold" }}>{(rain * 100).toFixed(0)}%</span>
          </label>
          <input
            type="range"
            min="-0.5"
            max="0.5"
            step="0.05"
            value={rain}
            onChange={(e) => setRain(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#3b82f6" }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
          <button
            type="submit"
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "#fff",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "background-color 0.2s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#1d4ed8")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
          >
            Apply Scenario
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: "0.75rem",
              borderRadius: "6px",
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "transparent",
              color: "#94a3b8",
              cursor: "pointer",
              transition: "background-color 0.2s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            Reset
          </button>
        </div>
      </form>

      <div style={{ marginTop: "1.5rem", padding: "1rem", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)" }}>
        <h4 style={{ fontSize: "0.85rem", color: "#f1f5f9", marginBottom: "0.5rem" }}>Projected Multi-Sector Impact</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.75rem", color: "#94a3b8" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>🌾 Crop Yield Sensitivity:</span>
            <span style={{ color: temp > 1.5 ? "#f43f5e" : "#10b981", fontWeight: "bold" }}>
              {temp > 1.5 ? "Severe Stress (-15%)" : "Stable"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>💧 Reservoir Status:</span>
            <span style={{ color: rain < -0.15 ? "#f43f5e" : "#10b981", fontWeight: "bold" }}>
              {rain < -0.15 ? "Deficit warning" : "Normal"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
