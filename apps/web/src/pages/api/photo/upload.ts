// apps/web/src/pages/api/photo/upload.ts
// Accepts multipart form: file + personId + personToken + optional caption.
// Identity is the same name + table-number check Roll Call uses — a guest who
// has been through /camera is already familiar with it, and unlike the old RSVP
// code it doesn't require digging an email link out of a phone at a wedding.
// Uploads to the Directus files API and creates a memories record
// (approved: false — requires manual approval).

import type { APIRoute } from "astro";
import { z } from "zod";
import { uploadGuestFile, createMemoryRecord, deleteFile } from "@lib/directus";
import { verifyGuestToken } from "@lib/game-token";
import { DIRECTUS_URL, DIRECTUS_TOKEN } from "astro:env/server";
import qs from "qs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const uploadSchema = z.object({
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
    const personId = (form.get("personId") as string | null)?.trim() ?? "";
    const personToken =
      (form.get("personToken") as string | null)?.trim() ?? "";
    const rawCaption = (form.get("caption") as string | null)?.trim() || null;
    const caption = rawCaption
      ? rawCaption.replace(/<[^>]*>/g, "").trim() || null
      : null;

    const parsed = uploadSchema.safeParse({ personId, personToken });
    if (!parsed.success || !file) {
      return json(
        { error: parsed.error?.issues[0]?.message ?? "Missing file or token." },
        400,
      );
    }

    if (!file.type.startsWith("image/")) {
      return json({ error: "Only image files are accepted." }, 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      return json({ error: "File too large. Maximum size is 10MB." }, 400);
    }

    // Same HMAC identity the camera issues, so a guest verified once is
    // verified for both.
    if (!verifyGuestToken(personId, personToken)) {
      return json({ error: "Please confirm your name again." }, 403);
    }

    // Upload file to Directus
    let fileId: string;
    try {
      fileId = await uploadGuestFile(file, caption ?? file.name);
    } catch {
      return json({ error: "Upload failed. Please try again." }, 500);
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
        personId,
        await findGuestId(personId),
      );
    } catch {
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
