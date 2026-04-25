import type { CombinedSchema } from './types';
import type { SubFieldData, SchemaProp } from './schema';
import { extractProps } from './schema';

function pyType36(t: string, subType?: string, subFields?: SubFieldData[]): string {
	if (t === 'array') {
		if (subFields?.length) return 'List[Dict[str, Any]]';
		const item = subType ? pyType36(subType) : 'Any';
		return `List[${item}]`;
	}
	if (t === 'object') {
		const val = subType ? pyType36(subType) : 'Any';
		return `Dict[str, ${val}]`;
	}
	const map: Record<string, string> = {
		string: 'str', number: 'float', integer: 'int', boolean: 'bool',
	};
	return map[t] ?? 'Any';
}

function pyType39(t: string, subType?: string, subFields?: SubFieldData[]): string {
	if (t === 'array') {
		if (subFields?.length) return 'list[dict[str, Any]]';
		const item = subType ? pyType39(subType) : 'Any';
		return `list[${item}]`;
	}
	if (t === 'object') {
		const val = subType ? pyType39(subType) : 'Any';
		return `dict[str, ${val}]`;
	}
	const map: Record<string, string> = {
		string: 'str', number: 'float', integer: 'int', boolean: 'bool',
	};
	return map[t] ?? 'Any';
}

export function toPython310(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `@dataclass\nclass ${label}:\n    pass\n`;
		const fields = props.map(p => {
			const t = pyType39(p.type, p.subType, p.subFields);
			return p.required ? `    ${p.name}: ${t}` : `    ${p.name}: ${t} | None = None`;
		});
		return `@dataclass\nclass ${label}:\n${fields.join('\n')}\n`;
	};
	return ['from dataclasses import dataclass\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}

export function toPython39(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `@dataclass\nclass ${label}:\n    pass\n`;
		const fields = props.map(p => {
			const t = pyType39(p.type, p.subType, p.subFields);
			return p.required ? `    ${p.name}: ${t}` : `    ${p.name}: Optional[${t}] = None`;
		});
		return `@dataclass\nclass ${label}:\n${fields.join('\n')}\n`;
	};
	return ['from dataclasses import dataclass', 'from typing import Optional, Any\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}

export function toPython36(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `@dataclass\nclass ${label}:\n    pass\n`;
		const fields = props.map(p => {
			const t = pyType36(p.type, p.subType, p.subFields);
			return p.required ? `    ${p.name}: ${t}` : `    ${p.name}: Optional[${t}] = None`;
		});
		return `@dataclass\nclass ${label}:\n${fields.join('\n')}\n`;
	};
	return ['from dataclasses import dataclass', 'from typing import Optional, Any, List, Dict\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}
