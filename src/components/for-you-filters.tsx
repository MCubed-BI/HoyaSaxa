import Link from "next/link";
import { pillClass } from "@/components/page-chrome";
import {
  FOR_YOU_FILTERS,
  forYouFilterAriaLabel,
  forYouFilterHref,
  forYouFilterLabel,
  type ForYouFilter,
} from "@/lib/for-you";

export function ForYouFilters({ active }: { active: ForYouFilter }) {
  return (
    <nav className="for-you__filters" aria-label="For You filters">
      {FOR_YOU_FILTERS.map((filter) => {
        const selected = filter === active;
        return (
          <Link
            key={filter}
            href={forYouFilterHref(filter)}
            aria-current={selected ? "page" : undefined}
            aria-label={forYouFilterAriaLabel(filter)}
            title={forYouFilterAriaLabel(filter)}
            className={pillClass(selected)}
          >
            {forYouFilterLabel(filter)}
          </Link>
        );
      })}
    </nav>
  );
}
