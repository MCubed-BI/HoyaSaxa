"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import type { AlumniMapPoint } from "@/lib/types";

type ViewMode = "heat" | "markers" | "both";

function inConus(point: AlumniMapPoint) {
  return point.lat >= 24 && point.lat <= 50 && point.lng >= -125 && point.lng <= -66;
}

function FitBounds({ points }: { points: AlumniMapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) {
      map.setView([39.5, -98.35], 4);
      return;
    }
    // Hawaii / Alaska / junk coords should not hide the lower-48 density the old map showed.
    const conus = points.filter(inConus);
    const fit = conus.length >= Math.max(1, points.length * 0.8) ? conus : points;
    const bounds = L.latLngBounds(fit.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.12), { maxZoom: 10 });
  }, [map, points]);
  return null;
}

function HeatLayer({ points, enabled }: { points: AlumniMapPoint[]; enabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !points.length) return;

    let layer: L.Layer | null = null;
    let cancelled = false;

    (async () => {
      // leaflet.heat attaches to L
      await import("leaflet.heat");
      if (cancelled) return;
      const heatPoints = points.map((p) => [p.lat, p.lng, 0.65] as [number, number, number]);
      layer = L.heatLayer(heatPoints, {
        radius: 28,
        blur: 22,
        maxZoom: 12,
        minOpacity: 0.35,
        gradient: {
          0.2: "#041e42",
          0.45: "#0a3d7a",
          0.65: "#8d734a",
          0.85: "#c4a35a",
          1: "#c5a572",
        },
      });
      layer.addTo(map);
    })();

    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [enabled, map, points]);

  return null;
}

export function FindMyAlumMap({
  points,
  profileBase = "/directory",
}: {
  points: AlumniMapPoint[];
  profileBase?: "/alumni" | "/directory";
}) {
  const [mode, setMode] = useState<ViewMode>("both");
  const showHeat = mode === "heat" || mode === "both";
  const showMarkers = mode === "markers" || mode === "both";

  if (points.length === 0) {
    return (
      <div className="flex h-[min(70vh,720px)] items-center justify-center rounded-xl border bg-muted/40 text-sm text-muted-foreground">
        No mapped locations yet. Current city/state, hometown, or a US address is needed.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["both", "Heat + pins"],
            ["heat", "Heat"],
            ["markers", "Pins"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={mode === value ? "default" : "outline"}
            onClick={() => setMode(value)}
          >
            {label}
          </Button>
        ))}
        <span className="text-sm text-muted-foreground">{points.length} mapped</span>
      </div>
      <div className="h-[min(70vh,720px)] overflow-hidden rounded-xl border">
        <MapContainer className="h-full w-full" center={[39.5, -98.35]} zoom={4} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds points={points} />
          <HeatLayer points={points} enabled={showHeat} />
          {showMarkers
            ? points.map((point) => (
                <CircleMarker
                  key={point.id}
                  center={[point.lat, point.lng]}
                  radius={6}
                  pathOptions={{ color: "#041e42", fillColor: "#c5a572", fillOpacity: 0.85, weight: 1 }}
                >
                  <Popup>
                    <div className="space-y-1 text-sm">
                      {profileBase === "/alumni" ? (
                        <Link href={`/alumni/${point.id}`} className="font-medium text-navy hover:underline">
                          {point.name}
                        </Link>
                      ) : (
                        <Link
                          href={`/directory?q=${encodeURIComponent(point.name)}`}
                          className="font-medium text-navy hover:underline"
                        >
                          {point.name}
                        </Link>
                      )}
                      <p className="text-muted-foreground">{point.locationLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {[point.position, point.classYear].filter(Boolean).join(" · ") || "Roster"}
                        {" · "}
                        {point.locationSource}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))
            : null}
        </MapContainer>
      </div>
    </div>
  );
}
