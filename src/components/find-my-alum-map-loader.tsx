"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { StatusCard } from "@/components/status-card";
import { filtersToSearchParams, type AlumniFilters } from "@/lib/filters";
import type { AlumniMapPoint } from "@/lib/types";

const FindMyAlumMap = dynamic(
  () => import("@/components/find-my-alum-map").then((m) => m.FindMyAlumMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70vh,720px)] items-center justify-center rounded-xl border bg-muted/40 text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

type MapPayload = {
  points: AlumniMapPoint[];
  totalAlumni: number;
  mappedCount: number;
  skippedCount: number;
};

export function FindMyAlumMapLoader({
  filters,
  profileBase,
}: {
  filters: AlumniFilters;
  profileBase?: "/alumni" | "/directory";
}) {
  const [payload, setPayload] = useState<MapPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const query = filtersToSearchParams(filters).toString();

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const response = await fetch(`/api/find-my-alum/points${query ? `?${query}` : ""}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const body = (await response.json()) as MapPayload & { error?: string };
        if (!response.ok) {
          throw new Error(body.error || `Map request failed (${response.status})`);
        }
        if (!cancelled) {
          setPayload(body);
          setLoading(false);
        }
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Could not load locations.");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [query]);

  if (error) {
    return <StatusCard title="Find My Alum unavailable" body={error} />;
  }

  if (loading || !payload) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Loading alumni locations…</p>
        <div className="flex h-[min(70vh,720px)] items-center justify-center rounded-xl border bg-muted/40 text-sm text-muted-foreground">
          Loading map…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {payload.mappedCount} alumni mapped · {payload.points.length} pins
        {payload.skippedCount ? ` · ${payload.skippedCount} without a usable place` : ""}
        {payload.totalAlumni ? ` · ${payload.totalAlumni} in this filter` : ""}
      </p>
      <FindMyAlumMap points={payload.points} profileBase={profileBase} />
    </div>
  );
}
