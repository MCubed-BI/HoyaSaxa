"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BoardMemberToggle({
  alumniId,
  name,
  granted,
}: {
  alumniId: string;
  name: string;
  granted: boolean;
}) {
  const [board, setBoard] = useState(granted);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keptAdmin, setKeptAdmin] = useState(false);

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/board", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alumniId, board: !board, name }),
      });
      const data = (await response.json()) as { error?: string; board?: boolean; keptAdmin?: boolean };
      if (!response.ok) throw new Error(data.error ?? "Could not update Board member");
      if (data.keptAdmin) {
        setKeptAdmin(true);
        return;
      }
      setBoard(Boolean(data.board));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update Board member");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card px-4 py-3 text-sm shadow-[var(--shadow-xs)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-navy">Board member</p>
          <p className="text-muted-foreground">
            {board
              ? "Can post Message from the Board. Cannot compose From Sgarlata."
              : "Alum Mode only — grant Board to add Message from the Board."}
          </p>
        </div>
        <Button type="button" variant={board ? "secondary" : "outline"} onClick={toggle} disabled={pending}>
          {pending ? "Saving…" : board ? "Remove Board" : "Grant Board"}
        </Button>
      </div>
      {keptAdmin ? <p className="mt-2 text-muted-foreground">This account is Admin and already posts every section.</p> : null}
      {error ? <p className="mt-2 text-destructive">{error}</p> : null}
    </div>
  );
}
