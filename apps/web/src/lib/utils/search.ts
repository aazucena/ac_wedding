// lib/utils/search.ts — Directus filter builder for guest name search
// Extracted from actions/index.ts so the logic can be unit-tested independently.

/**
 * Build a Directus filter object for searching people by name.
 * - Single word: OR across first_name, last_name, preferred_name
 * - Two+ words: AND(first_name ≈ parts[0], last_name ≈ rest)
 *
 * `relation` nests each condition under an M2O (default `person`, for
 * querying guests); pass `null` when querying `persons` directly.
 */
export function buildNameFilter(
  name: string,
  relation: string | null = "person",
): object {
  const wrap = (cond: object) => (relation ? { [relation]: cond } : cond);
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? {
        _and: [
          wrap({ first_name: { _icontains: parts[0] } }),
          wrap({ last_name: { _icontains: parts.slice(1).join(" ") } }),
        ],
      }
    : {
        _or: [
          wrap({ first_name: { _icontains: name } }),
          wrap({ last_name: { _icontains: name } }),
          wrap({ preferred_name: { _icontains: name } }),
        ],
      };
}
