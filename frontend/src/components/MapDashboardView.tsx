import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  grid: any[];
  selectedParam: "temperature" | "rainfall" | "lst" | "sst" | "risk_index" | "anomaly_score";
  onSelectPixel: (lat: number, lon: number) => void;
  onHoverPixel: (pixel: any | null) => void;
  onZoomChange?: (zoom: number) => void;
  selectedPixel?: { lat: number; lon: number } | null;
}

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
        [minLat - 1.0, minLon - 1.0],
        [maxLat + 1.0, maxLon + 1.0]
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

export const MapDashboardView: React.FC<MapViewProps> = ({
  grid,
  selectedParam,
  onSelectPixel,
  onHoverPixel,
  onZoomChange,
  selectedPixel
}) => {
  
  // Custom Map Color System
  const getColor = (val: number, param: string) => {
    if (param === "temperature" || param === "lst") {
      // blue (cold) -> green -> orange -> red (heatwave)
      if (val > 35) return "#ef4444"; // Red
      if (val > 28) return "#f97316"; // Orange
      if (val > 18) return "#22c55e"; // Green
      return "#3b82f6"; // Blue
    } else if (param === "rainfall") {
      // blue -> purple -> red gradient
      if (val > 50) return "#dc2626"; // Red
      if (val > 20) return "#8b5cf6"; // Purple
      if (val > 5) return "#2563eb"; // Blue
      return "rgba(59, 130, 246, 0.2)";
    } else if (param === "sst") {
      if (val > 25) return "#ec4899"; // Pink (Warm pool)
      if (val > 15) return "#3b82f6";
      return "#1d4ed8";
    } else if (param === "anomaly_score") {
      // Cyan -> Magenta -> Dark Red
      if (val > 0.7) return "#880808";
      if (val > 0.4) return "#d946ef";
      return "#06b6d4";
    } else {
      // Risk layers (0 to 1 range): green -> yellow -> orange -> red
      if (val > 0.75) return "#ef4444"; // Red
      if (val > 0.50) return "#f97316"; // Orange
      if (val > 0.25) return "#eab308"; // Yellow
      return "#22c55e"; // Green
    }
  };

  const [focusLocation, setFocusLocation] = useState<[number, number] | null>(null);

  const FocusManager = () => {
    const map = useMap();
    useEffect(() => {
      if (focusLocation) {
        map.setView(focusLocation, 5, { animate: true });
        setFocusLocation(null);
      }
    }, [map]);
    return null;
  };

  return (
    <div className="glass" style={{ height: "600px", overflow: "hidden", position: "relative" }}>
      {/* Quick Location Shortcuts */}
      <div style={{ position: "absolute", top: "15px", right: "15px", zIndex: 1000, display: "flex", gap: "0.5rem" }}>
        {[
          { name: "South Asia (India)", coords: [21.0, 78.0] },
          { name: "North America (USA)", coords: [37.0, -95.0] },
          { name: "South America (Brazil)", coords: [-15.0, -55.0] },
          { name: "Europe", coords: [48.0, 14.0] }
        ].map((loc) => (
          <button
            key={loc.name}
            onClick={() => setFocusLocation(loc.coords as [number, number])}
            style={{
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              backgroundColor: "rgba(10, 15, 30, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#3b82f6",
              fontSize: "0.75rem",
              cursor: "pointer",
              fontWeight: "bold",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)")}
          >
            📍 {loc.name}
          </button>
        ))}
      </div>

      {/* Dynamic Color Scale Legend */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        left: "20px",
        zIndex: 1000,
        backgroundColor: "rgba(10, 15, 30, 0.9)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        padding: "1rem",
        borderRadius: "8px",
        fontSize: "0.75rem",
        color: "#f1f5f9",
        width: "180px"
      }}>
        <div style={{ fontWeight: "bold", marginBottom: "0.5rem", textTransform: "capitalize" }}>
          {selectedParam.replace("_", " ")} Legend
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {selectedParam === "rainfall" ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ width: "12px", height: "12px", backgroundColor: "#dc2626", borderRadius: "2px" }}></span> &gt; 50 mm (Heavy)</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ width: "12px", height: "12px", backgroundColor: "#8b5cf6", borderRadius: "2px" }}></span> 20 - 50 mm</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ width: "12px", height: "12px", backgroundColor: "#2563eb", borderRadius: "2px" }}></span> &lt; 20 mm</div>
            </>
          ) : (selectedParam === "temperature" || selectedParam === "lst") ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ width: "12px", height: "12px", backgroundColor: "#ef4444", borderRadius: "2px" }}></span> &gt; 35 °C (Extreme)</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ width: "12px", height: "12px", backgroundColor: "#f97316", borderRadius: "2px" }}></span> 28 - 35 °C</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ width: "12px", height: "12px", backgroundColor: "#22c55e", borderRadius: "2px" }}></span> 18 - 28 °C</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ width: "12px", height: "12px", backgroundColor: "#3b82f6", borderRadius: "2px" }}></span> &lt; 18 °C (Cold)</div>
            </>
          ) : selectedParam === "anomaly_score" ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ width: "12px", height: "12px", backgroundColor: "#880808", borderRadius: "2px" }}></span> Critical Anomaly</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ width: "12px", height: "12px", backgroundColor: "#d946ef", borderRadius: "2px" }}></span> Moderate Anomaly</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ width: "12px", height: "12px", backgroundColor: "#06b6d4", borderRadius: "2px" }}></span> Normal / Safe</div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ width: "12px", height: "12px", backgroundColor: "#ef4444", borderRadius: "2px" }}></span> Critical Risk</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ width: "12px", height: "12px", backgroundColor: "#f97316", borderRadius: "2px" }}></span> High Warning</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ width: "12px", height: "12px", backgroundColor: "#eab308", borderRadius: "2px" }}></span> Moderate Risk</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ width: "12px", height: "12px", backgroundColor: "#22c55e", borderRadius: "2px" }}></span> Normal / Safe</div>
            </>
          )}
        </div>
      </div>

      <MapContainer
        center={[20.0, 0.0]}
        zoom={2}
        style={{ height: "100%", width: "100%", background: "#060913" }}
        maxBounds={[[-85, -180], [85, 180]]}
      >
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {grid.map((pixel: any, idx) => {
          const value = pixel[selectedParam] !== undefined ? pixel[selectedParam] : pixel.temperature;
          const color = getColor(value, selectedParam);
          const isSelected = selectedPixel && Math.abs(pixel.lat - selectedPixel.lat) < 0.1 && Math.abs(pixel.lon - selectedPixel.lon) < 0.1;
          const radius = isSelected ? 18 : 12;
          
          return (
            <CircleMarker
              key={idx}
              center={[pixel.lat, pixel.lon]}
              radius={radius}
              fillColor={color}
              color={isSelected ? "#3b82f6" : "#ffffff"}
              weight={isSelected ? 3.0 : 0.4}
              fillOpacity={0.7}
              eventHandlers={{
                click: () => onSelectPixel(pixel.lat, pixel.lon),
                mouseover: () => onHoverPixel(pixel),
                mouseout: () => onHoverPixel(null)
              }}
            >
              <Popup>
                <div style={{ color: "#333", fontSize: "12px", fontFamily: "sans-serif" }}>
                  <strong>{pixel.state_name || pixel.state}, {pixel.country_name || pixel.country}</strong><br />
                  Grid Cell: ({pixel.lat}°, {pixel.lon}°)<br />
                  Temperature: {pixel.temperature?.toFixed(1)} °C<br />
                  Rainfall: {pixel.rainfall?.toFixed(1)} mm<br />
                  INSAT LST: {pixel.lst?.toFixed(1)} °C<br />
                  Anomaly Score: {pixel.anomaly_score?.toFixed(2)}<br />
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
