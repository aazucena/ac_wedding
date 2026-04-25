import type { CombinedSchema } from './types';
import type { SubFieldData, SchemaProp } from './schema';
import { extractProps } from './schema';

function tsType(t: string, subType?: string, subFields?: SubFieldData[]): string {
	if (t === 'object' && subFields) {
		const body = subFields.map(s => `${s.name}${s.required ? '' : '?'}: ${tsType(s.type, s.subType)}`).join('; ');
		return `{ ${body} }`;
	}
	if (t === 'array' && subFields) {
		const body = subFields.map(s => `${s.name}${s.required ? '' : '?'}: ${tsType(s.type, s.subType)}`).join('; ');
		return `Array<{ ${body} }>`;
	}
	if (t === 'array')  return `${tsType(subType ?? 'unknown')}[]`;
	if (t === 'object') return `Record<string, ${tsType(subType ?? 'unknown')}>`;
	const map: Record<string, string> = {
		string: 'string', number: 'number', integer: 'number',
		boolean: 'boolean', null: 'null',
	};
	return map[t] ?? 'unknown';
}

function renderProps(props: SchemaProp[]): string {
	return props.map(p => `  ${p.name}${p.required ? '' : '?'}: ${tsType(p.type, p.subType, p.subFields)};`).join('\n');
}

export function toTsInterface(s: CombinedSchema, name: string): string {
	const iface = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `export interface ${label} {}\n`;
		return `export interface ${label} {\n${renderProps(props)}\n}\n`;
	};
	return [iface(`${name}Request`, extractProps(s.request)), iface(`${name}Response`, extractProps(s.response))].join('\n');
}

export function toTsType(s: CombinedSchema, name: string): string {
	const alias = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `export type ${label} = Record<string, never>;\n`;
		return `export type ${label} = {\n${renderProps(props)}\n};\n`;
	};
	return [alias(`${name}Request`, extractProps(s.request)), alias(`${name}Response`, extractProps(s.response))].join('\n');
}

function zodType(t: string, subType?: string, subFields?: SubFieldData[]): string {
	if (t === 'object' && subFields) {
		const body = subFields.map(s => {
			const base = zodType(s.type, s.subType);
			return `${s.name}: ${s.required ? base : `${base}.optional()`}`;
		}).join(', ');
		return `z.object({ ${body} })`;
	}
	if (t === 'array' && subFields) {
		const body = subFields.map(s => {
			const base = zodType(s.type, s.subType);
			return `${s.name}: ${s.required ? base : `${base}.optional()`}`;
		}).join(', ');
		return `z.array(z.object({ ${body} }))`;
	}
	if (t === 'array')  return `z.array(${zodType(subType ?? 'unknown')})`;
	if (t === 'object') return `z.record(z.string(), ${zodType(subType ?? 'unknown')})`;
	const map: Record<string, string> = {
		string: 'z.string()', number: 'z.number()', integer: 'z.number().int()',
		boolean: 'z.boolean()', null: 'z.null()',
	};
	return map[t] ?? 'z.unknown()';
}

export function toTsZod(s: CombinedSchema, name: string): string {
	const schema = (label: string, props: SchemaProp[]) => {
		const fields = props.map(p => {
			const t = p.required
				? zodType(p.type, p.subType, p.subFields)
				: `${zodType(p.type, p.subType, p.subFields)}.optional()`;
			return `  ${p.name}: ${t},`;
		});
		const body = fields.length ? `{\n${fields.join('\n')}\n}` : '{}';
		return `export const ${label}Schema = z.object(${body});\nexport type ${label} = z.infer<typeof ${label}Schema>;\n`;
	};
	return ["import { z } from 'zod';\n", schema(`${name}Request`, extractProps(s.request)), schema(`${name}Response`, extractProps(s.response))].join('\n');
}
