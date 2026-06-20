import React from "react";
import { ResponsiveContainer, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Area } from "recharts";

interface ForecastData {
  step: number;
  temperature: { p10: number; p50: number; p90: number };
  rainfall: { p10: number; p50: number; p90: number };
}

interface ForecastChartsProps {
  forecast: ForecastData[];
  lat: number;
  lon: number;
}

export const ForecastCharts: React.FC<ForecastChartsProps> = ({ forecast, lat, lon }) => {
  if (!forecast || forecast.length === 0) {
    return (
      <div className="glass" style={{ padding: "2rem", display: "flex", justifyContent: "center", alignItems: "center", color: "#94a3b8" }}>
        Select a coordinate pixel on the map to display 7-day probabilistic forecast charts.
      </div>
    );
  }

  // Pre-process forecast arrays for chart binding
  const tempData = forecast.map((f) => ({
    name: `Day ${f.step}`,
    p50: parseFloat(f.temperature.p50.toFixed(1)),
    range: [parseFloat(f.temperature.p10.toFixed(1)), parseFloat(f.temperature.p90.toFixed(1))]
  }));

  const rainData = forecast.map((f) => ({
    name: `Day ${f.step}`,
    p50: parseFloat(f.rainfall.p50.toFixed(1)),
    range: [parseFloat(f.rainfall.p10.toFixed(1)), parseFloat(f.rainfall.p90.toFixed(1))]
  }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
      <div className="glass" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1rem", color: "#f1f5f9", marginBottom: "1rem" }}>
          🌡️ Temp Probability (Lat: {lat}, Lon: {lon})
        </h3>
        <div style={{ height: "240px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tempData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: "11px" }} />
              <YAxis stroke="#64748b" style={{ fontSize: "11px" }} />
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }} />
              <Area type="monotone" dataKey="range" stroke="transparent" fill="#f43f5e" fillOpacity={0.15} />
              <Area type="monotone" dataKey="p50" stroke="#f43f5e" strokeWidth={2} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1rem", color: "#f1f5f9", marginBottom: "1rem" }}>
          🌧️ Rain Probability (Lat: {lat}, Lon: {lon})
        </h3>
        <div style={{ height: "240px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rainData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: "11px" }} />
              <YAxis stroke="#64748b" style={{ fontSize: "11px" }} />
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }} />
              <Area type="monotone" dataKey="range" stroke="transparent" fill="#3b82f6" fillOpacity={0.15} />
              <Area type="monotone" dataKey="p50" stroke="#3b82f6" strokeWidth={2} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
