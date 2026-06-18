"use client";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { StyleFunction } from "leaflet";
import "leaflet/dist/leaflet.css";
import { PROVINCE_CENTROIDS } from "@/lib/province-centroids";

const EN_TO_TH: Record<string, string> = {
  "Amnat Charoen": "อำนาจเจริญ", "Ang Thong": "อ่างทอง",
  "Bangkok Metropolis": "กรุงเทพมหานคร", "Bueng Kan": "บึงกาฬ",
  "Buri Ram": "บุรีรัมย์", "Chachoengsao": "ฉะเชิงเทรา",
  "Chai Nat": "ชัยนาท", "Chaiyaphum": "ชัยภูมิ",
  "Chanthaburi": "จันทบุรี", "Chiang Mai": "เชียงใหม่",
  "Chiang Rai": "เชียงราย", "Chon Buri": "ชลบุรี",
  "Chumphon": "ชุมพร", "Kalasin": "กาฬสินธุ์",
  "Kamphaeng Phet": "กำแพงเพชร", "Kanchanaburi": "กาญจนบุรี",
  "Khon Kaen": "ขอนแก่น", "Krabi": "กระบี่",
  "Lampang": "ลำปาง", "Lamphun": "ลำพูน",
  "Loei": "เลย", "Lop Buri": "ลพบุรี",
  "Mae Hong Son": "แม่ฮ่องสอน", "Maha Sarakham": "มหาสารคาม",
  "Mukdahan": "มุกดาหาร", "Nakhon Nayok": "นครนายก",
  "Nakhon Pathom": "นครปฐม", "Nakhon Phanom": "นครพนม",
  "Nakhon Ratchasima": "นครราชสีมา", "Nakhon Sawan": "นครสวรรค์",
  "Nakhon Si Thammarat": "นครศรีธรรมราช", "Nan": "น่าน",
  "Narathiwat": "นราธิวาส", "Nong Bua Lam Phu": "หนองบัวลำภู",
  "Nong Khai": "หนองคาย", "Nonthaburi": "นนทบุรี",
  "Pathum Thani": "ปทุมธานี", "Pattani": "ปัตตานี",
  "Phangnga": "พังงา", "Phatthalung": "พัทลุง",
  "Phayao": "พะเยา", "Phetchabun": "เพชรบูรณ์",
  "Phetchaburi": "เพชรบุรี", "Phichit": "พิจิตร",
  "Phitsanulok": "พิษณุโลก", "Phra Nakhon Si Ayutthaya": "พระนครศรีอยุธยา",
  "Phrae": "แพร่", "Phuket": "ภูเก็ต",
  "Prachin Buri": "ปราจีนบุรี", "Prachuap Khiri Khan": "ประจวบคีรีขันธ์",
  "Ranong": "ระนอง", "Ratchaburi": "ราชบุรี",
  "Rayong": "ระยอง", "Roi Et": "ร้อยเอ็ด",
  "Sa Kaeo": "สระแก้ว", "Sakon Nakhon": "สกลนคร",
  "Samut Prakan": "สมุทรปราการ", "Samut Sakhon": "สมุทรสาคร",
  "Samut Songkhram": "สมุทรสงคราม", "Saraburi": "สระบุรี",
  "Satun": "สตูล", "Si Sa Ket": "ศรีสะเกษ",
  "Sing Buri": "สิงห์บุรี", "Songkhla": "สงขลา",
  "Sukhothai": "สุโขทัย", "Suphan Buri": "สุพรรณบุรี",
  "Surat Thani": "สุราษฎร์ธานี", "Surin": "สุรินทร์",
  "Tak": "ตาก", "Trang": "ตรัง", "Trat": "ตราด",
  "Ubon Ratchathani": "อุบลราชธานี", "Udon Thani": "อุดรธานี",
  "Uthai Thani": "อุทัยธานี", "Uttaradit": "อุตรดิตถ์",
  "Yala": "ยะลา", "Yasothon": "ยโสธร",
};

