"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ga_blast_ids";

type SelectionContextValue = {
  ids: string[];
  ready: boolean;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  addMany: (ids: string[]) => void;
  removeMany: (ids: string[]) => void;
  clear: () => void;
  count: number;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(parsed)) {
        setIds(parsed.filter((value): value is string => typeof value === "string"));
      }
    } catch {
      setIds([]);
    }
    setReady(true);
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
