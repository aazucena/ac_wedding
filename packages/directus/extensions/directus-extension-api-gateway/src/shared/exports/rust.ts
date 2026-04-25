import type { CombinedSchema } from './types';
import type { SubFieldData, SchemaProp } from './schema';
import { extractProps } from './schema';

function rustType(t: string, subType?: string, _subFields?: SubFieldData[]): string {
	if (t === 'array') {
		const item = subType ? rustType(subType) : 'serde_json::Value';
		return `Vec<${item}>`;
	}
	if (t === 'object') {
		const val = subType ? rustType(subType) : 'serde_json::Value';
		return `std::collections::HashMap<String, ${val}>`;
	}
	const map: Record<string, string> = {
		string: 'String', number: 'f64', integer: 'i64', boolean: 'bool',
	};
	return map[t] ?? 'serde_json::Value';
}

function rustNativeType(t: string, subType?: string, _subFields?: SubFieldData[]): string {
	if (t === 'array') {
		const item = subType ? rustNativeType(subType) : 'Box<dyn std::any::Any>';
		return `Vec<${item}>`;
	}
	if (t === 'object') {
		const val = subType ? rustNativeType(subType) : 'Box<dyn std::any::Any>';
		return `std::collections::HashMap<String, ${val}>`;
	}
	const map: Record<string, string> = {
		string: 'String', number: 'f64', integer: 'i64', boolean: 'bool',
	};
	return map[t] ?? 'String';
}

function renderStruct(label: string, props: SchemaProp[], typeFn: (p: SchemaProp) => string, derives: string): string {
	if (!props.length) return `${derives}\npub struct ${label} {}\n`;
	const fields = props.map(p => `    pub ${p.name}: ${typeFn(p)},`);
	return `${derives}\npub struct ${label} {\n${fields.join('\n')}\n}\n`;
}

export function toRustSerde(s: CombinedSchema, name: string): string {
	const t = (p: SchemaProp) => p.required
		? rustType(p.type, p.subType, p.subFields)
		: `Option<${rustType(p.type, p.subType, p.subFields)}>`;
	const derives = '#[derive(Debug, Serialize, Deserialize)]';
	return [
		'use serde::{Deserialize, Serialize};\n',
		renderStruct(`${name}Request`,  extractProps(s.request),  t, derives),
		renderStruct(`${name}Response`, extractProps(s.response), t, derives),
	].join('\n');
}

export function toRustNative(s: CombinedSchema, name: string): string {
	const struct_ = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `#[derive(Debug)]\npub struct ${label} {}\n`;
		const t = (p: SchemaProp) => p.required
			? rustNativeType(p.type, p.subType, p.subFields)
			: `Option<${rustNativeType(p.type, p.subType, p.subFields)}>`;
		const fields   = props.map(p => `    pub ${p.name}: ${t(p)},`);
		const newArgs  = props.map(p => `        ${p.name}: ${t(p)}`);
		const newBody  = props.map(p => `            ${p.name},`);
		return [
			`#[derive(Debug)]\npub struct ${label} {\n${fields.join('\n')}\n}\n`,
			`impl ${label} {\n    pub fn new(\n${newArgs.join(',\n')}\n    ) -> Self {\n        Self {\n${newBody.join('\n')}\n        }\n    }\n}\n`,
		].join('');
	};
	return [struct_(`${name}Request`, extractProps(s.request)), struct_(`${name}Response`, extractProps(s.response))].join('\n');
}
