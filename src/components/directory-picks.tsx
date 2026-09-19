"use client";

import Link from "next/link";
import { useSelection } from "@/components/selection-provider";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

export function DirectoryPickToggle({
  id,
  name,
  disabled,
}: {
  id: string;
  name: string;
  disabled?: boolean;
}) {
  const { isSelected, toggle } = useSelection();
  if (disabled) return null;
  return (
    <input
      type="checkbox"
      checked={isSelected(id)}
      onChange={() => toggle(id)}
      className="mt-1 size-4 rounded border-input accent-gold"
      aria-label={`Select ${name} for email`}
    />
  );
}

export function AlumEmailBar({ href = "/portal/blast" }: { href?: string }) {
  const { count, clear } = useSelection();
  if (count === 0) return null;
  return (
    <div className="sticky bottom-3 z-20 rounded-xl border border-gold/40 bg-navy px-4 py-3 text-white shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">{formatNumber(count)} selected for email</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={clear}
          >
            Clear picks
          </Button>
          <Button asChild>
            <Link href={href} className="bg-gold text-gold-foreground hover:bg-gold/90">
              Email selected
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
