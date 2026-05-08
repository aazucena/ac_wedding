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

function buildGuestNameFilter(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
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
}

/**
 * Look up a guest by name alone. Returns their guest ID if found, or null.
 * No table number required — works even before seating is assigned.
 */
export async function lookupGuestIdByName(name: string): Promise<string | null> {
  try {
    const items = await get<{ id: string }[]>('/items/guests', {
      filter: buildGuestNameFilter(name),
      fields: ['id'],
      limit: 1,
    });
    return items[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Verify name + table number match. Returns the matched guest ID, or null.
 * Used server-side only — never expose raw guest IDs to the client response.
 */
export async function verifyGuestNameAndTable(name: string, tableNumber: number): Promise<string | null> {
  try {
    const items = await get<{ id: string }[]>('/items/guests', {
      filter: { ...buildGuestNameFilter(name), table: { number: { _eq: tableNumber } } },
      fields: ['id'],
      limit: 1,
    });
    return items[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function hasExistingGuestbookEntry(guestId: string): Promise<boolean> {
  try {
    const items = await get<{ id: string }[]>('/items/guestbook_entries', {
      filter: { guest: { _eq: guestId } },
      fields: ['id'],
      limit: 1,
    });
    return items.length > 0;
  } catch {
    return false;
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
