"use client";

import { Html5Qrcode, type Html5QrcodeResult } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type ScanState =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "success"; name: string; already: boolean }
  | { kind: "error"; message: string };

export function EventCheckInScanner({ eventId }: { eventId: string }) {
  const regionId = "event-check-in-scanner";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handlingRef = useRef(false);
  const [state, setState] = useState<ScanState>({ kind: "idle" });

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(regionId, { verbose: false });
    scannerRef.current = scanner;

    async function checkInFromToken(decoded: string) {
      setState({ kind: "scanning" });
      try {
        const response = await fetch(`/api/events/${eventId}/check-in`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: decoded }),
        });
        const data = (await response.json().catch(() => null)) as {
          error?: string;
          alreadyCheckedIn?: boolean;
          record?: { displayName?: string };
        } | null;
        if (!response.ok) {
          setState({
            kind: "error",
            message: data?.error || "Could not check this guest in.",
          });
        } else {
          setState({
            kind: "success",
            name: data?.record?.displayName || "Guest",
            already: Boolean(data?.alreadyCheckedIn),
          });
        }
      } catch {
        setState({ kind: "error", message: "Network error while checking in." });
      } finally {
        window.setTimeout(() => {
          handlingRef.current = false;
        }, 1600);
      }
    }

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decoded: string, _result: Html5QrcodeResult) => {
          if (cancelled || handlingRef.current) return;
          handlingRef.current = true;
          void checkInFromToken(decoded);
        },
        () => {
          /* ignore frame miss */
        },
      )
      .catch(() => {
        if (!cancelled) {
          setState({
            kind: "error",
            message: "Camera access is required to scan guest QR codes.",
          });
        }
      });

    return () => {
      cancelled = true;
      const active = scannerRef.current;
      scannerRef.current = null;
      if (active?.isScanning) {
        void active.stop().catch(() => undefined);
      }
    };
  }, [eventId]);

  return (
    <div className="space-y-4">
      <div
        id={regionId}
        className="overflow-hidden rounded-xl border bg-black/90 shadow-[var(--shadow-card)] [&_video]:max-h-[360px] [&_video]:w-full [&_video]:object-cover"
      />

      {state.kind === "idle" || state.kind === "scanning" ? (
        <p className="text-sm text-muted-foreground">
          {state.kind === "scanning"
            ? "Checking this Hoya in…"
            : "Point the camera at the alum’s check-in QR code."}
        </p>
      ) : null}

      {state.kind === "success" ? (
        <p className="rounded-xl border bg-card px-4 py-3 text-sm text-navy shadow-[var(--shadow-xs)]">
          {state.already
            ? `${state.name} was already checked in.`
            : `${state.name} is checked in.`}
        </p>
      ) : null}

      {state.kind === "error" ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{state.message}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              handlingRef.current = false;
              setState({ kind: "idle" });
            }}
          >
            Scan again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
