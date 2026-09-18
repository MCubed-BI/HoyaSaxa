"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { displayName } from "@/lib/format";

type Match = {
  id: string;
  first_name: string | null;
  last_name: string;
  preferred_name: string | null;
  full_name: string | null;
  position: string | null;
  class_year: string | null;
  seasons: string | null;
  claimed: boolean;
  claimed_by_me: boolean;
};

export function RegisterMyself() {
  const router = useRouter();
  const [step, setStep] = useState<"roster" | "account">("roster");
  const [lastName, setLastName] = useState("");
  const [classYear, setClassYear] = useState("");
  const [firstName, setFirstName] = useState("");
  const [createIfMissing, setCreateIfMissing] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [resolvedYear, setResolvedYear] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function lookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextLastName = String(form.get("lastName") ?? lastName);
    const nextClassYear = String(form.get("classYear") ?? classYear);
    setLastName(nextLastName);
    setClassYear(nextClassYear);
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/alumni/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lastName: nextLastName, classYear: nextClassYear }),
      });
      const data = (await response.json()) as { error?: string; classYear?: string; matches?: Match[] };
      if (!response.ok) throw new Error(data.error ?? "Lookup failed");
      setResolvedYear(data.classYear ?? null);
      setMatches(data.matches ?? []);
      const available = (data.matches ?? []).filter((row) => !row.claimed);
      setSelected(available.length === 1 ? [available[0]!.id] : []);
      setCreateIfMissing((data.matches ?? []).length === 0);
      setStep("account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setPending(false);
    }
  }

  async function register(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/alumni/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lastName,
          classYear,
          email,
          password,
          alumniIds: selected,
          firstName,
          createIfMissing: createIfMissing && selected.length === 0,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Registration failed");
      router.push("/me");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setPending(false);
    }
  }

  if (step === "roster") {
    return (
      <form onSubmit={lookup} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Roster last name</Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={lastName}
            placeholder="Kasten"
            autoComplete="family-name"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="classYear">Graduating class</Label>
          <Input
            id="classYear"
            name="classYear"
            defaultValue={classYear}
            placeholder="’15 or 2015"
            inputMode="numeric"
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : (
          <p className="text-sm text-muted-foreground">
            Use the last name and class year from the football roster. Then create an alumni login to edit or merge your rows.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Looking up…" : "Find my roster row"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link href="/alumni-login" className="text-navy underline-offset-4 hover:underline">
            Alumni login
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={register} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {matches.length === 0
          ? `No roster row matched ${lastName} · class ${resolvedYear ?? classYear}. You can create one.`
          : `${matches.length} roster ${matches.length === 1 ? "row" : "rows"} matched ${lastName} · class ${resolvedYear ?? classYear}.`}
      </p>
      {matches.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Claim these rows</legend>
          {matches.map((row) => (
            <label key={row.id} className="flex items-start gap-3 rounded-lg border px-3 py-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.includes(row.id)}
                disabled={row.claimed && !row.claimed_by_me}
                onChange={(event) => {
                  setSelected((current) =>
                    event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id),
                  );
                  setCreateIfMissing(false);
                }}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{displayName(row)}</span>
                <span className="block text-xs text-muted-foreground">
                  {[row.position, row.class_year ? `Class of ${row.class_year}` : null, row.seasons]
                    .filter(Boolean)
                    .join(" · ") || "Georgetown football"}
                  {row.claimed && !row.claimed_by_me ? " · already claimed" : ""}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required={createIfMissing}
          />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Alumni login email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("roster")}>
          Back
        </Button>
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? "Creating…" : "Create alumni login"}
        </Button>
      </div>
    </form>
  );
}
