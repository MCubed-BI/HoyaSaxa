export function AthleteEmailField({
  emails = [],
  emptyLabel = "Not listed",
  showEmpty = true,
}: {
  emails?: string[];
  emptyLabel?: string;
  showEmpty?: boolean;
}) {
  const listed = emails.filter(Boolean);
  if (listed.length === 0 && !showEmpty) return null;

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
      {listed.length > 0 ? (
        <ul className="mt-1 space-y-0.5">
          {listed.map((email) => (
            <li key={email.toLowerCase()}>
              <a href={`mailto:${email}`} className="block truncate text-navy hover:underline">
                {email}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}
