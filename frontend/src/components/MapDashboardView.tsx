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
  grid: GridPixel[];
  selectedParam: "temperature" | "rainfall" | "lst";
  onSelectPixel: (lat: number, lon: number) => void;
}

// Component to dynamically adjust map center bounds
function MapUpdater({ grid }: { grid: GridPixel[] }) {
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
  return null;
}

export const MapDashboardView: React.FC<MapViewProps> = ({ grid, selectedParam, onSelectPixel }) => {
  const getColor = (val: number, param: string) => {
    if (param === "temperature") {
      // Hot to Cold Gradient (Red to Blue)
      if (val > 35) return "#ef4444";
      if (val > 30) return "#f97316";
      if (val > 25) return "#eab308";
      return "#3b82f6";
    } else {
      // Precipitation / Wetness (Blue to Greenish light blue)
      if (val > 50) return "#1d4ed8";
      if (val > 20) return "#3b82f6";
      if (val > 5) return "#60a5fa";
      return "#93c5fd";
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
        
        {grid.map((pixel, idx) => {
          const value = selectedParam === "temperature" ? pixel.temperature : (selectedParam === "rainfall" ? pixel.rainfall : pixel.lst);
          const color = getColor(value, selectedParam);
          return (
            <CircleMarker
              key={idx}
              center={[pixel.lat, pixel.lon]}
              radius={selectedParam === "rainfall" ? Math.max(8, Math.min(22, value * 0.6)) : 14}
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
                  Temperature: {pixel.temperature.toFixed(2)} °C<br />
                  Rainfall: {pixel.rainfall.toFixed(2)} mm<br />
                  INSAT LST: {pixel.lst.toFixed(2)} °C
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        <MapUpdater grid={grid} />
      </MapContainer>
    </div>
  );
};