export interface ProvinceStats {
  total: number;
  buy: number;
  noBuy: number;
  notFound: number;
}

export interface VisitsMapProps {
  provinceStats: Record<string, ProvinceStats>;
  flyToProvince?: string;
}

function MapController({ province }: { province?: string }) {
  const map = useMap();
  useEffect(() => {
    if (!province) return;
    const c = PROVINCE_CENTROIDS[province];
    if (c) map.flyTo([c.lat, c.lng], 9, { duration: 1 });
  }, [province, map]);
  return null;
}

function getProvinceColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return "rgba(220,228,236,0.0)";
  const ratio = Math.min(count / maxCount, 1);
  const alpha = 0.55 + ratio * 0.4;
  const r = Math.round(134 + (22 - 134) * ratio);
  const g = Math.round(239 + (101 - 239) * ratio);
  const b = Math.round(172 + (52 - 172) * ratio);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}

function buildPopup(nameTH: string, stats: ProvinceStats): string {
  const buyPct = stats.total > 0 ? Math.round((stats.buy / stats.total) * 100) : 0;
  const noBuyPct = stats.total > 0 ? Math.round((stats.noBuy / stats.total) * 100) : 0;
  const notFoundPct = stats.total > 0 ? Math.round((stats.notFound / stats.total) * 100) : 0;
  return `
    <div style="min-width:160px;font-family:inherit">
      <p style="font-weight:700;font-size:14px;margin:0 0 6px">${nameTH}</p>
      <p style="font-size:12px;color:#6b7280;margin:0 0 8px">${stats.total} บันทึก</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${stats.buy > 0 ? `<span style="padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:#dcfce7;color:#16a34a">ซื้อ ${buyPct}%</span>` : ""}
        ${stats.noBuy > 0 ? `<span style="padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:#fee2e2;color:#dc2626">ไม่ซื้อ ${noBuyPct}%</span>` : ""}
        ${stats.notFound > 0 ? `<span style="padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:#f3f4f6;color:#6b7280">ไม่พบ ${notFoundPct}%</span>` : ""}
      </div>
    </div>`;
}

export default function VisitsMap({ provinceStats, flyToProvince }: VisitsMapProps) {
  const [geojson, setGeojson] = useState<any>(null);
  const maxCount = Math.max(...Object.values(provinceStats).map((s) => s.total), 1);

  useEffect(() => {
    fetch("/thailand-provinces.json")
      .then((r) => r.json())
      .then(setGeojson);
  }, []);

  const styleFeature: StyleFunction = (feature) => {
    const nameEN = feature?.properties?.name || "";
    const nameTH = EN_TO_TH[nameEN] || nameEN;
    const count = provinceStats[nameTH]?.total || 0;
    return {
      fillColor: getProvinceColor(count, maxCount),
      fillOpacity: count > 0 ? 1 : 0,
      color: "rgba(80,120,160,0.35)",
      weight: 0.8,
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const nameEN = feature.properties.name;
    const nameTH = EN_TO_TH[nameEN] || nameEN;
    const stats = provinceStats[nameTH];
    if (!stats || stats.total === 0) return;

    layer.bindPopup(buildPopup(nameTH, stats), { maxWidth: 220 });

    layer.on("mouseover", () => {
      layer.setStyle({ fillOpacity: 0.95, weight: 1.5, color: "rgba(60,100,150,0.7)" });
      layer.openPopup();
    });
    layer.on("mouseout", () => {
      layer.setStyle(styleFeature(feature));
      layer.closePopup();
    });
  };

  return (
    <MapContainer
      center={[13.0, 101.5]}
      zoom={6}
      style={{ height: "460px", width: "100%", zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <MapController province={flyToProvince} />
      {geojson && (
        <GeoJSON
          key={JSON.stringify(provinceStats)}
          data={geojson}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
      )}
    </MapContainer>
  );
}
