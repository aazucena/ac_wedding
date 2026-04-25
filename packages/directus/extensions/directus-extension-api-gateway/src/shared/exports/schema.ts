import type { SchemaField } from './types';

// Internal pipeline types — not part of the public API
export type SubFieldData = { name: string; type: string; required: boolean; subType?: string; };
export type SchemaProp   = { name: string; type: string; required: boolean; subType?: string; subFields?: SubFieldData[]; };

// ── Naming utils ───────────────────────────────────────────────────────────
export function toPascal(s: string): string {
	return s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
		.replace(/^[a-z]/, c => c.toUpperCase());
}

export function toCamel(s: string): string {
	const p = toPascal(s);
	return p.charAt(0).toLowerCase() + p.slice(1);
}

// ── JSON Schema builder ────────────────────────────────────────────────────
export function fieldsToJsonSchema(fields: SchemaField[]): Record<string, unknown> {
	const properties: Record<string, unknown> = {};
	const required: string[] = [];
	for (const f of fields) {
		const propDef: Record<string, unknown> = {
			type:        f.nullable ? [f.type, 'null'] : f.type,
			...(f.description ? { description: f.description } : {}),
			...(f.example     ? { example:     f.example     } : {}),
		};
		if (f.type === 'array') {
			if (f.itemSchema && f.itemSchema.length > 0) {
				const itemRequired = f.itemSchema.filter(s => s.required).map(s => s.name);
				const itemProps: Record<string, unknown> = {};
				for (const s of f.itemSchema) {
					const sfDef: Record<string, unknown> = { type: s.nullable ? [s.type, 'null'] : s.type };
					if (s.type === 'array'  && s.itemType)  sfDef.items               = { type: s.itemType  };
					if (s.type === 'object' && s.valueType) sfDef.additionalProperties = { type: s.valueType };
					if (s.description) sfDef.description = s.description;
					if (s.example)     sfDef.example     = s.example;
					itemProps[s.name] = sfDef;
				}
				propDef.items = {
					type: 'object',
					properties: itemProps,
					...(itemRequired.length ? { required: itemRequired } : {}),
				};
			} else if (f.itemType) {
				propDef.items = { type: f.itemType };
			}
		} else if (f.type === 'object') {
			if (f.properties && f.properties.length > 0) {
				const subRequired = f.properties.filter(s => s.required).map(s => s.name);
				const subProps: Record<string, unknown> = {};
				for (const s of f.properties) {
					const sfDef: Record<string, unknown> = { type: s.nullable ? [s.type, 'null'] : s.type };
					if (s.type === 'array'  && s.itemType)  sfDef.items               = { type: s.itemType  };
					if (s.type === 'object' && s.valueType) sfDef.additionalProperties = { type: s.valueType };
					if (s.description) sfDef.description = s.description;
					if (s.example)     sfDef.example     = s.example;
					subProps[s.name] = sfDef;
				}
				propDef.properties = subProps;
				if (subRequired.length) propDef.required = subRequired;
			} else if (f.valueType) {
				propDef.additionalProperties = { type: f.valueType };
			}
		}
		properties[f.name] = propDef;
		if (f.required) required.push(f.name);
	}
	return {
		type:       'object',
		properties,
		...(required.length ? { required } : {}),
	};
}

// ── Prop extraction (JSON Schema → SchemaProp[]) ───────────────────────────
export function extractProps(schema: Record<string, unknown>): SchemaProp[] {
	const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
	const required   = (schema.required   ?? []) as string[];
	return Object.entries(properties).map(([key, def]) => {
		const rawType = def.type;
		const type    = Array.isArray(rawType) ? rawType[0] as string : (rawType as string) ?? 'unknown';
		let subType:   string | undefined;
		let subFields: SubFieldData[] | undefined;

		if (type === 'array') {
			const items = def.items as Record<string, unknown> | undefined;
			if (items?.type === 'object' && items.properties) {
				const itemProps = items.properties as Record<string, Record<string, unknown>>;
				const itemReq   = (items.required ?? []) as string[];
				subFields = Object.entries(itemProps).map(([k, v]) => ({
					name:     k,
					type:     (v.type as string) ?? 'string',
					required: itemReq.includes(k),
					subType:  (v.type as string) === 'array'
						? ((v.items as Record<string, unknown>)?.type as string | undefined)
						: (v.type as string) === 'object'
						? ((v.additionalProperties as Record<string, unknown>)?.type as string | undefined)
						: undefined,
				}));
			} else {
				subType = (items?.type as string) ?? undefined;
			}
		} else if (type === 'object') {
			if (def.properties) {
				const subProps = def.properties as Record<string, Record<string, unknown>>;
				const subReq   = (def.required ?? []) as string[];
				subFields = Object.entries(subProps).map(([k, v]) => ({
					name:     k,
					type:     (v.type as string) ?? 'string',
					required: subReq.includes(k),
					subType:  (v.type as string) === 'array'
						? ((v.items as Record<string, unknown>)?.type as string | undefined)
						: (v.type as string) === 'object'
						? ((v.additionalProperties as Record<string, unknown>)?.type as string | undefined)
						: undefined,
				}));
			} else {
				subType = ((def.additionalProperties as Record<string, unknown>)?.type as string) ?? undefined;
			}
		}
		return { name: key, type, required: required.includes(key), subType, subFields };
	});
}
