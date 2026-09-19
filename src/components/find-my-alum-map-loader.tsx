"use client";

import dynamic from "next/dynamic";
import { MapCanvasSkeleton } from "@/components/page-skeletons";
import type { AlumniMapPoint } from "@/lib/types";

const FindMyAlumMap = dynamic(
  () => import("@/components/find-my-alum-map").then((m) => m.FindMyAlumMap),
  {
    ssr: false,
    loading: () => <MapCanvasSkeleton />,
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
