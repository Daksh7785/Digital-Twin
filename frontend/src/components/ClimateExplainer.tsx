import React, { useState, useEffect } from "react";

interface ClimateExplainerProps {
  enso: number;
  iod: number;
}

export const ClimateExplainer: React.FC<ClimateExplainerProps> = ({ enso, iod }) => {
  const [explanation, setExplanation] = useState<string>("");
  const [monsoonPrediction, setMonsoonPrediction] = useState<string>("");

  useEffect(() => {
    generateExplanations();
  }, [enso, iod]);

  const generateExplanations = () => {
    // Generate AI Summary text based on active ocean indicators
    let tempText = "";
    let monsoonText = "";

    if (enso > 0.3) {
      tempText = "Active El Niño condition detected. This is heating up regional atmospheres, creating dry air masses, and putting severe stress on the central agricultural corridor of India.";
      monsoonText = "Monsoon onset is predicted to delay by 6-9 days due to weak cross-equatorial wind flows.";
    } else if (enso < -0.3) {
      tempText = "La Niña conditions are active. Expect increased moisture flows, potential cloudbursts, and heavy coastal precipitation across southern and western regions.";
      monsoonText = "Monsoon onset is predicted to arrive 3 days early with normal-to-excess rainfall distribution.";
    } else {
      tempText = "Neutral ENSO conditions. Regional weather is governed mostly by localized convection systems and sea-breeze components.";
      monsoonText = "Monsoon arrival is projected to be timely (June 1st ± 2 days).";
    }

    if (iod > 0.15) {
      tempText += " Positive IOD event is active, reinforcing storm systems and increasing moisture convergence over the Arabian Sea.";
    } else if (iod < -0.15) {
      tempText += " Negative IOD conditions are reducing seasonal wind velocities, which might trigger localized drought patches in the Deccan region.";
    }

    setExplanation(tempText);
    setMonsoonPrediction(monsoonText);
  };

  const handleDownloadReport = () => {
    const reportContent = `
--- CLIMATE DIGITAL TWIN INTEL REPORT ---
Timestamp: ${new Date().toISOString()}
ENSO Index: ${enso.toFixed(2)}
IOD Index: ${iod.toFixed(2)}

AI EXPLANATION:
${explanation}

MONSOON PROJECTION:
${monsoonPrediction}
-----------------------------------------
    `;
    const element = document.createElement("a");
    const file = new Blob([reportContent], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "Climate_Twin_Status_Report.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="glass" style={{ padding: "1.5rem", marginTop: "1.5rem" }}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "#f1f5f9" }}>
        🧠 AI Climate Anomaly Explainability
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ padding: "1rem", borderRadius: "6px", backgroundColor: "rgba(96, 165, 250, 0.05)", border: "1px solid rgba(96, 165, 250, 0.15)" }}>
          <h4 style={{ fontSize: "0.85rem", color: "#60a5fa", marginBottom: "0.4rem" }}>Dynamic Teleconnection Analysis</h4>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: "1.4" }}>{explanation}</p>
        </div>

        <div style={{ padding: "1rem", borderRadius: "6px", backgroundColor: "rgba(244, 63, 94, 0.05)", border: "1px solid rgba(244, 63, 94, 0.15)" }}>
          <h4 style={{ fontSize: "0.85rem", color: "#f43f5e", marginBottom: "0.4rem" }}>AI Monsoon Delay & Onset Predictor</h4>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: "1.4" }}>{monsoonPrediction}</p>
        </div>

        <button
          onClick={handleDownloadReport}
          style={{
            padding: "0.75rem",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#10b981",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "background-color 0.2s"
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#059669")}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#10b981")}
        >
          📥 Generate Climate Report (.txt)
        </button>
      </div>
    </div>
  );
};
