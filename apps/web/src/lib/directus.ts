// apps/web/src/lib/directus.ts
// HTTP client + barrel re-export.
// Domain-specific fetchers live in lib/api/*.ts — import from there or from here.

import { cmsTarget, directTarget, reportFailure } from "./cms-transport";
import qs from "qs";

// ── HTTP helpers — used by lib/api/* ─────────────────────────────────────────
// These can only run server-side (importing astro:env/server does that), so the
// transport is a choice, not a security boundary: see lib/cms-transport.ts for
// proxy vs direct and why builds go direct. The /api/cms proxy still serves
// browser traffic — asset URLs from format.ts, EnvelopePreloader, print/social.

function q(params: object): string {
  return qs.stringify(params, { encodeValuesOnly: true });
}

export async function get<T>(path: string, params?: object): Promise<T> {
  const { url, headers } = cmsTarget(path);
  let res: Response;
  try {
    res = await fetch(params ? `${url}?${q(params)}` : url, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    reportFailure(`GET ${path} (${(err as Error).name})`);
    throw err;
  }
  if (!res.ok) {
    reportFailure(`GET ${path} returned ${res.status}`);
    throw new Error(`Directus ${res.status} on GET ${path}`);
  }
  const json = await res.json();
  return json.data as T;
}

export async function post<T>(path: string, body: object): Promise<T> {
  const { url, headers } = cmsTarget(path, true);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Directus ${res.status} on POST ${path}`);
  const json = await res.json();
  return json.data as T;
}

/**
 * Multipart file upload — omits Content-Type so fetch sets the boundary.
 *
 * Always direct, never through /api/cms: Astro's CSRF guard 403s a multipart
 * POST that carries no Origin, which is exactly what a server-side fetch to our
 * own route is. See directTarget().
 */
export async function upload<T>(
  path: string,
  form: FormData,
  timeout = 30_000,
): Promise<T> {
  const { url, headers } = directTarget(path);
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: form,
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) {
    // The status alone says nothing useful — Directus puts the reason in the
    // body ("Invalid payload", a permission error, a size limit), and without
    // it an upload failure is undiagnosable.
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Directus ${res.status} on upload ${path} → ${url}${detail ? `: ${detail.slice(0, 500)}` : ""}`,
    );
  }
  const json = await res.json();
  return json.data as T;
}

export async function patch<T>(path: string, body: object): Promise<T> {
  const { url, headers } = cmsTarget(path, true);
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Directus ${res.status} on PATCH ${path}`);
  const json = await res.json();
  return json.data as T;
}

export async function del(path: string): Promise<void> {
  const { url, headers } = cmsTarget(path, true);
  const res = await fetch(url, {
    method: "DELETE",
    headers,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Directus ${res.status} on DELETE ${path}`);
}

// ── Re-exports from domain modules ───────────────────────────────────────────

export {
  getSettings,
  getFaqs,
  getContactDetails,
  getMaintenanceStatus,
} from "./api/settings";
export {
  getCeremony,
  getClergies,
  getReadings,
  getEntourage,
} from "./api/ceremony";
export { getReception, getTables, getSeatedPersons } from "./api/reception";
export {
  getGallery,
  getGalleryPhotos,
  getHeroPhotos,
  getMemories,
  getSponsors,
  getSponsorsFull,
  getVendors,
  getRegistries,
  getAccommodations,
  getEvents,
} from "./api/content";
export {
  getPartyByToken,
  searchPartiesByName,
  getRsvpCount,
  getGuestMessages,
  validatePartyToken,
  validatePartyByIdAndToken,
  patchParty,
  patchGuest,
} from "./api/rsvp";
export { searchSeatedPersons, getTablemates } from "./api/reception";
export { getGameProofFiles } from "./api/game";
export type { GameSubmission } from "./api/game";
export {
  uploadGuestFile,
  deleteFile,
  createMemoryRecord,
  memoriesFolder,
} from "./api/media";
export {
  getGuestbookEntries,
  lookupGuestIdByName,
  verifyGuestNameAndTable,
  createGuestbookEntry,
  hasExistingGuestbookEntry,
} from "./api/guestbook";
export type { GuestbookEntry } from "./api/guestbook";

// ── Type re-exports ───────────────────────────────────────────────────────────

export type {
  WeddingSettings,
  Vendors,
  Sponsors,
  Ceremonies,
  Reception,
  Gallery,
  Parties,
  Guests,
  Tables,
  Events,
  Registries,
  Accomodations,
  Clergies,
  Entourage,
  Readings,
  Faqs,
  Memories,
} from "./types";
