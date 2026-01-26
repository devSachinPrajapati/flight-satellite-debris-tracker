import { useState, useCallback } from "react";
import * as maptilersdk from "@maptiler/sdk";
import type { Aircraft } from "../types";

export const useReplayMarker = (
  mapRef: React.MutableRefObject<maptilersdk.Map | null>,
  aircraft: Aircraft[],
  selectedObject: { type: string; data: Aircraft | any } | null
) => {
  const [replayMarker, setReplayMarker] = useState<maptilersdk.Marker | null>(null);

  const handleReplayPositionUpdate = useCallback((
    lat: number,
    lng: number,
    alt: number,
    heading: number
  ) => {
    if (!mapRef.current) return;

    const selectedAircraft = aircraft.find(
      (a) => selectedObject?.type === "aircraft" && (selectedObject.data as Aircraft).hex === a.hex
    );

    if (!replayMarker) {
      const el = document.createElement("div");
      el.className = "replay-marker";
      el.style.cssText = `
        width: 40px; height: 40px; background-color: #9333ea;
        border: 3px solid white; border-radius: 50%;
        box-shadow: 0 4px 12px rgba(147, 51, 234, 0.4);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; animation: pulse 2s infinite; position: relative;
      `;
      el.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M21,16v-2l-8-5V3.5C13,2.67,12.33,2,11.5,2S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"/>
      </svg>`;
      el.style.transform = `rotate(${heading}deg)`;

      const marker = new maptilersdk.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);

      const popup = new maptilersdk.Popup({ offset: 30, closeButton: false, className: "replay-popup" })
        .setHTML(`<div style="padding: 8px; min-width: 180px;">
          <div style="font-weight: bold; color: #9333ea; margin-bottom: 8px; font-size: 14px;">🔄 REPLAY MODE</div>
          <div style="font-size: 13px; color: #1f2937; margin-bottom: 4px;">
            <strong>Flight:</strong> ${selectedAircraft?.flight_icao || 'N/A'}
          </div>
          <div style="font-size: 12px; color: #6b7280; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div><strong>Alt:</strong> ${alt.toLocaleString()} ft</div>
            <div><strong>Hdg:</strong> ${heading.toFixed(0)}°</div>
            <div><strong>Type:</strong> ${selectedAircraft?.aircraft_icao || "N/A"}</div>
            <div><strong>Airline:</strong> ${selectedAircraft?.airline_icao || "N/A"}</div>
          </div>
        </div>`);

      marker.setPopup(popup);
      popup.addTo(mapRef.current);
      setReplayMarker(marker);
      mapRef.current.easeTo({ center: [lng, lat], zoom: 10, duration: 1500, essential: true });
    } else {
      replayMarker.setLngLat([lng, lat]);
      const markerElement = replayMarker.getElement();
      if (markerElement) markerElement.style.transform = `rotate(${heading}deg)`;
      const popup = replayMarker.getPopup();
      if (popup) {
        popup.setHTML(`<div style="padding: 8px; min-width: 180px;">
          <div style="font-weight: bold; color: #9333ea; margin-bottom: 8px; font-size: 14px;">🔄 REPLAY MODE</div>
          <div style="font-size: 13px; color: #1f2937; margin-bottom: 4px;">
            <strong>Flight:</strong> ${selectedAircraft?.flight_icao || 'N/A'}
          </div>
          <div style="font-size: 12px; color: #6b7280; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div><strong>Alt:</strong> ${alt.toLocaleString()} ft</div>
            <div><strong>Hdg:</strong> ${heading.toFixed(0)}°</div>
            <div><strong>Type:</strong> ${selectedAircraft?.aircraft_icao || "N/A"}</div>
            <div><strong>Airline:</strong> ${selectedAircraft?.airline_icao || "N/A"}</div>
          </div>
        </div>`);
      }
    }
  }, [mapRef, aircraft, selectedObject, replayMarker]);

  return {
    replayMarker,
    setReplayMarker,
    handleReplayPositionUpdate,
  };
};