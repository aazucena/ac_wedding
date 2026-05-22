// apps/web/src/lib/directus.ts
// HTTP client + barrel re-export.
// Domain-specific fetchers live in lib/api/*.ts — import from there or from here.

import { INTERNAL_URL, DIRECTUS_TOKEN } from "astro:env/server";
import qs from "qs";

// ── HTTP helpers — used by lib/api/* ─────────────────────────────────────────
// All calls route through the /api/cms proxy, which injects auth server-side.

function q(params: object): string {
  return qs.stringify(params, { encodeValuesOnly: true });
}

export async function get<T>(path: string, params?: object): Promise<T> {
  const base = `${INTERNAL_URL}/api/cms`;
  const url = params ? `${base}${path}?${q(params)}` : `${base}${path}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Directus ${res.status} on GET ${path}`);
  const json = await res.json();
  return json.data as T;
}

export async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${INTERNAL_URL}/api/cms${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": DIRECTUS_TOKEN,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Directus ${res.status} on POST ${path}`);
  const json = await res.json();
  return json.data as T;
}

/** Multipart file upload — omits Content-Type so fetch sets the boundary. */
export async function upload<T>(
  path: string,
  form: FormData,
  timeout = 30_000,
): Promise<T> {
  const res = await fetch(`${INTERNAL_URL}/api/cms${path}`, {
    method: "POST",
    headers: { "X-Internal-Key": DIRECTUS_TOKEN },
    body: form,
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`Directus ${res.status} on upload ${path}`);
  const json = await res.json();
  return json.data as T;
}

export async function patch<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${INTERNAL_URL}/api/cms${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": DIRECTUS_TOKEN,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Directus ${res.status} on PATCH ${path}`);
  const json = await res.json();
  return json.data as T;
}

export async function del(path: string): Promise<void> {
  const res = await fetch(`${INTERNAL_URL}/api/cms${path}`, {
    method: "DELETE",
    headers: { "X-Internal-Key": DIRECTUS_TOKEN },
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
export {
  getReception,
  getTables,
  getGuests,
  getGuestsWithTables,
} from "./api/reception";
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
export { searchGuestsForSeating, getTablemates } from "./api/reception";
export { getGameProofFiles } from "./api/game";
export type { GameSubmission } from "./api/game";
export { uploadGuestFile, deleteFile, createMemoryRecord } from "./api/media";
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
