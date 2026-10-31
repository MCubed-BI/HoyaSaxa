"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { applyMergeToSelectedIds, normalizeSelectionIds } from "@/lib/selection";

const STORAGE_KEY = "ga_blast_ids";

type SelectionContextValue = {
  ids: string[];
  ready: boolean;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  addMany: (ids: string[]) => void;
  removeMany: (ids: string[]) => void;
  replaceAfterMerge: (sourceId: string, keeperId: string) => void;
  clear: () => void;
  count: number;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      let loaded: string[] = [];
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        if (Array.isArray(parsed)) {
          loaded = normalizeSelectionIds(parsed);
        }
      } catch {
        loaded = [];
      }

      if (loaded.length > 0) {
        try {
          const response = await fetch("/api/blast/selection", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ids: loaded }),
          });
          if (response.ok) {
            const data = (await response.json()) as { ids?: unknown };
            if (Array.isArray(data.ids)) {
              loaded = normalizeSelectionIds(data.ids);
            }
          }
        } catch {
          // Keep local picks if reconcile is unavailable.
        }
      }

      if (!cancelled) {
        setIds(loaded);
        setReady(true);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids, ready]);

  const value = useMemo<SelectionContextValue>(
    () => ({
      ids,
      ready,
      count: ids.length,
      isSelected: (id) => ids.includes(id),
      toggle: (id) =>
        setIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id])),
      addMany: (incoming) =>
        setIds((current) => [...new Set([...current, ...incoming.filter(Boolean)])]),
      removeMany: (incoming) => {
        const drop = new Set(incoming);
        setIds((current) => current.filter((id) => !drop.has(id)));
      },
      replaceAfterMerge: (sourceId, keeperId) => {
        setIds((current) => applyMergeToSelectedIds(current, sourceId, keeperId));
      },
      clear: () => setIds([]),
    }),
    [ids, ready],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection() {
  const value = useContext(SelectionContext);
  if (!value) {
    throw new Error("useSelection must be used within SelectionProvider");
  }
  return value;
}

export function useOptionalSelectionCount() {
  return useContext(SelectionContext)?.count ?? 0;
}

export function useOptionalSelection() {
  return useContext(SelectionContext);
}
