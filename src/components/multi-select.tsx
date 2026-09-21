"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "cn";

function OptionList({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: Set<string>;
  onToggle: (option: string) => void;
}) {
  if (options.length === 0) {
    return <p className="px-1 py-2 text-xs text-muted-foreground">No matches</p>;
  }

  return (
    <>
      {options.map((option) => (
        <label key={option} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
          <input
            type="checkbox"
            checked={selected.has(option)}
            onChange={() => onToggle(option)}
            className="size-3.5 rounded border-input accent-navy"
          />
          <span className="truncate">{option}</span>
        </label>
      ))}
    </>
  );
}

function SelectedChips({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string[];
  onRemove: (option: string) => void;
}) {
  if (value.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {value.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onRemove(option)}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-navy ring-1 ring-border hover:bg-secondary"
          aria-label={`Remove ${label} ${option}`}
        >
          <span className="max-w-40 truncate">{option}</span>
          <XIcon className="size-3 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  searchable = false,
  dropdown = false,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  searchable?: boolean;
  dropdown?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = new Set(value);
  const mergedOptions = useMemo(() => {
    const seen = new Set(options);
    const extra = value.filter((item) => !seen.has(item));
    return extra.length ? [...options, ...extra] : options;
  }, [options, value]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return mergedOptions;
    return mergedOptions.filter((option) => option.toLowerCase().includes(needle));
  }, [mergedOptions, query]);

  useEffect(() => {
    if (!dropdown || !open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [dropdown, open]);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  function toggle(option: string) {
    if (selected.has(option)) {
      onChange(value.filter((item) => item !== option));
    } else {
      onChange([...value, option]);
    }
  }

  function remove(option: string) {
    onChange(value.filter((item) => item !== option));
  }

  const summary = value.length ? `${value.length} selected` : placeholder;

  if (!dropdown) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
          <span className="text-[11px] text-muted-foreground">{summary}</span>
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
          <OptionList options={visible} selected={selected} onToggle={toggle} />
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
        <span className="text-[11px] text-muted-foreground">{summary}</span>
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-2.5 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          value.length ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span className="truncate">{value.length ? value.join(", ") : placeholder}</span>
        <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <SelectedChips label={label} value={value} onRemove={remove} />
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-30 mt-1 w-full rounded-md border bg-popover p-2 shadow-md"
        >
          {searchable ? (
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              placeholder={`Search ${label.toLowerCase()}`}
              className="mb-2 h-8 w-full rounded-md border border-input bg-card px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          ) : null}
          <div className="max-h-48 overflow-auto">
            <OptionList options={visible} selected={selected} onToggle={toggle} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
