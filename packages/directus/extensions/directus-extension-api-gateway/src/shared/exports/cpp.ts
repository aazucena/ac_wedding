import type { CombinedSchema } from './types';
import type { SubFieldData, SchemaProp } from './schema';
import { extractProps } from './schema';

function cppType(t: string, subType?: string, _subFields?: SubFieldData[]): string {
	if (t === 'array') {
		const item = subType ? cppType(subType) : 'nlohmann::json';
		return `std::vector<${item}>`;
	}
	if (t === 'object') {
		const val = subType ? cppType(subType) : 'nlohmann::json';
		return `std::map<std::string, ${val}>`;
	}
	const map: Record<string, string> = {
		string: 'std::string', number: 'double', integer: 'int64_t', boolean: 'bool',
	};
	return map[t] ?? 'nlohmann::json';
}

export function toCpp(s: CombinedSchema, name: string): string {
	const struct_ = (label: string, props: SchemaProp[]) => {
		const fields = props.map(p => `    ${cppType(p.type, p.subType, p.subFields)} ${p.name};`);
		return `struct ${label} {\n${fields.join('\n')}\n};\n`;
	};
	return ['#include <string>\n#include <nlohmann/json.hpp>\n', struct_(`${name}Request`, extractProps(s.request)), struct_(`${name}Response`, extractProps(s.response))].join('\n');
}
