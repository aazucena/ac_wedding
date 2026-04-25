import type { CombinedSchema } from './types';
import { extractProps } from './schema';

function sqlType(t: string): string {
	const map: Record<string, string> = {
		string: 'TEXT', number: 'DOUBLE PRECISION', integer: 'BIGINT',
		boolean: 'BOOLEAN', array: 'JSONB', object: 'JSONB',
	};
	return map[t] ?? 'TEXT';
}

export function toSql(s: CombinedSchema, name: string): string {
	const table = (label: string, props: ReturnType<typeof extractProps>) => {
		const cols = [
			`  id UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
			...props.map(p => `  ${p.name} ${sqlType(p.type)}${p.required ? ' NOT NULL' : ''}`),
			`  created_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
		];
		return `CREATE TABLE ${label.toLowerCase()} (\n${cols.join(',\n')}\n);\n`;
	};
	return [table(`${name}Request`, extractProps(s.request)), table(`${name}Response`, extractProps(s.response))].join('\n');
}
