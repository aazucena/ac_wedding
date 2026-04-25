import type { CombinedSchema } from './types';
import type { SubFieldData, SchemaProp } from './schema';
import { extractProps, toCamel } from './schema';

function gqlType(t: string, required: boolean, subType?: string, _subFields?: SubFieldData[]): string {
	let base: string;
	if (t === 'array') {
		const item = subType ? gqlType(subType, true) : 'JSON';
		base = `[${item}]`;
	} else if (t === 'object') {
		base = 'JSON';
	} else {
		const map: Record<string, string> = {
			string: 'String', number: 'Float', integer: 'Int', boolean: 'Boolean',
		};
		base = map[t] ?? 'JSON';
	}
	return required ? `${base}!` : base;
}

export function toGraphQL(s: CombinedSchema, name: string): string {
	const type_ = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `type ${label}\n`;
		return `type ${label} {\n${props.map(p => `  ${p.name}: ${gqlType(p.type, p.required, p.subType, p.subFields)}`).join('\n')}\n}\n`;
	};
	const reqProps = extractProps(s.request);
	return [
		'scalar JSON\n',
		type_(`${name}Request`, reqProps),
		type_(`${name}Response`, extractProps(s.response)),
		`input ${name}Input {\n${reqProps.map(p => `  ${p.name}: ${gqlType(p.type, p.required, p.subType, p.subFields)}`).join('\n')}\n}\n`,
		`type Mutation {\n  ${toCamel(name)}(input: ${name}Input!): ${name}Response\n}\n`,
	].join('\n');
}
