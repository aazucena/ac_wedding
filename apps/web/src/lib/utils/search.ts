// lib/utils/search.ts — Directus filter builder for guest name search
// Extracted from actions/index.ts so the logic can be unit-tested independently.

/**
 * Build a Directus filter object for searching guests by name.
 * - Single word: OR across first_name, last_name, preferred_name
 * - Two+ words: AND(first_name ≈ parts[0], last_name ≈ rest)
 */
export function buildNameFilter(name: string): object {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? {
        _and: [
          { person: { first_name: { _icontains: parts[0] } } },
          { person: { last_name:  { _icontains: parts.slice(1).join(' ') } } },
        ],
      }
    : {
        _or: [
          { person: { first_name:    { _icontains: name } } },
          { person: { last_name:     { _icontains: name } } },
          { person: { preferred_name: { _icontains: name } } },
        ],
      };
}
