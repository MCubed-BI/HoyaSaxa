import { linkedinProfileLabel, normalizeLinkedinProfileUrl } from "@/lib/linkedin-profile";

export function LinkedInProfileField({
  url,
  emptyLabel = "Not listed",
  showEmpty = true,
}: {
  url?: string | null;
  emptyLabel?: string;
  showEmpty?: boolean;
}) {
  const href = normalizeLinkedinProfileUrl(url);
  if (!href && !showEmpty) return null;

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">LinkedIn</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block truncate text-navy hover:underline"
        >
          {linkedinProfileLabel(href)}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <p className="mt-1 text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}
