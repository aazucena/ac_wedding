import type { SchemaField } from '../shared/schema-export';

// ── String helpers ─────────────────────────────────────────────────────────

/** Full snake_case normalisation — strips leading/trailing underscores. Used on save/blur. */
export function toSnake(s: string | null | undefined): string {
	if (!s) return '';
	return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/** Mid-typing variant: keeps trailing underscore so "rsvp " → "rsvp_". Leading underscores are still stripped. */
export function toSnakeTyping(s: string | null | undefined): string {
	if (!s) return '';
	return s.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+/, '');
}

// ── Parse helpers ──────────────────────────────────────────────────────────

export function parseTagArray(raw: unknown): string[] {
	if (!raw) return [];
	try {
		const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
		return Array.isArray(parsed) ? parsed.map(String) : [];
	} catch { return []; }
}

export function parseFieldArray(raw: unknown): SchemaField[] {
	if (!raw) return [];
	try {
		const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
		return Array.isArray(parsed) ? parsed : [];
	} catch { return []; }
}
