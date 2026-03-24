// apps/web/src/pages/api/game/upload.ts
// Tokenless Directus file upload for reception game proofs.
// POST multipart: file (required image ≤10 MB), name? (guest name), prompt? (square 1–15).
// Files land in Directus File Library — filter by title "Game Proof —" to find them.
// No gallery entry is created; game proofs are separate from the couple's Gallery collection.

import type { APIRoute } from 'astro';
import { DIRECTUS_URL, DIRECTUS_TOKEN } from 'astro:env/server';
import { z } from 'zod';
import { DateTime } from 'luxon';
import { getSettings } from '@lib/directus';
import { verifyGuestToken } from '@lib/game-token';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const gameUploadSchema = z.object({
  name:   z.string().min(1).optional(),
  prompt: z.string().regex(/^\d+$/, 'prompt must be a square number').optional(),
});

export const POST: APIRoute = async ({ request }) => {
  const json = (data: object, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const form   = await request.formData();
    const file    = form.get('file') as File | null;
    const name    = (form.get('name') as string | null)?.trim() || null;
    const prompt  = (form.get('prompt') as string | null)?.trim() || null;
    const guestId    = (form.get('guestId') as string | null)?.trim() || null;
    const guestToken = (form.get('guestToken') as string | null)?.trim() || null;

    if (guestId && (!guestToken || !verifyGuestToken(guestId, guestToken))) {
      return json({ ok: false, error: 'Invalid identity token.' }, 403);
    }
    const caption = (form.get('title') as string | null)?.trim() || null;
    const memo    = (form.get('memo')  as string | null)?.trim() || null;

    if (!file) return json({ ok: false, error: 'No file provided.' }, 400);
    if (!file.type.startsWith('image/')) return json({ ok: false, error: 'Only image files are accepted.' }, 400);
    if (file.size > MAX_FILE_SIZE) return json({ ok: false, error: 'File too large. Maximum size is 10 MB.' }, 400);

    const parsed = gameUploadSchema.safeParse({ name: name ?? undefined, prompt: prompt ?? undefined });
    if (!parsed.success) return json({ ok: false, error: parsed.error.issues[0]?.message }, 400);

    // Look up the "Uploads" folder UUID and settings in parallel — both non-fatal.
    // Must happen before deadline check (settings needed) and before file upload (folderId needed).
    // Metadata fields must be appended BEFORE the file binary in multipart or Directus ignores them.
    const [folderId, settings] = await Promise.all([
      fetch(`${DIRECTUS_URL}/folders?filter[name][_eq]=Uploads&limit=1`, {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      })
        .then(r => r.ok ? r.json().then(({ data }) => data?.[0]?.id ?? null) : null)
        .catch(() => null),
      getSettings().catch(() => null),
    ]);
    const receptionId = settings?.reception?.id ?? null;

    // Deadline check — enforce server-side so the form can't be bypassed
    if (settings?.game_deadline) {
      const TZ          = 'America/Edmonton';
      const now         = DateTime.now().setZone(TZ);
      const weddingDate = settings.wedding_date ?? '2026-09-26';
      const dl          = DateTime.fromISO(`${weddingDate}T${settings.game_deadline}`, { zone: TZ });
      if (dl.isValid && now >= dl) {
        return json({ ok: false, error: 'Submissions are closed.' }, 403);
      }
    }

    // Build title server-side so Directus file library stays consistently named.
    // Format: "Game Proof — Alice Smith · Square #7" (falls back gracefully if fields are missing)
    const title = [
      'Game Proof',
      name   ? `— ${name}`         : null,
      prompt ? `· Square #${prompt}` : null,
    ].filter(Boolean).join(' ');

    // Metadata BEFORE file field — required by Directus multipart parsing
    const fileForm = new FormData();
    fileForm.append('title', title);
    if (memo) fileForm.append('description', memo);
    if (folderId) fileForm.append('folder', folderId);
    fileForm.append('file', file, file.name);

    const uploadRes = await fetch(`${DIRECTUS_URL}/files`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      body:    fileForm,
      signal:  AbortSignal.timeout(30_000),
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('Directus game-upload failed:', err);
      return json({ ok: false, error: 'Upload failed. Please try again.' }, 500);
    }

    const { data: fileData } = await uploadRes.json();
    const fileId = fileData?.id as string | undefined;

    if (fileId) {
      try {
        await fetch(`${DIRECTUS_URL}/items/memories`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            image:       fileId,
            title:       caption ?? null,
            description: memo ?? null,
            source:      'game',
            approved:    true,
            ...(receptionId ? { reception: receptionId } : {}),
            ...(guestId     ? { guest: guestId }         : {}),
          }),
          signal:  AbortSignal.timeout(10_000),
        });
      } catch (e) {
        // Non-fatal — file is already uploaded; memories record can be created manually
        console.warn('game-upload: failed to create memories record', e);
      }
    }

    return json({ ok: true });

  } catch (err) {
    console.error('game-upload error:', err);
    return json({ ok: false, error: 'Something went wrong. Please try again.' }, 500);
  }
};
