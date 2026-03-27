export const TABLE = 'api_endpoints';

export const LANG_EXT: Record<string, string> = {
	typescript: 'ts',   javascript: 'js',  python:  'py',
	rust:       'rs',   go:         'go',  kotlin:  'kt',
	java:       'java', csharp:     'cs',  php:     'php',
	cpp:        'cpp',  ruby:       'rb',  sql:     'sql',
	graphql:    'graphql', openapi: 'json', postman: 'json',
	json:       'json',
};

export interface EndpointRow {
	key:             string;
	flow:            string;
	method:          string;
	enabled:         boolean;
	request_schema:  unknown;
	response_schema: unknown;
	auth_required:   boolean;
	deprecated:      boolean;
	version:         string;
	description:     string | null;
	tags:            string | null;
}

export function parseJson(value: unknown): unknown {
	if (value === null || value === undefined) return null;
	if (typeof value === 'string') {
		try { return JSON.parse(value); } catch { return null; }
	}
	return value;
}

export function parseFieldArray(raw: unknown): unknown[] {
	if (!raw) return [];
	try {
		const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
		return Array.isArray(parsed) ? parsed : [];
	} catch { return []; }
}

export function parseTags(raw: string | null | undefined): string[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
	} catch { return []; }
}
