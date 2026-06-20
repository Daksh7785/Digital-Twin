import React, { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Line } from "recharts";

interface ErrorMetric {
  timestamp: string;
  temp_rmse: number;
  rain_rmse: number;
}

export const ErrorCharts: React.FC = () => {
  const [errorHistory, setErrorHistory] = useState<ErrorMetric[]>([]);

  useEffect(() => {
    const fetchErrors = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/errors");
        const data = await res.json();
        if (data.errors) {
          setErrorHistory(data.errors.reverse());
        }
      } catch (e) {
        console.error("Connection error loading verification log:", e);
      }
    };

    fetchErrors();
    const interval = setInterval(fetchErrors, 6000); // Reload RMSE metric timeline
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass" style={{ padding: "1.5rem" }}>
      <h3 style={{ fontSize: "1.05rem", color: "#f1f5f9", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span>📈</span> Self-Learning Loop: Model Verification Error (RMSE)
      </h3>
      <div style={{ height: "240px" }}>
        {errorHistory.length === 0 ? (
          <div style={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center", color: "#64748b", fontSize: "0.85rem" }}>
            No error logging samples recorded yet. Run model verification steps to feed calibration history.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={errorHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="timestamp" stroke="#64748b" style={{ fontSize: "10px" }} />
              <YAxis stroke="#64748b" style={{ fontSize: "10px" }} />
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }} />
              <Line type="monotone" dataKey="temp_rmse" stroke="#f43f5e" strokeWidth={2} name="Temp RMSE (°C)" dot={false} />
              <Line type="monotone" dataKey="rain_rmse" stroke="#3b82f6" strokeWidth={2} name="Rain RMSE (mm)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
