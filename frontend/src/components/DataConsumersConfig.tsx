import React, { useState } from "react";

interface Consumer {
  id: string;
  name: string;
  url: string;
  type: "webhook" | "alert_email";
  status: "Active" | "Inactive";
}

interface DataConsumersConfigProps {
  currentGridData: any[];
}

export const DataConsumersConfig: React.FC<DataConsumersConfigProps> = ({ currentGridData }) => {
  const [consumers, setConsumers] = useState<Consumer[]>([
    { id: "1", name: "State Disaster Management (SDMA)", url: "https://sdma.gov.in/api/v1/alerts", type: "webhook", status: "Active" },
    { id: "2", name: "Agrometeorological Advisory Service", url: "https://imd.gov.in/api/agro-advisory", type: "webhook", status: "Active" },
    { id: "3", name: "Central Water Commission Inflow Logs", url: "cwc-inflows@gov.in", type: "alert_email", status: "Inactive" }
  ]);

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState<"webhook" | "alert_email">("webhook");

  const handleAddConsumer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUrl) return;
    const newConsumer: Consumer = {
      id: Date.now().toString(),
      name: newName,
      url: newUrl,
      type: newType,
      status: "Active"
    };
    setConsumers([...consumers, newConsumer]);
    setNewName("");
    setNewUrl("");
  };

  const toggleStatus = (id: string) => {
    setConsumers(consumers.map(c => c.id === id ? { ...c, status: c.status === "Active" ? "Inactive" : "Active" } : c));
  };

  const triggerExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentGridData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `digital_twin_state_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="glass" style={{ padding: "1.5rem", height: "100%" }}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: "0.25rem", color: "#f1f5f9" }}>
        ⚙️ Simulation Outputs & Data Consumers
      </h2>
      <p style={{ color: "#64748b", fontSize: "0.80rem", marginBottom: "1.25rem" }}>
        Configure telemetric outputs, export data grids, and register active API subscribers.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem" }}>
        {/* Left Side: Consumer List */}
        <div>
          <h3 style={{ fontSize: "0.85rem", color: "#f1f5f9", marginBottom: "0.75rem" }}>Active Data Consumers & Webhooks</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {consumers.map((c) => (
              <div key={c.id} style={{
                backgroundColor: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                padding: "0.6rem 0.8rem",
                borderRadius: "6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#f1f5f9" }}>{c.name}</div>
                  <div style={{ fontSize: "0.65rem", color: "#64748b", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "200px" }}>
                    {c.type === "webhook" ? "🔗 " : "✉️ "}{c.url}
                  </div>
                </div>
                <button
                  onClick={() => toggleStatus(c.id)}
                  style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    border: "none",
                    fontSize: "0.65rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                    backgroundColor: c.status === "Active" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    color: c.status === "Active" ? "#10b981" : "#ef4444"
                  }}
                >
                  {c.status}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Add New & Export Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "0.85rem", color: "#f1f5f9", marginBottom: "0.5rem" }}>Export Current Twin State</h3>
            <button
              onClick={triggerExport}
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: "6px",
                backgroundColor: "#2563eb",
                color: "#fff",
                border: "none",
                fontSize: "0.75rem",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              📥 Export Grid Data (JSON)
            </button>
          </div>

          <form onSubmit={handleAddConsumer} style={{
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem"
          }}>
            <h3 style={{ fontSize: "0.85rem", color: "#f1f5f9", marginBottom: "0.25rem" }}>Register Consumer Node</h3>
            
            <input
              type="text"
              placeholder="Consumer Name (e.g. State NDMA)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{
                padding: "0.4rem",
                fontSize: "0.75rem",
                borderRadius: "4px",
                border: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "rgba(0,0,0,0.2)",
                color: "#fff"
              }}
            />

            <input
              type="text"
              placeholder="Webhook Endpoint URL or email"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              style={{
                padding: "0.4rem",
                fontSize: "0.75rem",
                borderRadius: "4px",
                border: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "rgba(0,0,0,0.2)",
                color: "#fff"
              }}
            />

            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as "webhook" | "alert_email")}
              style={{
                padding: "0.4rem",
                fontSize: "0.75rem",
                borderRadius: "4px",
                border: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "rgba(0,0,0,0.2)",
                color: "#fff"
              }}
            >
              <option value="webhook">Webhook API Endpoint</option>
              <option value="alert_email">Emergency Alert Email</option>
            </select>

            <button
              type="submit"
              style={{
                padding: "0.5rem",
                borderRadius: "4px",
                backgroundColor: "transparent",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#f1f5f9",
                fontSize: "0.75rem",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              + Register Consumer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
