// actions/flows.ts
// Fetches all enabled POST endpoints from the api-gateway and maps each one as
// a generic Astro Action. The action key is derived from the gateway's stable
// snake_case key converted to camelCase.
//
// Example: "rsvp_contact_details" → rsvpContactDetails
//
// Unlike the previous approach (fetching raw Directus flow UUIDs), this routes
// through the api-gateway proxy (/api/v1/:key) which enforces method, schema
// validation, and auth — and uses keys that survive flow recreation.

import { defineAction }                    from 'astro:actions';
import { z }                               from 'astro/zod';
import { DIRECTUS_URL, DIRECTUS_TOKEN }    from 'astro:env/server';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GatewayKeyInfo {
	id:              string;   // underlying flow UUID (kept for reference)
	method:          string;
	request_schema:  unknown;
	response_schema: unknown;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toActionKey(snakeKey: string): string {
	return snakeKey.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

// ── Gateway key fetcher ───────────────────────────────────────────────────────

async function fetchGatewayPostKeys(): Promise<Record<string, GatewayKeyInfo>> {
	const res = await fetch(`${DIRECTUS_URL}/api/keys`, {
		headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
		signal:  AbortSignal.timeout(8_000),
	});
	if (!res.ok) throw new Error(`Failed to fetch gateway keys: ${res.status}`);

	const data = await res.json() as Record<string, GatewayKeyInfo>;
	return Object.fromEntries(
		Object.entries(data).filter(([, v]) => v.method.toUpperCase() === 'POST'),
	);
}

// ── Builder ───────────────────────────────────────────────────────────────────

export async function buildFlowActions() {
	const keys = await fetchGatewayPostKeys();

	const entries = Object.entries(keys).map(([key, _info]) => {
		const action = defineAction({
			input: z.record(z.unknown()),
			handler: async (payload) => {
				const res = await fetch(`${DIRECTUS_URL}/api/v1/${key}`, {
					method:  'POST',
					headers: {
						Authorization:  `Bearer ${DIRECTUS_TOKEN}`,
						'Content-Type': 'application/json',
					},
					body:   JSON.stringify(payload),
					signal: AbortSignal.timeout(10_000),
				});
				if (!res.ok) {
					const body = await res.json().catch(() => ({}));
					throw new Error(
						(body as any)?.error ?? `Endpoint "${key}" failed (${res.status})`,
					);
				}
				return res.json() as Promise<Record<string, unknown>>;
			},
		});

		return [toActionKey(key), action] as const;
	});

	return Object.fromEntries(entries);
}
