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

export const MapDashboardView: React.FC<MapViewProps> = ({ grid, selectedParam, onSelectPixel, onZoomChange }) => {
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

  return (
    <div className="glass" style={{ height: "550px", overflow: "hidden", position: "relative" }}>
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
          // Dynamic property selection
          const value = pixel[selectedParam] !== undefined ? pixel[selectedParam] : pixel.temperature;
          const color = getColor(value, selectedParam);
          const radius = selectedParam === "rainfall" ? Math.max(8, Math.min(22, value * 0.6)) : 14;
          
          return (
            <CircleMarker
              key={idx}
              center={[pixel.lat, pixel.lon]}
              radius={radius}
              fillColor={color}
              color="#ffffff"
              weight={0.5}
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
      </MapContainer>
    </div>
  );
};
