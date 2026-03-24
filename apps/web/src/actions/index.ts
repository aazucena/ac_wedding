// src/actions/index.ts
// Astro Actions — type-safe server mutations replacing api/rsvp.ts and api/parties.ts
import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import {
  validatePartyByIdAndToken,
  patchParty,
  patchGuest,
  searchPartiesByName,
  searchGuestsForSeating,
  getTablemates,
} from '@lib/directus';
import { buildNameFilter } from '@lib/utils/search';

export const server = {
  submitRsvp: defineAction({
    input: z.object({
      token: z.string(),
      partyId: z.string(),
      partyPayload: z.object({
        status: z.enum([ 'confirmed', 'declined' ]),
        hotel: z.boolean(),
        transportation: z.boolean(),
        song_request: z.string().nullable(),
        message_to_couple: z.string().nullable(),
        date_rsvp_submitted: z.string(),
      }),
      guestPayloads: z.array(z.object({
        id: z.string(),
        attending: z.boolean(),
        attendance: z.array(z.enum(['ceremony', 'reception'])),
        meal_preference: z.string().nullable(),
        dietary_restrictions: z.string().nullable(),
      })),
    }),
    handler: async ({ token, partyId, partyPayload, guestPayloads }) => {
      // Validate token matches party — returns member IDs or null
      const memberIds = await validatePartyByIdAndToken(partyId, token);
      if (!memberIds) throw new Error('Invalid invitation token.');

      // Patch party record
      await patchParty(partyId, partyPayload);

      // Patch each guest — filter to members of this party only (IDOR guard)
      const safePayloads = guestPayloads.filter(g => memberIds.includes(g.id));
      if (safePayloads.length > 0) {
        await Promise.all(
          safePayloads.map((g) =>
            patchGuest(g.id, {
              attending:            g.attending,
              attendance:           g.attendance,
              meal_preference:      g.meal_preference,
              dietary_restrictions: g.dietary_restrictions,
            })
          )
        );
      }
      return { success: true };
    },
  }),

  searchParties: defineAction({
    input: z.object({ name: z.string().min(2) }),
    handler: async ({ name }) => {
      const parties = await searchPartiesByName(name);
      return { parties };
    },
  }),

  findSeat: defineAction({
    input: z.object({ name: z.string().min(2) }),
    handler: async ({ name }) => {
      const matches = await searchGuestsForSeating(buildNameFilter(name));
      if (!matches.length) return { seats: [] };

      // Fetch all attending guests at those tables in one query
      const tableIds = [...new Set(matches.map((g: any) => g.table.id as string))];
      const allGuests = await getTablemates(tableIds);

      // Group tablemates by table ID
      const byTable: Record<string, any[]> = {};
      for (const g of allGuests) {
        const tid = g.table?.id;
        if (tid) (byTable[tid] ??= []).push(g);
      }

      type PersonSnippet = { id: string; person: { first_name: string; last_name: string; preferred_name?: string | null } };
      type SeatResult = {
        table: { id: string; number: number; name?: string | null; section?: string | null };
        matched: PersonSnippet[];
        others:  PersonSnippet[];
      };

      // Deduplicate by table — multiple Platas at the same table = one card
      const matchesByTable = new Map<string, any[]>();
      for (const m of matches) {
        (matchesByTable.get(m.table.id) ?? matchesByTable.set(m.table.id, []).get(m.table.id)!).push(m);
      }

      const seats = [...matchesByTable.entries()].map(([tableId, tableMatches]): SeatResult => {
        const first = tableMatches[0];
        const matchedIds = new Set(tableMatches.map((m: any) => m.id));
        return {
          table: {
            id:      tableId,
            number:  first.table.number,
            name:    first.table.name ?? first.table.party?.name ?? null,
            section: first.table.section ?? 'unknown',
          },
          matched: tableMatches.map((m: any) => ({ id: m.id, person: m.person })),
          others:  (byTable[tableId] ?? []).filter((g: any) => !matchedIds.has(g.id)),
        };
      });

      return { seats };
    },
  }),
};
