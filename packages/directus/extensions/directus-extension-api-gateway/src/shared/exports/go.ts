import type { CombinedSchema } from './types';
import type { SubFieldData, SchemaProp } from './schema';
import { extractProps, toPascal } from './schema';

function goType(t: string, subType?: string, subFields?: SubFieldData[]): string {
	if (t === 'object' && subFields) {
		const fields = subFields.map(s => {
			const tag = `\`json:"${s.name}${s.required ? '' : ',omitempty'}"\``;
			return `${toPascal(s.name)} ${goType(s.type, s.subType)} ${tag}`;
		}).join('; ');
		return `struct { ${fields} }`;
	}
	if (t === 'array' && subFields) {
		const fields = subFields.map(s => {
			const tag = `\`json:"${s.name}${s.required ? '' : ',omitempty'}"\``;
			return `${toPascal(s.name)} ${goType(s.type, s.subType)} ${tag}`;
		}).join('; ');
		return `[]struct { ${fields} }`;
	}
	if (t === 'array') {
		const item = subType ? goType(subType) : 'interface{}';
		return `[]${item}`;
	}
	if (t === 'object') {
		const val = subType ? goType(subType) : 'interface{}';
		return `map[string]${val}`;
	}
	const map: Record<string, string> = {
		string: 'string', number: 'float64', integer: 'int64', boolean: 'bool',
	};
	return map[t] ?? 'interface{}';
}

export function toGo(s: CombinedSchema, name: string): string {
	const struct_ = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `type ${label} struct{}\n`;
		const fields = props.map(p => {
			const tag = `\`json:"${p.name}${p.required ? '' : ',omitempty'}"\``;
			return `\t${toPascal(p.name)} ${goType(p.type, p.subType, p.subFields)} ${tag}`;
		});
		return `type ${label} struct {\n${fields.join('\n')}\n}\n`;
	};
	return ['package main\n', struct_(`${name}Request`, extractProps(s.request)), struct_(`${name}Response`, extractProps(s.response))].join('\n');
}
