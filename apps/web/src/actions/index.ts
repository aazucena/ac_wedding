// src/actions/index.ts
// Astro Actions — type-safe server mutations replacing api/rsvp.ts and api/parties.ts
import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';
import { DIRECTUS_URL, DIRECTUS_TOKEN } from 'astro:env/server';
import {
  validatePartyByIdAndToken,
  patchParty,
  patchGuest,
  searchPartiesByName,
  searchGuestsForSeating,
  getTablemates,
  lookupGuestIdByName,
  createGuestbookEntry,
  hasExistingGuestbookEntry,
  getSettings,
  get,
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

  checkPlusOne: defineAction({
    input: z.object({
      token:     z.string(),
      partyId:   z.string(),
      firstName: z.string().min(1).max(255),
      lastName:  z.string().min(1).max(255),
    }),
    handler: async ({ token, partyId, firstName, lastName }) => {
      const memberIds = await validatePartyByIdAndToken(partyId, token);
      if (!memberIds) throw new Error('Invalid invitation token.');

      const settings = await getSettings();
      const norm     = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
      const normFn   = norm(firstName);
      const normLn   = norm(lastName);
      const fullName = `${firstName} ${lastName}`;

      // ── Blocked persons: groom, bride, and both sets of parents ──────────
      const BLOCKED: Array<[string, string, string]> = [
        [settings.groom?.preferred_name ?? '', settings.groom?.last_name ?? 'Azucena', 'the groom'],
        [settings.groom?.first_name     ?? '', settings.groom?.last_name ?? 'Azucena', 'the groom'],
        [settings.bride?.preferred_name ?? '', settings.bride?.last_name ?? 'Ranada',  'the bride'],
        [settings.bride?.first_name     ?? '', settings.bride?.last_name ?? 'Ranada',  'the bride'],
        ['Cesar',    'Azucena', "the groom's father"],
        ['Amelia',   'Azucena', "the groom's mother"],
        ['Benjamin', 'Aquino',  "the bride's father"],
        ['Bengie',   'Aquino',  "the bride's father"],
        ['Ceferina', 'Aquino',  "the bride's mother"],
        ['Rina',     'Aquino',  "the bride's mother"],
      ];
      const blocked = BLOCKED.find(([fn, ln]) => norm(fn) === normFn && norm(ln) === normLn && fn !== '');
      if (blocked) throw new Error(`${fullName} cannot be added as a plus-one (${blocked[2]}).`);

      // ── Look up existing guests whose person matches by last name ─────────
      // Use _icontains for a case-insensitive DB sweep, then exact-match in TS.
      type GuestHit = { id: string; party: { id: string; status: string }; person: { id: string; first_name: string; preferred_name: string | null; last_name: string } };
      const candidates = await get<GuestHit[]>('/items/guests', {
        filter: { person: { last_name: { _icontains: lastName } } },
        fields: ['id', 'party.id', 'party.status', 'person.id', 'person.first_name', 'person.preferred_name', 'person.last_name'],
        limit: 50,
      });

      const existing = candidates.filter(g =>
        norm(g.person.last_name) === normLn &&
        (norm(g.person.first_name) === normFn || norm(g.person.preferred_name) === normFn)
      );

      // No guest records with this name → person either doesn't exist in
      // Directus or exists but isn't tied to any party — both are allowed.
      if (existing.length === 0) return { valid: true };

      // Duplicate: already a guest of this party
      if (existing.some(g => g.party.id === partyId)) {
        throw new Error(`${fullName} is already in your party.`);
      }

      // Already a confirmed guest of a different party
      if (existing.some(g => g.party.id !== partyId && g.party.status === 'confirmed')) {
        throw new Error(`${fullName} is already a confirmed wedding guest.`);
      }

      // Registered under a different invitation (not yet confirmed)
      throw new Error(`${fullName} is already registered under a different invitation.`);
    },
  }),

  submitPlusOnes: defineAction({
    input: z.object({
      token:           z.string(),
      partyId:         z.string(),
      plusOnePayloads: z.array(z.object({
        firstName:            z.string().min(1).max(255),
        lastName:             z.string().min(1).max(255),
        gender:               z.enum(['male', 'female']),
        type:                 z.enum(['adult', 'teen', 'child', 'infant']),
        attending:            z.boolean(),
        attendance:           z.array(z.enum(['ceremony', 'reception'])),
        dietary_restrictions: z.string().nullable(),
      })),
    }),
    handler: async ({ token, partyId, plusOnePayloads }) => {
      const memberIds = await validatePartyByIdAndToken(partyId, token);
      if (!memberIds) throw new Error('Invalid invitation token.');

      const [partyMeta, settingsMeta] = await Promise.all([
        get<{ plus_ones_allowed: number | null }>(`/items/parties/${partyId}`, { fields: ['plus_ones_allowed'] }),
        getSettings(),
      ]);
      const cap = partyMeta.plus_ones_allowed ?? settingsMeta.plus_ones_allowed ?? 0;
      if (plusOnePayloads.length > cap) throw new Error('Plus-one limit exceeded.');

      // Block bride, groom, and their parents from being added as plus-ones.
      const groomFirst  = settingsMeta.groom?.preferred_name ?? settingsMeta.groom?.first_name ?? '';
      const brideFirst  = settingsMeta.bride?.preferred_name ?? settingsMeta.bride?.first_name ?? '';
      const BLOCKED = new Set(
        [groomFirst, brideFirst, 'Eissa Aldrin', 'Ma Christine',
         'Cesar', 'Amelia', 'Benjamin', 'Bengie', 'Ceferina', 'Rina']
          .filter(Boolean).map(n => n.toLowerCase().trim())
      );
      for (const p of plusOnePayloads) {
        if (BLOCKED.has(p.firstName.toLowerCase().trim())) {
          throw new Error(`${p.firstName} ${p.lastName} cannot be added as a plus-one.`);
        }
      }

      const res = await fetch(`${DIRECTUS_URL}/api/v1/extra_guest`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${DIRECTUS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          party:  partyId,
          guests: plusOnePayloads.map(p => ({
            first_name:           p.firstName,
            last_name:            p.lastName,
            gender:               p.gender,
            type:                 p.type,
            attending:            p.attending,
            attendance:           p.attendance,
            dietary_restrictions: p.dietary_restrictions ?? null,
          })),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.error ?? 'Failed to add plus-one(s).');
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
      name:    z.string().min(1).max(255),
      message: z.string().min(1),
    }),
    handler: async ({ name, message }) => {
      const guestId = await lookupGuestIdByName(name);
      const verified = guestId !== null;

      if (guestId && await hasExistingGuestbookEntry(guestId)) {
        throw new ActionError({
          code: 'CONFLICT',
          message: 'You have already left a message in the guestbook.',
        });
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
