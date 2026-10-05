/**
 * URL fragment for a /gallery filter value, so a category can be linked to:
 * "all" → "" (no fragment), "bw" → "black-and-white", "group_photos" →
 * "group-photos". Shared by the templates and scripts/gallery-filter.ts.
 */
export function galleryHash(value: string): string {
  if (value === "all") return "";
  if (value === "bw") return "black-and-white";
  return value.replaceAll("_", "-");
}
