import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LocationGroup } from "@/lib/portal-queries";

/**
 * Hook for an existing Find My Alum map. This portal PR does not rewrite a map
 * if one lands on another branch — mount that component here instead of this list.
 */
export function FindMyAlumMap({ groups }: { groups: LocationGroup[] }) {
  const byState = new Map<string, LocationGroup[]>();
  for (const group of groups) {
    const list = byState.get(group.current_state) ?? [];
    list.push(group);
    byState.set(group.current_state, list);
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No current-city data yet. When a Find My Alum map is present, it will render in this slot.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[...byState.entries()].map(([state, cities]) => (
        <Card key={state}>
          <CardHeader>
            <CardTitle className="text-base">
              <Link href={`/alum?state=${encodeURIComponent(state)}`} className="hover:underline">
                {state}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {cities.map((city) => (
              <div key={`${state}-${city.current_city ?? "unknown"}`} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{city.current_city || "City unknown"}</span>
                <span className="tabular-nums text-navy">{city.alumni_count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
