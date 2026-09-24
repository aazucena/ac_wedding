// lib/api/media.ts
import { upload, post, del } from "../directus";

export async function uploadGuestFile(
  file: File,
  title: string,
): Promise<string> {
  const form = new FormData();
  // Metadata MUST precede the binary — Directus parses the multipart stream in
  // order and ignores (or rejects) any field that arrives after the file.
  // api/camera/upload.ts has always done this; this helper had it backwards,
  // so the title was being dropped.
  form.append("title", title);
  form.append("file", file, file.name || `memory-${Date.now()}.jpg`);
  const data = await upload<{ id: string }>("/files", form, 30_000);
  return data.id;
}

export async function deleteFile(fileId: string): Promise<void> {
  await del(`/files/${fileId}`);
}

export async function createMemoryRecord(
  fileId: string,
  receptionId: string | null,
  title?: string,
  description?: string,
  source?: string,
  approved = false,
  /** Who uploaded it. Every shooter is a person; only some are guests. */
  personId?: string | null,
  guestId?: string | null,
): Promise<void> {
  await post("/items/memories", {
    image: fileId,
    ...(receptionId ? { reception: receptionId } : {}),
    title: title ?? null,
    description: description ?? null,
    source: source ?? null,
    approved,
    ...(personId ? { person: personId } : {}),
    ...(guestId ? { guest: guestId } : {}),
  });
}
