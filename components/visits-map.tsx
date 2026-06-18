"use client";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  shopName: string;
  result?: string;
  province: string;
  date: string;
  user?: string;
  orderAmount?: number | null;
}

const PIN_COLOR: Record<string, string> = {
  buy: "#16a34a",
  no_buy: "#dc2626",
  not_found: "#9ca3af",
};

const RESULT_LABEL: Record<string, string> = {
  buy: "ซื้อ", no_buy: "ไม่ซื้อ", not_found: "ไม่พบ",
};

export default function VisitsMap({ pins }: { pins: MapPin[] }) {
  const center: [number, number] =
    pins.length > 0
      ? [
          pins.reduce((s, p) => s + p.lat, 0) / pins.length,
          pins.reduce((s, p) => s + p.lng, 0) / pins.length,
        ]
      : [13.0, 101.5];

  return (
    <MapContainer
      center={center}
      zoom={pins.length > 0 ? 7 : 6}
      style={{ height: "420px", width: "100%", borderRadius: "16px", zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {pins.map((pin) => (
        <CircleMarker
          key={pin.id}
          center={[pin.lat, pin.lng]}
          radius={8}
          pathOptions={{
            fillColor: PIN_COLOR[pin.result || ""] || "#9ca3af",
            color: "#ffffff",
            weight: 2,
            fillOpacity: 0.9,
          }}
        >
          <Popup>
            <div style={{ minWidth: 160, fontFamily: "inherit" }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "#111827" }}>
                {pin.shopName}
              </p>
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>{pin.province}</p>
              {pin.user && (
                <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>โดย {pin.user}</p>
              )}
              <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>{pin.date}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {pin.result && (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      background:
                        pin.result === "buy"
                          ? "#dcfce7"
                          : pin.result === "no_buy"
                          ? "#fee2e2"
                          : "#f3f4f6",
                      color: PIN_COLOR[pin.result] || "#6b7280",
                    }}
                  >
                    {RESULT_LABEL[pin.result]}
                  </span>
                )}
                {pin.result === "buy" && pin.orderAmount != null && (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      background: "#f0fdf4",
                      color: "#15803d",
                    }}
                  >
                    ฿{pin.orderAmount.toLocaleString("th-TH")}
                  </span>
                )}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
