import type { CombinedSchema } from './types';
import type { SubFieldData, SchemaProp } from './schema';
import { extractProps, toCamel } from './schema';

function ktType(t: string, required: boolean, subType?: string, subFields?: SubFieldData[]): string {
	let base: string;
	if (t === 'array') {
		if (subFields?.length) {
			base = 'List<Map<String, Any>>';
		} else {
			const item = subType ? ktType(subType, true) : 'Any';
			base = `List<${item}>`;
		}
	} else if (t === 'object') {
		const val = subType ? ktType(subType, true) : 'Any';
		base = `Map<String, ${val}>`;
	} else {
		const map: Record<string, string> = {
			string: 'String', number: 'Double', integer: 'Int', boolean: 'Boolean',
		};
		base = map[t] ?? 'Any';
	}
	return required ? base : `${base}?`;
}

export function toKotlinStandard(s: CombinedSchema, name: string): string {
	const data = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `data class ${label}()\n`;
		const params = props.map(p => `    val ${toCamel(p.name)}: ${ktType(p.type, p.required, p.subType, p.subFields)}${p.required ? '' : ' = null'}`);
		return `data class ${label}(\n${params.join(',\n')}\n)\n`;
	};
	return [data(`${name}Request`, extractProps(s.request)), data(`${name}Response`, extractProps(s.response))].join('\n');
}

export function toKotlinSerialization(s: CombinedSchema, name: string): string {
	const data = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `@Serializable\ndata class ${label}()\n`;
		const params = props.map(p => {
			const serialName = p.name !== toCamel(p.name) ? `    @SerialName("${p.name}")\n` : '';
			return `${serialName}    val ${toCamel(p.name)}: ${ktType(p.type, p.required, p.subType, p.subFields)}${p.required ? '' : ' = null'}`;
		});
		return `@Serializable\ndata class ${label}(\n${params.join(',\n')}\n)\n`;
	};
	return [
		'import kotlinx.serialization.Serializable',
		'import kotlinx.serialization.SerialName\n',
		data(`${name}Request`, extractProps(s.request)),
		data(`${name}Response`, extractProps(s.response)),
	].join('\n');
}
