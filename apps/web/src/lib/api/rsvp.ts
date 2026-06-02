// lib/api/rsvp.ts
import { get, patch } from "../directus";
import type { Parties } from "../types";

export async function getPartyByToken(token: string): Promise<Parties | null> {
  try {
    const items = await get<Parties[]>("/items/parties", {
      filter: { rsvp_token: { _eq: token } },
      fields: ["*", "members.*", "members.person.*"],
      limit: 1,
    });
    return items[0] ?? null;
  } catch {
    return null;
  }
}

export async function searchPartiesByName(
  name: string,
): Promise<Pick<Parties, "id" | "name">[]> {
  try {
    return await get<Pick<Parties, "id" | "name">[]>(
      "/items/parties",
      {
        filter: {
          _or: [
            { name: { _icontains: name } },
            { members: { person: { first_name: { _icontains: name } } } },
            { members: { person: { last_name: { _icontains: name } } } },
            { members: { person: { preferred_name: { _icontains: name } } } },
          ],
        },
        fields: ["id", "name"],
        limit: 5,
      },
    );
  } catch {
    return [];
  }
}

export async function getGuestMessages(): Promise<
  Array<{
    name: string;
    message_to_couple: string;
    date_rsvp_submitted?: string;
  }>
> {
  try {
    return await get<
      Array<{
        name: string;
        message_to_couple: string;
        date_rsvp_submitted?: string;
      }>
    >("/items/parties", {
      filter: {
        status: { _eq: "confirmed" },
        message_to_couple: { _nnull: true },
      },
      fields: ["name", "message_to_couple", "date_rsvp_submitted"],
      sort: ["-date_rsvp_submitted"],
      limit: 200,
    });
  } catch {
    return [];
  }
}

/** Lightweight token validation — only fetches id + name. */
export async function validatePartyToken(
  token: string,
): Promise<{ id: string; name: string } | null> {
  try {
    const items = await get<{ id: string; name: string }[]>("/items/parties", {
      filter: { rsvp_token: { _eq: token } },
      fields: ["id", "name"],
      limit: 1,
    });
    return items[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Validate that a party ID belongs to a given RSVP token.
 * Returns the party's member guest IDs on success, or null if invalid.
 * Callers should scope any guest mutations to these IDs.
 */
export async function validatePartyByIdAndToken(
  partyId: string,
  token: string,
): Promise<string[] | null> {
  try {
    const items = await get<{ id: string; members: { id: string }[] }[]>(
      "/items/parties",
      {
        filter: { id: { _eq: partyId }, rsvp_token: { _eq: token } },
        fields: ["id", "members.id"],
        limit: 1,
      },
    );
    const party = items[0];
    if (!party) return null;
    return (party.members ?? []).map((m) => m.id);
  } catch {
    return null;
  }
}

export async function patchParty(
  partyId: string,
  payload: object,
): Promise<void> {
  await patch(`/items/parties/${partyId}`, payload);
}

export async function patchGuest(
  guestId: string,
  payload: object,
): Promise<void> {
  await patch(`/items/guests/${guestId}`, payload);
}

export async function getRsvpCount(): Promise<{
  confirmed: number;
  total: number;
}> {
  try {
    const [confirmed, total] = await Promise.all([
      get<any[]>("/items/guests", {
        filter: { attending: { _eq: true } },
        aggregate: { count: "id" },
      }),
      get<any[]>("/items/guests", { aggregate: { count: "id" } }),
    ]);
    return {
      confirmed: confirmed[0]?.count?.id ?? 0,
      total: total[0]?.count?.id ?? 0,
    };
  } catch {
    return { confirmed: 0, total: 0 };
  }
}
