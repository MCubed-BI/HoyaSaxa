"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import type { AlumniMapPoint } from "@/lib/types";

type ViewMode = "heat" | "markers" | "both";
type LocationFilter = "all" | "hometown" | "current";

const MARKER_COLORS: Record<AlumniMapPoint["locationSource"], { color: string; fill: string }> = {
  current: { color: "#2563eb", fill: "#3b82f6" },
  hometown: { color: "#6b7280", fill: "#9ca3af" },
  address: { color: "#041e42", fill: "#041e42" },
};

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

function sourceLabel(source: AlumniMapPoint["locationSource"]) {
  if (source === "current") return "Current";
  if (source === "hometown") return "Hometown";
  return "Address";
}

export function FindMyAlumMap({
  points,
  profileBase = "/directory",
}: {
  points: AlumniMapPoint[];
  profileBase?: "/alumni" | "/directory";
}) {
  const [mode, setMode] = useState<ViewMode>("both");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const showHeat = mode === "heat" || mode === "both";
  const showMarkers = mode === "markers" || mode === "both";

  const visiblePoints = useMemo(() => {
    if (locationFilter === "all") return points;
    return points.filter((point) => point.locationSource === locationFilter);
  }, [locationFilter, points]);

  if (points.length === 0) {
    return (
      <div className="flex h-[min(70vh,720px)] items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground shadow-[var(--shadow-card)]">
        No mapped locations yet. Current city/state, hometown, or a US address is needed.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "All"],
            ["hometown", "Hometown"],
            ["current", "Current"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={locationFilter === value ? "default" : "outline"}
            onClick={() => setLocationFilter(value)}
          >
            {label}
          </Button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-border sm:inline-block" aria-hidden />
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
        <span className="text-sm text-muted-foreground">
          {visiblePoints.length.toLocaleString()} pin{visiblePoints.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-[#3b82f6]" aria-hidden />
          Current
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-[#9ca3af]" aria-hidden />
          Hometown
        </span>
      </div>
      {visiblePoints.length === 0 ? (
        <div className="flex h-[min(70vh,720px)] items-center justify-center rounded-xl border bg-card text-sm text-muted-foreground shadow-[var(--shadow-card)]">
          No {locationFilter} locations in this filter set.
        </div>
      ) : (
        <div className="h-[min(70vh,720px)] overflow-hidden rounded-xl border shadow-[var(--shadow-card)]">
          <MapContainer className="h-full w-full" center={[39.5, -98.35]} zoom={4} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={visiblePoints} />
            <HeatLayer points={visiblePoints} enabled={showHeat} />
            {showMarkers
              ? visiblePoints.map((point) => {
                  const colors = MARKER_COLORS[point.locationSource];
                  const profileId = point.alumniId || point.id;
                  return (
                    <CircleMarker
                      key={point.id}
                      center={[point.lat, point.lng]}
                      radius={6}
                      pathOptions={{
                        color: colors.color,
                        fillColor: colors.fill,
                        fillOpacity: 0.78,
                        weight: 1,
                      }}
                    >
                      <Popup>
                        <div className="space-y-1 text-sm">
                          {profileBase === "/alumni" ? (
                            <Link href={`/alumni/${profileId}`} className="font-medium text-navy hover:underline">
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
                            {sourceLabel(point.locationSource)}
                          </p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })
              : null}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
