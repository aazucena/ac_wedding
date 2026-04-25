import type { CombinedSchema } from './types';
import type { SubFieldData, SchemaProp } from './schema';
import { extractProps, toPascal } from './schema';

function csType(t: string, required: boolean, subType?: string, subFields?: SubFieldData[]): string {
	let base: string;
	if (t === 'array') {
		if (subFields?.length) {
			base = 'Dictionary<string, object>[]';
		} else {
			const item = subType ? csType(subType, true) : 'object';
			base = `${item}[]`;
		}
	} else if (t === 'object') {
		const val = subType ? csType(subType, true) : 'object';
		base = `Dictionary<string, ${val}>`;
	} else {
		const map: Record<string, string> = {
			string: 'string?', number: 'double', integer: 'int', boolean: 'bool',
		};
		base = map[t] ?? 'object';
	}
	if (!required && !base.endsWith('?')) return base + '?';
	return base;
}

export function toCSharp(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const fields = props.map(p => `    public ${csType(p.type, p.required, p.subType, p.subFields)} ${toPascal(p.name)} { get; set; }`);
		return `public class ${label}\n{\n${fields.join('\n')}\n}\n`;
	};
	return ['using System.Collections.Generic;\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}
