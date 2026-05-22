// apps/web/src/pages/api/photo/upload.ts
// Accepts multipart form: file + token + optional caption.
// Validates the token against Directus, then uploads to Directus files API
// and creates a memories record (approved: false — requires manual approval).

import type { APIRoute } from "astro";
import { z } from "zod";
import {
  validatePartyToken,
  uploadGuestFile,
  createMemoryRecord,
  deleteFile,
} from "@lib/directus";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const uploadSchema = z.object({
  token: z.string().min(1, "Missing token"),
});

export const POST: APIRoute = async ({ request }) => {
  const json = (data: object, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    const token = (form.get("token") as string | null)?.trim();
    const rawCaption = (form.get("caption") as string | null)?.trim() || null;
    const caption = rawCaption
      ? rawCaption.replace(/<[^>]*>/g, "").trim() || null
      : null;

    const parsed = uploadSchema.safeParse({ token });
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

    // Validate token
    const party = await validatePartyToken(token!);
    if (!party) return json({ error: "Invalid invitation token." }, 403);

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
