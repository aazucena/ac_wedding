// apps/web/src/pages/api/photo/upload.ts
// Accepts multipart form: file + an identity + optional caption.
//
// Two identities are accepted, because two pages upload here:
//   personId + personToken  /memories — the name + table-number check Roll Call
//                           uses. Nobody at a reception wants to dig an email
//                           link out of their phone, and it records WHO shot it.
//   token                   /rsvp — the party's invitation token. The guest
//                           arrived by a signed email link, so it's at least as
//                           strong; it identifies a party, not a person, so the
//                           memory carries no person or guest.
//
// Uploads to the Directus files API and creates a memories record
// (approved: false — requires manual approval).

import type { APIRoute } from "astro";
import { z } from "zod";
import {
  validatePartyToken,
  uploadGuestFile,
  createMemoryRecord,
  deleteFile,
} from "@lib/directus";
import { verifyGuestToken } from "@lib/game-token";
import { DIRECTUS_URL, DIRECTUS_TOKEN } from "astro:env/server";
import qs from "qs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const personSchema = z.object({
  personId: z.string().regex(UUID_RE, "Please confirm your name first."),
  personToken: z.string().min(1, "Please confirm your name first."),
});

/** The person's guest record, when they have one — parents and other hosts
 *  don't, so this is best-effort and never blocks the upload. */
async function findGuestId(personId: string): Promise<string | null> {
  try {
    const query = qs.stringify(
      { filter: { person: { _eq: personId } }, fields: ["id"], limit: 1 },
      { encodeValuesOnly: true },
    );
    const res = await fetch(`${DIRECTUS_URL}/items/guests?${query}`, {
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const { data } = await res.json();
    return (data?.[0]?.id as string | undefined) ?? null;
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const json = (data: object, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    const partyToken = (form.get("token") as string | null)?.trim() ?? "";
    const personId = (form.get("personId") as string | null)?.trim() ?? "";
    const personToken =
      (form.get("personToken") as string | null)?.trim() ?? "";
    const rawCaption = (form.get("caption") as string | null)?.trim() || null;
    const caption = rawCaption
      ? rawCaption.replace(/<[^>]*>/g, "").trim() || null
      : null;

    if (!file) return json({ error: "Missing file." }, 400);

    // Only the /memories form is checked against the person schema — the RSVP
    // form sends no personId at all, and validating it would reject that page.
    const parsed = partyToken
      ? null
      : personSchema.safeParse({ personId, personToken });
    if (parsed && !parsed.success) {
      return json(
        { error: parsed.error.issues[0]?.message ?? "Missing identity." },
        400,
      );
    }

    if (!file.type.startsWith("image/")) {
      return json({ error: "Only image files are accepted." }, 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      return json({ error: "File too large. Maximum size is 10MB." }, 400);
    }

    if (partyToken) {
      if (!(await validatePartyToken(partyToken)))
        return json({ error: "Invalid invitation token." }, 403);
    } else if (!verifyGuestToken(personId, personToken)) {
      // Same HMAC identity the camera issues, so a guest verified once at
      // /camera is verified here too.
      return json({ error: "Please confirm your name again." }, 403);
    }

    // Upload file to Directus
    let fileId: string;
    try {
      fileId = await uploadGuestFile(file, caption ?? file.name);
    } catch (err) {
      // A bare `catch {}` here meant a failed upload reported nothing at all —
      // same opaque 500 whether Directus was down, the token was stale or the
      // payload was rejected. Log the reason; the guest still sees the short
      // message, but the server tells us which it was.
      console.error(
        `[photo/upload] file upload failed (${file.name}, ${file.type}, ${file.size} bytes):`,
        err,
      );
      return json({ error: "Couldn't save the photo. Please try again." }, 500);
    }

    // Create memories record (approved: false — moderated before publishing)
    try {
      await createMemoryRecord(
        fileId,
        null,
        caption ?? undefined,
        undefined,
        "rsvp",
        false,
        // A party token names a party, not a person, so attribution is only
        // available on the /memories path.
        partyToken ? null : personId,
        partyToken ? null : await findGuestId(personId),
      );
    } catch (err) {
      console.error(
        `[photo/upload] memory record failed (file ${fileId}):`,
        err,
      );
      // Delete the orphaned file so it doesn't accumulate in Directus files
      await deleteFile(fileId).catch(() => {});
      return json({ error: "Photo saved but memory entry failed." }, 500);
    }

    return json({
      success: true,
      message: "Photo submitted! It will appear in our memories once approved.",
    });
  } catch (err) {
    console.error("Upload error:", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
};
