import React from "react";

interface Alert {
  lat: number;
  lon: number;
  variable: string;
  type: string;
  level: "Yellow" | "Orange" | "Red";
  desc: string;
}

interface AlertPanelProps {
  alerts: Alert[];
}

export const AlertPanel: React.FC<AlertPanelProps> = ({ alerts }) => {
  const getBadgeStyle = (level: string) => {
    switch (level) {
      case "Red":
        return { backgroundColor: "rgba(239, 68, 68, 0.2)", border: "1px solid #ef4444", color: "#f87171" };
      case "Orange":
        return { backgroundColor: "rgba(249, 115, 22, 0.2)", border: "1px solid #f97316", color: "#fb923c" };
      default:
        return { backgroundColor: "rgba(234, 179, 8, 0.2)", border: "1px solid #eab308", color: "#fde047" };
    }
  };

  return (
    <div className="glass" style={{ padding: "1.5rem", height: "100%", overflowY: "auto" }}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "#f1f5f9", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span>⚠️</span> Live Climate Alerts & Warnings
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {alerts.length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: "0.875rem", padding: "1rem", textAlign: "center" }}>
            All systems normal. No warnings.
          </div>
        ) : (
          alerts.map((alert, idx) => (
            <div
              key={idx}
              style={{
                padding: "0.85rem",
                borderRadius: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                borderLeft: `4px solid ${alert.level === "Red" ? "#ef4444" : (alert.level === "Orange" ? "#f97316" : "#eab308")}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#f1f5f9" }}>{alert.type}</span>
                <span style={{ fontSize: "0.75rem", padding: "0.1rem 0.4rem", borderRadius: "4px", ...getBadgeStyle(alert.level) }}>
                  {alert.level}
                </span>
              </div>
              <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: "0.25rem" }}>{alert.desc}</p>
              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                Location: Lat {alert.lat.toFixed(1)}, Lon {alert.lon.toFixed(1)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
