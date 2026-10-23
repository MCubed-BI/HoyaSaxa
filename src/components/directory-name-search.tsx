"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/icons";
import { Input } from "@/components/ui/input";
import type { DirectoryPersonSuggestion, DirectorySearchView } from "@/lib/directory-search";
import { PERSON_KINDS, PERSON_KIND_LABELS, type PersonKind } from "@/lib/person-kind";

const MIN_QUERY = 2;

function personKindsQuery(personKinds: PersonKind[]) {
  const params = new URLSearchParams();
  for (const kind of personKinds) params.append("personKind", kind);
  const query = params.toString();
  return query ? `&${query}` : "";
}

export function DirectoryNameSearch({
  name = "q",
  value,
  onChange,
  defaultValue = "",
  view,
  openProfileOnSelect = true,
  onSelect,
  placeholder = "Search name or preferred name",
  label = "Find a person",
  personKinds,
  onPersonKindsChange,
  showPersonKindFilter = true,
}: {
  name?: string;
  value?: string;
  onChange?: (next: string) => void;
  defaultValue?: string;
  view: DirectorySearchView;
  openProfileOnSelect?: boolean;
  onSelect?: (hit: DirectoryPersonSuggestion) => void;
  placeholder?: string;
  label?: string;
  /** Empty = Alum and Support. */
  personKinds?: PersonKind[];
  onPersonKindsChange?: (next: PersonKind[]) => void;
  showPersonKindFilter?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const query = value ?? uncontrolled;
  const [internalKinds, setInternalKinds] = useState<PersonKind[]>(() => personKinds ?? []);
  const kinds = onPersonKindsChange && personKinds !== undefined ? personKinds : internalKinds;
  const [hits, setHits] = useState<DirectoryPersonSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");

  function setQuery(next: string) {
    onChange?.(next);
    if (value === undefined) setUncontrolled(next);
  }

  function setKinds(next: PersonKind[]) {
    setInternalKinds(next);
    onPersonKindsChange?.(next);
  }

  useEffect(() => {
    if (personKinds) setInternalKinds(personKinds);
  }, [personKinds]);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < MIN_QUERY) {
      setHits([]);
      setOpen(false);
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(
          `/api/directory/people?q=${encodeURIComponent(needle)}&view=${view}${personKindsQuery(kinds)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("search failed");
        const data = (await response.json()) as { people?: DirectoryPersonSuggestion[] };
        if (controller.signal.aborted) return;
        setHits(data.people ?? []);
        setActive(0);
        setOpen(true);
        setStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHits([]);
        setOpen(false);
        setStatus("idle");
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, view, kinds]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function choose(hit: DirectoryPersonSuggestion) {
    setOpen(false);
    if (onSelect) {
      onSelect(hit);
      setQuery("");
      setHits([]);
      return;
    }
    if (openProfileOnSelect) {
      router.push(hit.href);
      return;
    }
    setQuery(hit.name);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || hits.length === 0) {
      if (event.key === "Enter" && (openProfileOnSelect || onSelect) && hits.length === 1) {
        event.preventDefault();
        choose(hits[0]!);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (current + 1) % hits.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current - 1 + hits.length) % hits.length);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Enter" && (openProfileOnSelect || onSelect)) {
      event.preventDefault();
      choose(hits[active] ?? hits[0]!);
    }
  }

  const kindSelectValue =
    kinds.length === 1 ? kinds[0]! : kinds.length === PERSON_KINDS.length ? "" : kinds[0] ?? "";

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
        <label htmlFor={name} className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </label>
        {showPersonKindFilter ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wide">Alum / Support</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
              value={kindSelectValue}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) setKinds([]);
                else if (value === "alum" || value === "supporter") setKinds([value]);
              }}
              aria-label="Alum or Support filter"
            >
              <option value="">Alum &amp; Support</option>
              {PERSON_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {PERSON_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="relative">
        <AppIcon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={name}
          name={name}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (hits.length) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && hits[active] ? `${listId}-${hits[active]!.id}` : undefined}
          className="h-11 pl-9 text-base md:text-sm"
        />
        {kinds.map((kind) => (
          <input key={kind} type="hidden" name="personKind" value={kind} />
        ))}
      </div>
      {open && (hits.length > 0 || status === "loading") ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-md"
        >
          {hits.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>
          ) : (
            hits.map((hit, index) => (
              <li key={hit.id} role="option" aria-selected={index === active} id={`${listId}-${hit.id}`}>
                <Link
                  href={hit.href}
                  className={`block rounded-lg px-3 py-2 ${index === active ? "bg-muted" : "hover:bg-muted/70"}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={(event) => {
                    if (!openProfileOnSelect) {
                      event.preventDefault();
                      choose(hit);
                    }
                  }}
                >
                  <p className="font-medium text-navy">{hit.name}</p>
                  {hit.subtitle ? <p className="text-xs text-muted-foreground">{hit.subtitle}</p> : null}
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
