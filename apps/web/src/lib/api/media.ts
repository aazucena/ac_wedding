// lib/api/media.ts
import { get, upload, post, del } from "../directus";

/** Directus folder guest photos are filed under, by name. */
const MEMORIES_FOLDER = "Memories";

/** Resolved folder id, cached for the process. */
let memoriesFolderId: string | null = null;

/**
 * The "Memories" folder's id, or null if it can't be found.
 *
 * Shared by both upload paths — the /memories form via uploadGuestFile and
 * Roll Call via api/camera/upload.ts — so guest photos from either land in the
 * same place and the folder name is written down once.
 *
 * Looked up by name because the id differs between the local and production
 * instances, so hard-coding one would file photos into nothing on the other.
 *
 * Null is a valid answer: a file with no folder still uploads, it just lands
 * unsorted. Losing a guest's photo because a folder lookup failed would be a
 * far worse outcome than an unfiled one, so this never throws.
 *
 * Only successful lookups are cached — otherwise creating the folder mid-event
 * would never be picked up without a redeploy.
 */
export async function memoriesFolder(): Promise<string | null> {
  if (memoriesFolderId) return memoriesFolderId;
  try {
    const rows = await get<{ id: string }[]>("/folders", {
      filter: { name: { _eq: MEMORIES_FOLDER } },
      fields: ["id"],
      limit: 1,
    });
    memoriesFolderId = rows?.[0]?.id ?? null;
    return memoriesFolderId;
  } catch {
    return null;
  }
}

export async function uploadGuestFile(
  file: File,
  title: string,
): Promise<string> {
  const folder = await memoriesFolder();

  const form = new FormData();
  // Metadata MUST precede the binary — Directus parses the multipart stream in
  // order and ignores (or rejects) any field that arrives after the file.
  // api/camera/upload.ts has always done this; this helper had it backwards,
  // so the title was being dropped.
  form.append("title", title);
  if (folder) form.append("folder", folder);
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
