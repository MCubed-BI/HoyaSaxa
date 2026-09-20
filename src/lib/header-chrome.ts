/** Brand slot stays content-sized so the two-line BrandMark does not steal nav width. */
export const HEADER_BRAND_SLOT_CLASS = "@container/brand min-w-[11rem] shrink-0";

/** Desktop primary nav: one row at ~1280. Scroll if needed; never wrap For You. */
export const DESKTOP_PRIMARY_NAV_CLASS =
  "hidden min-w-0 flex-1 flex-nowrap items-center justify-end gap-0 overflow-x-auto whitespace-nowrap md:flex";
