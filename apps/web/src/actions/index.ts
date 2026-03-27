// src/actions/index.ts
// Astro Actions — type-safe server mutations replacing api/rsvp.ts and api/parties.ts
import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { DIRECTUS_URL, DIRECTUS_TOKEN } from 'astro:env/server';
import {
  validatePartyByIdAndToken,
  patchParty,
  patchGuest,
  searchPartiesByName,
  searchGuestsForSeating,
  getTablemates,
  verifyGuestNameAndTable,
  createGuestbookEntry,
  getSettings,
} from '@lib/directus';
import { buildNameFilter } from '@lib/utils/search';
import { buildFlowActions } from './flows';

const flowActions = await buildFlowActions();

export const server = {
  ...flowActions,
  submitRsvp: defineAction({
    input: z.object({
      token: z.string(),
      partyId: z.string(),
      partyPayload: z.object({
        status: z.enum([ 'confirmed', 'declined' ]),
        hotel: z.boolean(),
        representative: z.string(),
        transportation: z.boolean(),
        song_request: z.string().nullable(),
        message_to_couple: z.string().nullable(),
        date_rsvp_submitted: z.string(),
      }),
      guestPayloads: z.array(z.object({
        id: z.string(),
        attending: z.boolean(),
        attendance: z.array(z.enum(['ceremony', 'reception'])),
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
              dietary_restrictions: g.dietary_restrictions,
            })
          )
        );
      }
      return { success: true };
    },
  }),

  submitContactDetails: defineAction({
    input: z.object({
      token:          z.string(),
      partyId:        z.string(),
      guestId:        z.string(),        // guests.id — used for party membership check
      representative: z.string(),        // persons.id — the record that gets phone/email updated
      phone:          z.string().nullable(),
      email:          z.email().nullable(),
    }).refine(({ phone, email }) => !!(phone || email), {
      message: 'Please provide at least a phone number or email address.',
    }),
    handler: async ({ token, partyId, guestId, representative, phone, email }) => {
      // Validate token and ensure the selected guest belongs to this party
      const memberIds = await validatePartyByIdAndToken(partyId, token);
      if (!memberIds) throw new Error('Invalid invitation token.');
      if (!memberIds.includes(guestId)) {
        throw new Error('Selected representative is not a member of your party.');
      }

      // Forward to the gateway — the flow performs the person↔guest ownership check
      const res = await fetch(`${DIRECTUS_URL}/api/v1/representative`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${DIRECTUS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body:   JSON.stringify({ token, id: guestId, party: partyId, representative, phone: phone || null, email: email || null }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.error ?? 'Failed to update contact details.');
      }

      return { success: true };
    },
  }),

  submitGuestbookEntry: defineAction({
    input: z.object({
      name:        z.string().min(1).max(255),
      message:     z.string().min(1),
      tableNumber: z.number().int().positive().nullable(),
    }),
    handler: async ({ name, message, tableNumber }) => {
      let guestId: string | null = null;
      let verified = false;

      if (tableNumber !== null) {
        guestId = await verifyGuestNameAndTable(name, tableNumber);
        verified = guestId !== null;
      }

      const settings = await getSettings();
      const receptionId = settings.reception?.id ?? null;

      await createGuestbookEntry({
        name,
        message,
        status:    verified ? 'published' : 'draft',
        verified,
        guest:     guestId,
        reception: receptionId,
      });

      return { verified };
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
