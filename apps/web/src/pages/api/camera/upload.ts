// apps/web/src/pages/api/camera/upload.ts
// Roll Call — the reception's disposable camera (/camera).
//
// POST multipart: file + personId + personToken (+ optional caption) → uploads
// to the Directus file library and creates a memories row with approved: false.
// Nothing is visible until the couple bulk-approves `source = camera` the
// morning after, which is the whole "develop the film" conceit.
//
// GET ?personId=&personToken= → { used, remaining } so the film counter is
// right on first paint.
//
// Shooters are PERSONS with a table seat (api/camera/verify), not guests —
// parents and other hosts are seated without ever having a guest record. When
// the person does have one, the memory is linked to it so Directus attributes
// the photo as usual.

import type { APIRoute } from "astro";
import { DIRECTUS_URL, DIRECTUS_TOKEN } from "astro:env/server";
import { DateTime } from "luxon";
import qs from "qs";
import { getSettings, memoriesFolder } from "@lib/directus";
import { verifyGuestToken } from "@lib/game-token";
import { isRateLimited } from "@lib/ratelimit";
import { SHOT_LIMIT, CAMERA_SOURCE, CAPTION_MAX } from "@lib/constants/camera";

/** Vercel rejects request bodies over ~4.5 MB. The client shrinks to ~1 MB
 *  first (scripts/camera.ts), so anything near this is a bug or a bypass. */
const MAX_FILE_SIZE = 4 * 1024 * 1024;

const TZ = "America/Edmonton";
const SOURCE = CAMERA_SOURCE;

// 40 uploads per 10 minutes per IP — a whole table shares one venue NAT, so
// this is per-IP generous on purpose; the real cap is per-guest below.
const LIMIT = 40;
const WINDOW = 10 * 60 * 1000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const auth = { Authorization: `Bearer ${DIRECTUS_TOKEN}` };

/** The person's guest record, when they have one. Parents and other hosts
 *  don't, which is exactly why seating moved to persons. */
