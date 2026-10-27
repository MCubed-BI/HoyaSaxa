"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function EventCheckInQr({
  token,
  label,
}: {
  token: string;
  label?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    QRCode.toDataURL(token, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: { dark: "#041E42", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError("Could not draw your check-in code.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!dataUrl) {
    return <p className="text-sm text-muted-foreground">Preparing your check-in code…</p>;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Dynamic QR data URL; next/image is not useful here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={label ? `Check-in QR for ${label}` : "Your event check-in QR code"}
        width={280}
        height={280}
        className="rounded-xl border bg-white p-2 shadow-[var(--shadow-xs)]"
      />
      <p className="max-w-xs text-center text-sm text-muted-foreground">
        Show this code to an admin at the door. They tap <span className="font-medium text-foreground">Check you in</span>{" "}
        and scan — that is how you get checked in.
      </p>
    </div>
  );
}
