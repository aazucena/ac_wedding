import type { CombinedSchema } from './types';
import type { SubFieldData, SchemaProp } from './schema';
import { extractProps, toPascal, toCamel } from './schema';

function javaType(t: string, subType?: string, subFields?: SubFieldData[]): string {
	if (t === 'array') {
		if (subFields?.length) return 'List<Map<String, Object>>';
		const item = subType ? javaType(subType) : 'Object';
		return `List<${item}>`;
	}
	if (t === 'object') {
		const val = subType ? javaType(subType) : 'Object';
		return `Map<String, ${val}>`;
	}
	const map: Record<string, string> = {
		string: 'String', number: 'Double', integer: 'Integer', boolean: 'Boolean',
	};
	return map[t] ?? 'Object';
}

export function toJava14(s: CombinedSchema, name: string): string {
	const record = (label: string, props: SchemaProp[]) => {
		const components = props.map(p => `    ${javaType(p.type, p.subType, p.subFields)} ${toCamel(p.name)}`);
		const body = components.length ? `\n${components.join(',\n')}\n` : '';
		return `public record ${label}(${body}) {}\n`;
	};
	return ['import java.util.*;\n', record(`${name}Request`, extractProps(s.request)), record(`${name}Response`, extractProps(s.response))].join('\n');
}

export function toJava8(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const fields  = props.map(p => `    private ${javaType(p.type, p.subType, p.subFields)} ${toCamel(p.name)};`);
		const getters = props.map(p => {
			const n = toPascal(p.name);
			return `    public ${javaType(p.type, p.subType, p.subFields)} get${n}() { return ${toCamel(p.name)}; }`;
		});
		const setters = props.map(p => {
			const n = toPascal(p.name);
			return `    public void set${n}(${javaType(p.type, p.subType, p.subFields)} ${toCamel(p.name)}) { this.${toCamel(p.name)} = ${toCamel(p.name)}; }`;
		});
		return `public class ${label} {\n${fields.join('\n')}\n\n${getters.join('\n')}\n\n${setters.join('\n')}\n}\n`;
	};
	return ['import java.util.*;\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}

export function toJava8Lombok(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const fields = props.map(p => `    private ${javaType(p.type, p.subType, p.subFields)} ${toCamel(p.name)};`);
		return `@Data\n@Builder\n@NoArgsConstructor\n@AllArgsConstructor\npublic class ${label} {\n${fields.join('\n')}\n}\n`;
	};
	return ['import lombok.*;', 'import java.util.*;\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}
