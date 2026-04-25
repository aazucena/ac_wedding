import type { CombinedSchema } from './types';
import { extractProps } from './schema';

function oasType(t: string, subType?: string): Record<string, unknown> {
	if (t === 'array') {
		return { type: 'array', items: subType ? oasType(subType) : {} };
	}
	if (t === 'object') {
		const base: Record<string, unknown> = { type: 'object' };
		if (subType) base.additionalProperties = oasType(subType);
		return base;
	}
	const map: Record<string, Record<string, unknown>> = {
		string: { type: 'string' }, number: { type: 'number' }, integer: { type: 'integer' },
		boolean: { type: 'boolean' },
	};
	return map[t] ?? { type: 'object' };
}

function schemaToOas(schema: Record<string, unknown>): Record<string, unknown> {
	const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
	const req   = (schema.required ?? []) as string[];
	const out: Record<string, unknown> = { type: 'object', properties: {} };
	for (const [k, def] of Object.entries(props)) {
		const rawType = def.type;
		const t = Array.isArray(rawType) ? rawType[0] as string : (rawType as string) ?? 'string';

		if (t === 'object' && def.properties) {
			(out.properties as Record<string, unknown>)[k] = schemaToOas(def as Record<string, unknown>);
		} else if (t === 'array') {
			const items = def.items as Record<string, unknown> | undefined;
			if (items?.type === 'object' && items.properties) {
				(out.properties as Record<string, unknown>)[k] = {
					type:  'array',
					items: schemaToOas(items as Record<string, unknown>),
				};
			} else {
				(out.properties as Record<string, unknown>)[k] = oasType(t, items?.type as string | undefined);
			}
		} else {
			const additionalProps = def.additionalProperties as Record<string, unknown> | undefined;
			(out.properties as Record<string, unknown>)[k] = oasType(t, additionalProps?.type as string | undefined);
		}
	}
	if (req.length) out.required = req;
	return out;
}

export function toOpenAPI(s: CombinedSchema, name: string, flowKey: string, method: 'GET' | 'POST'): string {
	const reqProps    = (s.request.properties ?? {}) as Record<string, Record<string, unknown>>;
	const reqRequired = (s.request.required   ?? []) as string[];
	const operation: Record<string, unknown> = {
		summary: `Trigger ${name} flow`,
		responses: { '200': { description: 'Success', content: { 'application/json': { schema: schemaToOas(s.response) } } } },
	};
	if (method === 'GET') {
		operation['parameters'] = Object.entries(reqProps).map(([pName, def]) => {
			const rawType = def.type;
			const t = Array.isArray(rawType) ? rawType[0] as string : (rawType as string) ?? 'string';
			let schema: Record<string, unknown>;
			if (t === 'object' && def.properties) {
				schema = schemaToOas(def as Record<string, unknown>);
			} else if (t === 'array') {
				const items = def.items as Record<string, unknown> | undefined;
				if (items?.type === 'object' && items.properties) {
					schema = { type: 'array', items: schemaToOas(items as Record<string, unknown>) };
				} else {
					schema = oasType(t, items?.type as string | undefined);
				}
			} else {
				const additionalProps = def.additionalProperties as Record<string, unknown> | undefined;
				schema = oasType(t, additionalProps?.type as string | undefined);
			}
			return { name: pName, in: 'query', required: reqRequired.includes(pName), schema };
		});
	} else {
		operation['requestBody'] = { required: true, content: { 'application/json': { schema: schemaToOas(s.request) } } };
	}
	return JSON.stringify({
		openapi: '3.1.0',
		info: { title: name, version: '1.0.0' },
		paths: { [`/flows/trigger/${flowKey}`]: { [method.toLowerCase()]: operation } },
	}, null, 2);
}
