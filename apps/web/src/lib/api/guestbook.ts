// lib/api/guestbook.ts
import { get, post } from '../directus';

export type GuestbookEntry = {
  id: string;
  date_created: string;
  name: string;
  message: string;
  status: 'draft' | 'published';
  verified: boolean;
};

export async function getGuestbookEntries(): Promise<GuestbookEntry[]> {
  try {
    return await get<GuestbookEntry[]>('/items/guestbook_entries', {
      filter: { status: { _eq: 'published' } },
      fields: ['id', 'date_created', 'name', 'message', 'verified'],
      sort: ['-date_created'],
      limit: 200,
    });
  } catch {
    return [];
  }
}

/**
 * Find a guest by name. Returns found: true if any attending guest with a
 * table assignment matches — used to decide whether to prompt for table number.
 */
export async function lookupGuestByName(name: string): Promise<{ found: boolean }> {
  const parts = name.trim().split(/\s+/);
  const nameFilter =
    parts.length >= 2
      ? {
          _and: [
            { person: { first_name: { _icontains: parts[0] } } },
            { person: { last_name:  { _icontains: parts.slice(1).join(' ') } } },
          ],
        }
      : {
          _or: [
            { person: { first_name: { _icontains: name } } },
            { person: { last_name:  { _icontains: name } } },
          ],
        };
  try {
    const items = await get<{ id: string }[]>('/items/guests', {
      filter: { ...nameFilter, table: { _nnull: true } },
      fields: ['id'],
      limit: 1,
    });
    return { found: items.length > 0 };
  } catch {
    return { found: false };
  }
}

/**
 * Verify name + table number match. Returns the matched guest ID, or null.
 * Used server-side only — never expose raw guest IDs to the client response.
 */
export async function verifyGuestNameAndTable(name: string, tableNumber: number): Promise<string | null> {
  const parts = name.trim().split(/\s+/);
  const nameFilter =
    parts.length >= 2
      ? {
          _and: [
            { person: { first_name: { _icontains: parts[0] } } },
            { person: { last_name:  { _icontains: parts.slice(1).join(' ') } } },
          ],
        }
      : {
          _or: [
            { person: { first_name: { _icontains: name } } },
            { person: { last_name:  { _icontains: name } } },
          ],
        };
  try {
    const items = await get<{ id: string }[]>('/items/guests', {
      filter: { ...nameFilter, table: { number: { _eq: tableNumber } } },
      fields: ['id'],
      limit: 1,
    });
    return items[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function createGuestbookEntry(payload: {
  name: string;
  message: string;
  status: 'draft' | 'published';
  verified: boolean;
  guest?: string | null;
  reception?: string | null;
}): Promise<GuestbookEntry> {
  return post<GuestbookEntry>('/items/guestbook_entries', payload);
}
