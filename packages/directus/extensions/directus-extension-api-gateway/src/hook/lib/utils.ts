/**
 * Converts a Directus flow name to a URL-safe snake_case key.
 * Strips the "Flow XX — " prefix that Directus adds automatically.
 *
 * @example
 * toFlowKey('Flow 08 — RSVP Contact Details') // → 'rsvp_contact_details'
 */
export function toFlowKey(name: string): string {
	return name
		.replace(/^flow\s+\d+\s+[—–\-]\s+/i, '') // strip "Flow XX — " prefix
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

export function parseOptions(raw: unknown): Record<string, unknown> {
	if (!raw) return {};
	if (typeof raw === 'string') {
		try { return JSON.parse(raw); } catch { return {}; }
	}
	return raw as Record<string, unknown>;
}
