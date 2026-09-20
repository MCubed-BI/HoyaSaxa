"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ClaimPhotoFields } from "@/components/claim-photo-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emptyClaimPhotos, hasClaimPhotoValues, photosFromClaimMatch, type ClaimPhotoValues } from "@/lib/claim-photos";
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
  football_photo_url?: string | null;
  linkedin_photo_url?: string | null;
};

export function RegisterMyself({
  initialStep = "roster",
  claimedAlumniId = null,
}: {
  initialStep?: "roster" | "account" | "photos";
  claimedAlumniId?: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"roster" | "account" | "photos">(initialStep);
  const [lastName, setLastName] = useState("");
  const [classYear, setClassYear] = useState("");
  const [firstName, setFirstName] = useState("");
  const [createIfMissing, setCreateIfMissing] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [resolvedYear, setResolvedYear] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [photos, setPhotos] = useState<ClaimPhotoValues>(emptyClaimPhotos());
  const [claimedIds, setClaimedIds] = useState<string[]>(claimedAlumniId ? [claimedAlumniId] : []);
  const [error, setError] = useState<string | null>(null);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selectedMatch = useMemo(
    () => matches.find((row) => selected.includes(row.id)) ?? matches[0] ?? null,
    [matches, selected],
  );

  useEffect(() => {
    if (step !== "photos") return;
    const alumniId = claimedIds[0];
    if (!alumniId) return;
    let cancelled = false;
    void fetch(`/api/alum/photos?alumniId=${encodeURIComponent(alumniId)}`)
      .then(async (response) => {
        const data = (await response.json()) as {
          error?: string;
          photos?: { football_photo_url?: string | null; linkedin_photo_url?: string | null };
        };
        if (!response.ok || cancelled || !data.photos) return;
        setPhotos((current) => ({
          football_photo_url: current.football_photo_url || data.photos?.football_photo_url?.trim() || "",
          linkedin_photo_url: current.linkedin_photo_url || data.photos?.linkedin_photo_url?.trim() || "",
        }));
      })
      .catch(() => {
        // Existing URL still comes from the selected roster row.
      });
    return () => {
      cancelled = true;
    };
  }, [claimedIds, step]);

  function applyMatchPhotos(rows: Match[], ids: string[]) {
    const row = rows.find((item) => ids.includes(item.id)) ?? rows[0] ?? null;
    setPhotos(photosFromClaimMatch(row));
  }

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
      const nextMatches = data.matches ?? [];
      setResolvedYear(data.classYear ?? null);
      setMatches(nextMatches);
      const available = nextMatches.filter((row) => !row.claimed);
      const nextSelected = available.length === 1 ? [available[0]!.id] : [];
      setSelected(nextSelected);
      setCreateIfMissing(nextMatches.length === 0);
      applyMatchPhotos(nextMatches, nextSelected);
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
    setPhotoMessage(null);
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
          ...(hasClaimPhotoValues(photos) ? photos : {}),
        }),
      });
      const data = (await response.json()) as { error?: string; claimedIds?: string[] };
      if (!response.ok) throw new Error(data.error ?? "Registration failed");
      const nextIds = data.claimedIds?.filter(Boolean) ?? selected;
      setClaimedIds(nextIds);
      setStep("photos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setPending(false);
    }
  }

  async function savePhotos() {
    const ids = claimedIds.filter(Boolean);
    if (ids.length === 0) {
      setError("Claim a roster row before saving photos.");
      return;
    }
    setError(null);
    setPhotoMessage(null);
    setPending(true);
    try {
      for (const alumniId of ids) {
        const response = await fetch("/api/alum/photos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            alumniId,
            football_photo_url: photos.football_photo_url,
            linkedin_photo_url: photos.linkedin_photo_url,
          }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Save failed");
      }
      setPhotoMessage("Saved photos.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  function finish() {
    router.push("/home");
    router.refresh();
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
            Use the last name and class year from the football roster. Then add or replace your photos and create an
            alumni login.
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

  if (step === "photos") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your login is ready. Save roster and headshot photos now — you can upload a file or paste an image URL —
          then finish registration.
        </p>
        <ClaimPhotoFields values={photos} onChange={setPhotos} disabled={pending} idPrefix="validate" />
        {photoMessage ? <p className="text-sm text-navy">{photoMessage}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" disabled={pending} onClick={() => void savePhotos()}>
            {pending ? "Saving…" : "Save photos"}
          </Button>
          <Button type="button" className="flex-1" disabled={pending} onClick={finish}>
            Finish registration
          </Button>
        </div>
      </div>
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
                  const nextSelected = event.target.checked
                    ? [...selected, row.id]
                    : selected.filter((id) => id !== row.id);
                  setSelected(nextSelected);
                  setCreateIfMissing(false);
                  applyMatchPhotos(matches, nextSelected.length ? nextSelected : [row.id]);
                }}
              />
              {row.football_photo_url ? (
                // Farmed GUHoyas roster photo from #25.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.football_photo_url}
                  alt=""
                  className="mt-0.5 h-12 w-10 shrink-0 rounded object-cover object-top ring-1 ring-navy/10"
                />
              ) : null}
              <span className="min-w-0">
                <span className="block text-sm font-medium">{displayName(row)}</span>
                <span className="block text-xs text-muted-foreground">
                  {[row.position, row.class_year ? `Class of ${row.class_year}` : null, row.seasons]
                    .filter(Boolean)
                    .join(" · ") || "Georgetown football"}
                  {row.claimed && !row.claimed_by_me ? " · already claimed" : ""}
                  {row.football_photo_url ? " · roster photo on file" : ""}
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
      <ClaimPhotoFields values={photos} onChange={setPhotos} disabled={pending} idPrefix="register" />
      {selectedMatch?.football_photo_url && !photos.football_photo_url ? (
        <p className="text-xs text-muted-foreground">A GUHoyas roster photo is already on this row and can be replaced.</p>
      ) : null}
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
