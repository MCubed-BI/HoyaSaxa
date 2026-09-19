"use client";

import dynamic from "next/dynamic";
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

export function FindMyAlumMapLoader({
  points,
  profileBase,
}: {
  points: AlumniMapPoint[];
  profileBase?: "/alumni" | "/directory";
}) {
  return <FindMyAlumMap points={points} profileBase={profileBase} />;
}
