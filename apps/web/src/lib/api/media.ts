// lib/api/media.ts
import { upload, post, del } from "../directus";

export async function uploadGuestFile(
  file: File,
  title: string,
): Promise<string> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("title", title);
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
): Promise<void> {
  await post("/items/memories", {
    image: fileId,
    ...(receptionId ? { reception: receptionId } : {}),
    title: title ?? null,
    description: description ?? null,
    source: source ?? null,
    approved,
  });
}
