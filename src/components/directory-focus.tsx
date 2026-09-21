"use client";

import { useEffect } from "react";

export function DirectoryFocus({ id }: { id?: string | null }) {
  useEffect(() => {
    if (!id) return;
    document.getElementById(`person-${id}`)?.scrollIntoView({ block: "center" });
  }, [id]);
  return null;
}
