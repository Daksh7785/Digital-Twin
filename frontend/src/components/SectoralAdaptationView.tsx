import React from "react";

interface SectoralAdaptationViewProps {
  temperature: number;
  rainfall: number;
  lst: number;
  sst: number;
  riskIndex: number;
  locationName: string;
}

export const SectoralAdaptationView: React.FC<SectoralAdaptationViewProps> = ({
  temperature,
  rainfall,
  lst,
  sst,
  riskIndex,
  locationName
}) => {
  // 1. Agriculture: Crop Water Stress Index (CWSI) approximation
  // CWSI = (dT - dT_min) / (dT_max - dT_min)
  // dT is LST - AirTemp
  const dt = lst - temperature;
  const cwsi = Math.min(1.0, Math.max(0.0, (dt + 2.0) / 10.0));
  
  // Penman-Monteith derived irrigation advisory
  const evapotranspiration = Math.max(1.0, (temperature * 0.15) + (lst * 0.05) - (rainfall * 0.1));
  const cropWaterRequirement = Math.max(0.0, evapotranspiration * 1.2 - rainfall);

  // 2. Water Management: SCS Curve Number Runoff Calculation (standard hydrology model)
  // P (rainfall in mm). CN = 75 (default mixed agricultural/soil class)
  // Potential retention S = 25400 / CN - 254
  const cn = 75;
  const S = 25400 / cn - 254; // S ~ 84.6 mm
  const Ia = 0.2 * S; // Initial abstraction
  const P = rainfall;
  const runoff = P > Ia ? Math.pow(P - Ia, 2) / (P - Ia + S) : 0.0;

  // Reservoir inflow risk rating
  const reservoirRisk = rainfall > 80 ? "Surge Warning (High Inflow)" : rainfall < 2.0 ? "Critical Deficit (Depletion Risk)" : "Stable Inflow";

  // 3. Disaster Risk Classification
  const heatwaveStatus = temperature >= 40.0 
    ? "Extreme Alert (Severe Heatwave)" 
    : temperature >= 36.0 
    ? "Warning (Moderate Heatwave)" 
    : "Normal Range";

  const floodStatus = runoff > 30.0 
    ? "High Runoff (Flash Flood Warning)" 
    : runoff > 10.0 
    ? "Moderate Runoff (Watch)" 
    : "Safe (Minimal Runoff)";

  const droughtStatus = (cwsi > 0.7 && rainfall < 5.0) 
    ? "Severe Soil Drought (Critical)" 
    : cwsi > 0.4 
    ? "Mild Stress (Advisory)" 
    : "No Stress (Satisfactory)";

  return (
    <div className="glass" style={{ padding: "1.5rem", height: "100%" }}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: "0.25rem", color: "#f1f5f9" }}>
        🌾 Climate Adaptation & Sectoral Impact Advisor
      </h2>
      <p style={{ color: "#64748b", fontSize: "0.80rem", marginBottom: "1.25rem" }}>
        Dynamic model outputs for climate-sensitive sectors in <strong>{locationName || "Selected Coordinates"}</strong>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        
        {/* AGRICULTURE SECTION */}
        <div style={{
          backgroundColor: "rgba(16, 185, 129, 0.05)",
          border: "1px solid rgba(16, 185, 129, 0.15)",
          padding: "1rem",
          borderRadius: "8px"
        }}>
          <h3 style={{ fontSize: "0.9rem", color: "#10b981", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>🌾</span> Agriculture
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.75rem", color: "#94a3b8" }}>
            <div>
              <span>Crop Water Stress (CWSI):</span>
              <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "3px", marginTop: "4px", position: "relative" }}>
                <div style={{
                  height: "100%",
                  width: `${cwsi * 100}%`,
                  backgroundColor: cwsi > 0.7 ? "#ef4444" : cwsi > 0.4 ? "#eab308" : "#10b981",
                  borderRadius: "3px"
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", marginTop: "2px" }}>
                <span>Optimized</span>
                <strong style={{ color: cwsi > 0.6 ? "#f43f5e" : "#f1f5f9" }}>{(cwsi * 100).toFixed(0)}%</strong>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.5rem" }}>
              <span>Daily Irrigation Need:</span>
              <strong style={{ color: "#f1f5f9" }}>{cropWaterRequirement.toFixed(1)} mm/day</strong>
            </div>
            <div style={{ color: cropWaterRequirement > 4.0 ? "#f97316" : "#10b981", fontSize: "0.7rem", fontWeight: "bold" }}>
              {cropWaterRequirement > 4.0 ? "⚠️ High Evapotranspiration: Increase Watering" : "✓ Soil Hydration Adequate"}
            </div>
          </div>
        </div>

        {/* WATER RESOURCES */}
        <div style={{
          backgroundColor: "rgba(59, 130, 246, 0.05)",
          border: "1px solid rgba(59, 130, 246, 0.15)",
          padding: "1rem",
          borderRadius: "8px"
        }}>
          <h3 style={{ fontSize: "0.9rem", color: "#3b82f6", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>💧</span> Water Management
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.75rem", color: "#94a3b8" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>SCS Runoff Inflow:</span>
              <strong style={{ color: "#f1f5f9" }}>{runoff.toFixed(2)} mm</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Potential Retention:</span>
              <strong style={{ color: "#f1f5f9" }}>{S.toFixed(1)} mm</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.5rem" }}>
              <span>Reservoir Storage Risk:</span>
              <strong style={{
                color: reservoirRisk.includes("Surge") ? "#ef4444" : reservoirRisk.includes("Deficit") ? "#f97316" : "#10b981"
              }}>{reservoirRisk}</strong>
            </div>
          </div>
        </div>

        {/* DISASTER RISK */}
        <div style={{
          backgroundColor: "rgba(244, 63, 94, 0.05)",
          border: "1px solid rgba(244, 63, 94, 0.15)",
          padding: "1rem",
          borderRadius: "8px"
        }}>
          <h3 style={{ fontSize: "0.9rem", color: "#f43f5e", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>⚠️</span> Hazard Warnings
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.7rem", color: "#94a3b8" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Heatwave:</span>
              <span style={{
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: "bold",
                backgroundColor: heatwaveStatus.includes("Extreme") ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.05)",
                color: heatwaveStatus.includes("Extreme") ? "#ef4444" : heatwaveStatus.includes("Warning") ? "#f97316" : "#10b981"
              }}>{heatwaveStatus}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Flood Index:</span>
              <span style={{
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: "bold",
                backgroundColor: floodStatus.includes("High") ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.05)",
                color: floodStatus.includes("High") ? "#ef4444" : floodStatus.includes("Watch") ? "#f97316" : "#10b981"
              }}>{floodStatus}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Drought Index:</span>
              <span style={{
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: "bold",
                backgroundColor: droughtStatus.includes("Severe") ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.05)",
                color: droughtStatus.includes("Severe") ? "#ef4444" : droughtStatus.includes("Mild") ? "#eab308" : "#10b981"
              }}>{droughtStatus}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
