"use client";

import { useMemo, useState } from "react";
import { AdminMemberToggle } from "@/components/admin-member-toggle";
import { BoardMemberToggle } from "@/components/board-member-toggle";
import { DirectoryNameSearch } from "@/components/directory-name-search";
import { StatusCard } from "@/components/status-card";
import type { DirectoryPersonSuggestion } from "@/lib/directory-search";
import type { StaffRoleRow } from "@/lib/staff-roles";

export function AdminMasterPanel({
  initialAdmins,
  initialBoard,
}: {
  initialAdmins: StaffRoleRow[];
  initialBoard: StaffRoleRow[];
}) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [board, setBoard] = useState(initialBoard);
  const [selected, setSelected] = useState<DirectoryPersonSuggestion | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const adminIds = useMemo(
    () => new Set(admins.map((row) => row.alumni_id).filter(Boolean) as string[]),
    [admins],
  );

  async function refresh() {
    const [adminRes, boardRes] = await Promise.all([
      fetch("/api/admin/admins"),
      fetch("/api/admin/board"),
    ]);
    const adminData = (await adminRes.json()) as { members?: StaffRoleRow[]; error?: string };
    const boardData = (await boardRes.json()) as { members?: StaffRoleRow[]; error?: string };
    if (!adminRes.ok) throw new Error(adminData.error || "Could not refresh admins.");
    if (!boardRes.ok) throw new Error(boardData.error || "Could not refresh board.");
    setAdmins(adminData.members ?? []);
    setBoard(boardData.members ?? []);
  }

  async function grantSelected() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          alumniId: selected.id,
          admin: true,
          name: selected.name,
          username: selected.name,
        }),
      });
      const data = (await response.json()) as { error?: string; admin?: boolean };
      if (!response.ok) throw new Error(data.error || "Could not grant Admin.");
      setMessage(`${selected.name} is now Admin. They sign in with username/Net ID and password.`);
      setSelected(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not grant Admin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg text-navy">Add Admin</h2>
          <p className="text-sm text-muted-foreground">
            Search the roster and grant Admin. That person keeps one central login — username or Net ID
            plus password — and receives admin rights automatically.
          </p>
        </div>
        <div className="space-y-3 rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <DirectoryNameSearch
            view="admin"
            openProfileOnSelect={false}
            onSelect={(hit) => {
              setSelected(hit);
              setMessage(null);
              setError(null);
            }}
            placeholder="Search name to grant Admin"
            label="Find a person"
          />
          {selected ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-navy">{selected.name}</p>
                <p className="text-muted-foreground">
                  {selected.subtitle || selected.id}
                  {adminIds.has(selected.id) ? " · already Admin" : ""}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg bg-navy px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={busy || adminIds.has(selected.id)}
                onClick={() => void grantSelected()}
              >
                {busy ? "Saving…" : adminIds.has(selected.id) ? "Already Admin" : "Grant Admin"}
              </button>
            </div>
          ) : null}
          {message ? <p className="text-sm text-navy">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-lg text-navy">Admins</h2>
          <p className="text-sm text-muted-foreground">
            Current Admin grants on staff_roles. Env owner seeds without a roster id stay listed here.
          </p>
        </div>
        {admins.length === 0 ? (
          <StatusCard title="No Admin grants yet" body="Search above to add the first Admin." />
        ) : (
          <div className="space-y-3">
            {admins.map((row) =>
              row.alumni_id ? (
                <AdminMemberToggle
                  key={row.id}
                  alumniId={row.alumni_id}
                  name={row.username || row.email || row.alumni_id}
                  email={row.email ?? undefined}
                  username={row.username ?? undefined}
                  granted
                />
              ) : (
                <p key={row.id} className="rounded-xl border px-4 py-3 text-sm text-muted-foreground">
                  {row.username || row.email || "Admin"} — env/username grant (no roster id).
                </p>
              ),
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-lg text-navy">Board grants</h2>
          <p className="text-sm text-muted-foreground">
            Board gets Alum Mode plus Message from the Board. From Sgarlata stays Admin only.
          </p>
        </div>
        {board.length === 0 ? (
          <StatusCard
            title="No Board members yet"
            body="Open an athlete profile from the directory and grant Board member."
          />
        ) : (
          <div className="space-y-3">
            {board.map((row) =>
              row.alumni_id ? (
                <BoardMemberToggle
                  key={row.id}
                  alumniId={row.alumni_id}
                  name={row.username || row.email || row.alumni_id}
                  email={row.email ?? undefined}
                  granted
                />
              ) : (
                <p key={row.id} className="rounded-xl border px-4 py-3 text-sm text-muted-foreground">
                  {row.username || row.email || "Board"} — env/username grant (no roster id).
                </p>
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}
