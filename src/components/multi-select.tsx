"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  searchable = false,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const selected = new Set(value);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [options, query]);

  function toggle(option: string) {
    if (selected.has(option)) {
      onChange(value.filter((item) => item !== option));
    } else {
      onChange([...value, option]);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
        <span className="text-[11px] text-muted-foreground">
          {value.length ? `${value.length} selected` : placeholder}
        </span>
      </div>
      {searchable ? (
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Filter ${label.toLowerCase()}`}
          className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      ) : null}
      <div className="max-h-36 overflow-auto rounded-md border bg-card px-2 py-1.5">
        {visible.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">No matches</p>
        ) : (
          visible.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
              <input
                type="checkbox"
                checked={selected.has(option)}
                onChange={() => toggle(option)}
                className="size-3.5 rounded border-input accent-navy"
              />
              <span className="truncate">{option}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
