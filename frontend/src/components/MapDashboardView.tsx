import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface GridPixel {
  lat: number;
  lon: number;
  temperature: number;
  rainfall: number;
  lst: number;
  sst: number;
}

interface MapViewProps {
  grid: any[];
  selectedParam: "temperature" | "rainfall" | "lst" | "sst" | "risk_index" | "flood_risk" | "drought_risk" | "heatwave_risk";
  onSelectPixel: (lat: number, lon: number) => void;
  onZoomChange?: (zoom: number) => void;
  selectedPixel?: { lat: number; lon: number } | null;
}

// Component to dynamically adjust map center bounds and capture zoom changes
function MapEvents({ grid, onZoomChange }: { grid: any[]; onZoomChange?: (zoom: number) => void }) {
  const map = useMap();
  
  useEffect(() => {
    if (grid && grid.length > 0) {
      const lats = grid.map(g => g.lat);
      const lons = grid.map(g => g.lon);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      map.fitBounds([
        [minLat - 0.5, minLon - 0.5],
        [maxLat + 0.5, maxLon + 0.5]
      ]);
    }
  }, [grid, map]);

  useEffect(() => {
    if (!onZoomChange) return;
    const handleZoom = () => {
      onZoomChange(map.getZoom());
    };
    map.on("zoomend", handleZoom);
    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map, onZoomChange]);

  return null;
}

export const MapDashboardView: React.FC<MapViewProps> = ({ grid, selectedParam, onSelectPixel, onZoomChange, selectedPixel }) => {
  const getColor = (val: number, param: string) => {
    if (param === "temperature" || param === "lst" || param === "sst") {
      if (val > 38) return "#ef4444";
      if (val > 30) return "#f97316";
      if (val > 24) return "#eab308";
      if (val > 15) return "#10b981";
      return "#3b82f6";
    } else if (param === "rainfall") {
      if (val > 80) return "#1d4ed8";
      if (val > 40) return "#2563eb";
      if (val > 15) return "#3b82f6";
      if (val > 2) return "#60a5fa";
      return "rgba(255,255,255,0.1)";
    } else {
      // Risk layers (0 to 1 range)
      if (val > 0.8) return "#ef4444"; // Red (Critical)
      if (val > 0.5) return "#f97316"; // Orange (Warning)
      if (val > 0.25) return "#eab308"; // Yellow (Advisory)
      return "#10b981"; // Green (Normal)
    }
  };

  const [focusLocation, setFocusLocation] = useState<[number, number] | null>(null);

  // Focus action component inside Leaflet context
  const FocusManager = () => {
    const map = useMap();
    useEffect(() => {
      if (focusLocation) {
        map.setView(focusLocation, 6, { animate: true });
        setFocusLocation(null);
      }
    }, [map]);
    return null;
  };

  return (
    <div className="glass" style={{ height: "550px", overflow: "hidden", position: "relative" }}>
      {/* Quick Location Shortcuts */}
      <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 1000, display: "flex", gap: "0.5rem" }}>
        {[
          { name: "Central India", coords: [21.5, 77.5] },
          { name: "Himalayas", coords: [32.5, 76.0] },
          { name: "Western Ghats", coords: [12.0, 75.5] }
        ].map((loc) => (
          <button
            key={loc.name}
            onClick={() => setFocusLocation(loc.coords as [number, number])}
            style={{
              padding: "0.4rem 0.6rem",
              borderRadius: "4px",
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#60a5fa",
              fontSize: "0.75rem",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            📍 {loc.name}
          </button>
        ))}
      </div>

      {/* Dynamic Layer Legend */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        left: "20px",
        zIndex: 1000,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        padding: "0.75rem",
        borderRadius: "6px",
        fontSize: "0.7rem",
        color: "#f1f5f9"
      }}>
        <div style={{ fontWeight: "bold", marginBottom: "0.4rem", textTransform: "capitalize" }}>
          {selectedParam.replace("_", " ")} Legend
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {selectedParam === "rainfall" ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ width: "10px", height: "10px", backgroundColor: "#1d4ed8", display: "inline-block" }}></span> &gt; 80 mm (Heavy)</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ width: "10px", height: "10px", backgroundColor: "#2563eb", display: "inline-block" }}></span> 40 - 80 mm</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ width: "10px", height: "10px", backgroundColor: "#3b82f6", display: "inline-block" }}></span> 15 - 40 mm</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ width: "10px", height: "10px", backgroundColor: "#60a5fa", display: "inline-block" }}></span> &lt; 15 mm (Light)</div>
            </>
          ) : (selectedParam === "temperature" || selectedParam === "lst" || selectedParam === "sst") ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ width: "10px", height: "10px", backgroundColor: "#ef4444", display: "inline-block" }}></span> &gt; 38 °C (Extreme)</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ width: "10px", height: "10px", backgroundColor: "#f97316", display: "inline-block" }}></span> 30 - 38 °C</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ width: "10px", height: "10px", backgroundColor: "#eab308", display: "inline-block" }}></span> 24 - 30 °C</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ width: "10px", height: "10px", backgroundColor: "#10b981", display: "inline-block" }}></span> &lt; 24 °C (Cool)</div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ width: "10px", height: "10px", backgroundColor: "#ef4444", display: "inline-block" }}></span> &gt; 0.8 (Critical)</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ width: "10px", height: "10px", backgroundColor: "#f97316", display: "inline-block" }}></span> 0.5 - 0.8 (Warning)</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ width: "10px", height: "10px", backgroundColor: "#eab308", display: "inline-block" }}></span> 0.25 - 0.5 (Watch)</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ width: "10px", height: "10px", backgroundColor: "#10b981", display: "inline-block" }}></span> &lt; 0.25 (Safe)</div>
            </>
          )}
        </div>
      </div>

      <MapContainer
        center={[21.0, 78.0]}
        zoom={5}
        style={{ height: "100%", width: "100%", background: "#0b0f19" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {grid.map((pixel: any, idx) => {
          const value = pixel[selectedParam] !== undefined ? pixel[selectedParam] : pixel.temperature;
          const color = getColor(value, selectedParam);
          const isSelected = selectedPixel && Math.abs(pixel.lat - selectedPixel.lat) < 0.01 && Math.abs(pixel.lon - selectedPixel.lon) < 0.01;
          const radius = selectedParam === "rainfall" ? Math.max(8, Math.min(22, value * 0.6)) : 14;
          
          return (
            <CircleMarker
              key={idx}
              center={[pixel.lat, pixel.lon]}
              radius={isSelected ? radius + 3 : radius}
              fillColor={color}
              color={isSelected ? "#eab308" : "#ffffff"}
              weight={isSelected ? 3.0 : 0.5}
              fillOpacity={0.65}
              eventHandlers={{
                click: () => onSelectPixel(pixel.lat, pixel.lon)
              }}
            >
              <Popup>
                <div style={{ color: "#333", fontSize: "12px" }}>
                  <strong>Grid (Lat: {pixel.lat}, Lon: {pixel.lon})</strong><br />
                  Temperature: {pixel.temperature?.toFixed(2)} °C<br />
                  Rainfall: {pixel.rainfall?.toFixed(2)} mm<br />
                  INSAT LST: {pixel.lst?.toFixed(2)} °C<br />
                  SST: {pixel.sst?.toFixed(2)} °C<br />
                  Risk Index: {pixel.risk_index?.toFixed(2)}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        <MapEvents grid={grid} onZoomChange={onZoomChange} />
        <FocusManager />
      </MapContainer>
    </div>
  );
};
