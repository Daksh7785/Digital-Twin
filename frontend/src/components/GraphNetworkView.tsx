import React, { useState, useEffect } from "react";

interface Node {
  id: string;
  name: string;
  lat: number;
  lon: number;
  vulnerability: number;
  centrality: number;
}

interface Edge {
  source: string;
  target: string;
  weight: number;
}

export const GraphNetworkView: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/graph");
      const data = await res.json();
      setNodes(data.nodes);
      setEdges(data.edges);
    } catch (e) {
      console.error("Error loading teleconnection graph:", e);
    }
  };

  const handleSimulate = async (nodeId: string) => {
    setSelectedNode(nodeId);
    try {
      const res = await fetch(`http://localhost:8000/api/simulate-failure?trigger_node=${nodeId}`, {
        method: "POST"
      });
      const data = await res.json();
      setSimulationResult(data);
    } catch (e) {
      console.error("Error simulating cascade:", e);
    }
  };

  return (
    <div className="glass" style={{ padding: "1.5rem", marginTop: "1.5rem" }}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "#f1f5f9" }}>
        🌐 Climate Teleconnection & Resilience Network
      </h2>
      <p style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: "1rem" }}>
        Simulates how extreme local climate disruptions cascade across geographic corridors (Himalayas, plains, Ghats).
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.5rem" }}>
        {/* Nodes list */}
        <div>
          <h4 style={{ fontSize: "0.85rem", color: "#60a5fa", marginBottom: "0.5rem" }}>Regional Climate Corridors</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "250px", overflowY: "auto" }}>
            {nodes.map((node) => (
              <div
                key={node.id}
                onClick={() => handleSimulate(node.id)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "6px",
                  backgroundColor: selectedNode === node.id ? "rgba(59, 130, 246, 0.15)" : "rgba(255,255,255,0.02)",
                  border: selectedNode === node.id ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.05)",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem"
                }}
              >
                <div>
                  <span style={{ color: "#f1f5f9", fontWeight: "600" }}>{node.name}</span>
                  <div style={{ color: "#64748b", fontSize: "0.7rem", marginTop: "0.2rem" }}>
                    Lat: {node.lat}, Lon: {node.lon}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#eab308" }}>Centrality: {node.centrality}</div>
                  <div style={{ color: "#f43f5e", fontSize: "0.75rem" }}>Vulnerability: {node.vulnerability}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Simulation Output */}
        <div style={{ padding: "1rem", borderRadius: "8px", backgroundColor: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <h4 style={{ fontSize: "0.85rem", color: "#f43f5e", marginBottom: "0.5rem" }}>Cascading Disruption Output</h4>
          {simulationResult ? (
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div>
                <strong>Trigger Node:</strong> <span style={{ color: "#f1f5f9" }}>{simulationResult.trigger}</span>
              </div>
              <div>
                <strong>Damage Cascade (BFS Propagated):</strong>
                <div style={{ maxHeight: "120px", overflowY: "auto", marginTop: "0.4rem" }}>
                  {Object.entries(simulationResult.affected_nodes).map(([node, damage]: any) => (
                    <div key={node} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span>{node}</span>
                      <span style={{ color: damage > 0.5 ? "#f43f5e" : "#eab308", fontWeight: "bold" }}>{(damage * 100).toFixed(0)}% Damage</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: "#64748b", fontSize: "0.8rem", textAlign: "center", padding: "2rem 0" }}>
              Click on a corridor to simulate a cascading weather event.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
