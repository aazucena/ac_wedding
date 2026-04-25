import type { CombinedSchema } from './types';

export function toPostman(s: CombinedSchema, name: string, flowKey: string, method: 'GET' | 'POST'): string {
	const baseUrl  = `{{directus_url}}/flows/trigger/${flowKey}`;
	const reqProps = (s.request.properties ?? {}) as Record<string, Record<string, unknown>>;
	const request: Record<string, unknown> = {
		method,
		header: method === 'POST' ? [{ key: 'Content-Type', value: 'application/json' }] : [],
		url: method === 'GET'
			? { raw: baseUrl, host: ['{{directus_url}}'], path: ['flows', 'trigger', flowKey], query: Object.keys(reqProps).map(k => ({ key: k, value: '' })) }
			: { raw: baseUrl, host: ['{{directus_url}}'], path: ['flows', 'trigger', flowKey] },
	};
	if (method === 'POST') {
		const samples: Record<string, unknown> = { string: 'string', number: 0, integer: 0, boolean: true, array: [], object: {} };
		const body = Object.fromEntries(Object.entries(reqProps).map(([k, def]) => {
			const rawType = def.type;
			const t = Array.isArray(rawType) ? rawType[0] as string : (rawType as string) ?? 'string';
			return [k, samples[t] ?? null];
		}));
		request['body'] = { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
	}
	return JSON.stringify({
		info: { name, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
		item: [{ name: `${method} ${name}`, request }],
		variable: [{ key: 'directus_url', value: 'http://localhost:8055' }],
	}, null, 2);
}