async function findGuestId(personId: string): Promise<string | null> {
  const query = qs.stringify(
    { filter: { person: { _eq: personId } }, fields: ["id"], limit: 1 },
    { encodeValuesOnly: true },
  );
  const res = await fetch(`${DIRECTUS_URL}/items/guests?${query}`, {
    headers: auth,
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) return null;
  const { data } = await res.json();
  return (data?.[0]?.id as string | undefined) ?? null;
}

/** Title we write on every Roll Call file — for the admin's benefit only. It
 *  used to be the cap's key, which made a display string load-bearing. */
function shotTitlePrefix(name: string | null): string {
  return name ? `Roll Call — ${name} ·` : "Roll Call ·";
}

/**
 * How many shots this shooter has used.
 *
 * Keyed on `memories.person`, so it works the same for a guest and for a seated
 * host who has no guest record. (It used to fall back to matching the file
 * title by name — which meant renaming the title would have reset everyone's
 * counter, and two guests with the same name shared a roll.)
 */
async function countShots(personId: string): Promise<number> {
  const query = qs.stringify(
    {
      filter: { person: { _eq: personId }, source: { _eq: SOURCE } },
      aggregate: { count: "id" },
    },
    { encodeValuesOnly: true },
  );
  const res = await fetch(`${DIRECTUS_URL}/items/memories?${query}`, {
    headers: auth,
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`count failed: ${res.status}`);
  const { data } = await res.json();
  return Number(data?.[0]?.count?.id ?? data?.[0]?.count ?? 0);
}

type Identity = { ok: true; personId: string } | { ok: false; error: Response };

/** Verified identity, or an error response to return as-is. */
function checkIdentity(
  personId: string | null,
  personToken: string | null,
): Identity {
  if (!personId || !UUID_RE.test(personId) || !personToken) {
    return {
      ok: false,
      error: json({ ok: false, error: "Please confirm your name first." }, 403),
    };
  }
  // Same HMAC helper as the reception game; here it signs a person id.
  if (!verifyGuestToken(personId, personToken)) {
    return {
      ok: false,
      error: json({ ok: false, error: "Invalid identity token." }, 403),
    };
  }
  return { ok: true, personId };
}

/** True once the party is over — same deadline the reception game uses. */
function partyClosed(settings: Awaited<ReturnType<typeof getSettings>> | null) {
  if (!settings?.game_deadline) return false;
  const weddingDate = settings.wedding_date ?? "2026-09-26";
  const deadline = DateTime.fromISO(
    `${weddingDate}T${settings.game_deadline}`,
    {
      zone: TZ,
    },
  );
  return deadline.isValid && DateTime.now().setZone(TZ) >= deadline;
}

export const GET: APIRoute = async ({ url }) => {
  const identity = checkIdentity(
    url.searchParams.get("personId"),
    url.searchParams.get("personToken"),
  );
  if (!identity.ok) return identity.error;

  try {
    const used = await countShots(identity.personId);
    return json({
      ok: true,
      used,
      remaining: Math.max(0, SHOT_LIMIT - used),
      limit: SHOT_LIMIT,
    });
  } catch {
    // Don't strand the guest on a counter read — let them shoot; the POST
    // re-counts and is the real gate.
    return json({
      ok: true,
      used: 0,
      remaining: SHOT_LIMIT,
      limit: SHOT_LIMIT,
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`camera-upload:${ip}`, LIMIT, WINDOW)) {
    return json(
      { ok: false, error: "Too many photos at once. Wait a moment." },
      429,
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    const identity = checkIdentity(
      (form.get("personId") as string | null)?.trim() || null,
      (form.get("personToken") as string | null)?.trim() || null,
    );
    if (!identity.ok) return identity.error;

    const name = (form.get("name") as string | null)?.trim() || null;
    const caption =
      (form.get("caption") as string | null)
        ?.trim()
        .replace(/<[^>]*>/g, "")
        .slice(0, CAPTION_MAX) || null;

    if (!file) return json({ ok: false, error: "No photo provided." }, 400);
    if (!file.type.startsWith("image/"))
      return json({ ok: false, error: "Only photos can be uploaded." }, 400);
    if (file.size > MAX_FILE_SIZE)
      return json({ ok: false, error: "That photo is too large." }, 400);

    // Folder + settings in parallel; both are non-fatal except the deadline.
    // The folder is resolved by the shared helper so a Roll Call shot and a
    // /memories upload file together, rather than into Uploads and Memories.
    const [folderId, settings] = await Promise.all([
      memoriesFolder(),
      getSettings().catch(() => null),
    ]);

    if (partyClosed(settings)) {
      return json(
        { ok: false, error: "The camera is closed. Thank you!" },
        403,
      );
    }

    // Per-guest cap. Enforced here, not just in the UI — the counter on the
    // page is a convenience and anyone can POST directly.
    let used: number;
    let guestId: string | null = null;
    try {
      used = await countShots(identity.personId);
      // Still recorded when they have one, so the Find-a-Guest dashboard and
      // anything else reading memories.guest keeps working.
      guestId = await findGuestId(identity.personId);
    } catch {
      return json(
        { ok: false, error: "Couldn't reach the album. Try again." },
        503,
      );
    }
    if (used >= SHOT_LIMIT) {
      return json(
        {
          ok: false,
          error: "Your roll is finished.",
          used,
          remaining: 0,
          limit: SHOT_LIMIT,
        },
        409,
      );
    }

    // Metadata must precede the binary or Directus ignores it.
    // Must stay in sync with shotTitlePrefix — it's the cap's fallback key.
    const title = `${shotTitlePrefix(name)} #${used + 1}`;
    const fileForm = new FormData();
    fileForm.append("title", title);
    if (caption) fileForm.append("description", caption);
    if (folderId) fileForm.append("folder", folderId);
    // The client sends a unique name (roll-call-<name>-<stamp>-<rand>.jpg);
    // this only covers a request that arrives without one.
    fileForm.append("file", file, file.name || `roll-call-${Date.now()}.jpg`);

    const uploadRes = await fetch(`${DIRECTUS_URL}/files`, {
      method: "POST",
      headers: auth,
      body: fileForm,
      signal: AbortSignal.timeout(30_000),
    });
    if (!uploadRes.ok) {
      console.error(
        "camera-upload: file upload failed",
        await uploadRes.text(),
      );
      return json({ ok: false, error: "Upload failed. Try again." }, 500);
    }

    const { data: fileData } = await uploadRes.json();
    const fileId = fileData?.id as string | undefined;
    if (!fileId)
      return json({ ok: false, error: "Upload failed. Try again." }, 500);

    // approved: false — this is what keeps the roll undeveloped until the
    // couple bulk-approves `source = camera` the next morning.
    const memoryRes = await fetch(`${DIRECTUS_URL}/items/memories`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        image: fileId,
        title: caption ?? null,
        source: SOURCE,
        approved: false,
        // Every shooter is a person; only some are guests.
        person: identity.personId,
        ...(guestId ? { guest: guestId } : {}),
        ...(settings?.reception?.id
          ? { reception: settings.reception.id }
          : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!memoryRes.ok) {
      // Delete the orphan so the file library doesn't fill with unreferenced
      // photos (same recovery as api/photo/upload.ts).
      await fetch(`${DIRECTUS_URL}/files/${fileId}`, {
        method: "DELETE",
        headers: auth,
      }).catch(() => {});
      console.error(
        "camera-upload: memory insert failed",
        await memoryRes.text(),
      );
      return json({ ok: false, error: "Photo didn't save. Try again." }, 500);
    }

    return json({
      ok: true,
      used: used + 1,
      remaining: Math.max(0, SHOT_LIMIT - (used + 1)),
      limit: SHOT_LIMIT,
    });
  } catch (err) {
    console.error("camera-upload error:", err);
    return json({ ok: false, error: "Something went wrong. Try again." }, 500);
  }
};
