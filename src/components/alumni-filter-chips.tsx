import { FilterChip, FilterChipRow } from "@/components/filter-toolbar";
import { alumniFilterChips, type AlumniFilters } from "@/lib/filters";

export function AlumniFilterChips({
  filters,
  action,
  extra,
}: {
  filters: AlumniFilters;
  action: string;
  extra?: Record<string, string>;
}) {
  const chips = alumniFilterChips(filters, action, extra);
  if (chips.length === 0) return null;

  const clearParams = extra ? new URLSearchParams(extra) : new URLSearchParams();
  const clearQuery = clearParams.toString();
  const clearHref = clearQuery ? `${action}?${clearQuery}` : action;
  const channel = extra?.channel;
  const hrefFor = (href: string) => {
    if (!channel) return href;
    const url = new URL(href, "https://hoyasaxa.local");
    if (!url.searchParams.get("channel")) url.searchParams.set("channel", channel);
    return `${url.pathname}${url.search}`;
  };

  return (
    <FilterChipRow clearHref={clearHref}>
      {chips.map((chip) => (
        <FilterChip key={chip.id} href={hrefFor(chip.href)}>
          {chip.label}
        </FilterChip>
      ))}
    </FilterChipRow>
  );
}
