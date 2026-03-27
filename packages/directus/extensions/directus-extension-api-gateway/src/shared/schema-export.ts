// schema-export.ts
// Converts a { request, response } JSON Schema pair into
// source code / spec output for multiple language/format targets.

// ── Repeater field definition (stored in api_endpoints) ────────────────────
export type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

export interface SchemaField {
	name:         string;
	type:         FieldType;
	required:     boolean;
	nullable?:    boolean;
	description?: string;
	example?:     string;
}

export function fieldsToJsonSchema(fields: SchemaField[]): Record<string, unknown> {
	const properties: Record<string, unknown> = {};
	const required: string[] = [];
	for (const f of fields) {
		properties[f.name] = {
			type:        f.nullable ? [f.type, 'null'] : f.type,
			...(f.description ? { description: f.description } : {}),
			...(f.example     ? { example:     f.example     } : {}),
		};
		if (f.required) required.push(f.name);
	}
	return {
		type:       'object',
		properties,
		...(required.length ? { required } : {}),
	};
}

// ── JSON Schema pair (input to all export functions) ───────────────────────
export interface CombinedSchema {
	request:  Record<string, unknown>;
	response: Record<string, unknown>;
}

export type LangKey =
	| 'typescript_interface' | 'typescript_type'    | 'typescript_zod'
	| 'rust_serde'           | 'rust_native'
	| 'php_82'               | 'php_81'              | 'php_80'    | 'php_74' | 'php_56'
	| 'java_14'              | 'java_8'              | 'java_8_lombok'
	| 'python_310'           | 'python_39'           | 'python_36'
	| 'kotlin_standard'      | 'kotlin_serialization'
	| 'csharp' | 'go' | 'cpp' | 'ruby' | 'sql' | 'graphql' | 'openapi' | 'postman';

// ── Entry point ────────────────────────────────────────────────────────────
export function generateExport(
	schema: CombinedSchema,
	flowKey: string,
	lang: LangKey,
	method: 'GET' | 'POST' = 'POST',
): string {
	const name = toPascal(flowKey);
	switch (lang) {
		// TypeScript
		case 'typescript_interface': return toTsInterface(schema, name);
		case 'typescript_type':      return toTsType(schema, name);
		case 'typescript_zod':       return toTsZod(schema, name);
		// Rust
		case 'rust_serde':           return toRustSerde(schema, name);
		case 'rust_native':          return toRustNative(schema, name);
		// PHP
		case 'php_82':               return toPhp82(schema, name);
		case 'php_81':               return toPhp81(schema, name);
		case 'php_80':               return toPhp80(schema, name);
		case 'php_74':               return toPhp74(schema, name);
		case 'php_56':               return toPhp56(schema, name);
		// Java
		case 'java_14':              return toJava14(schema, name);
		case 'java_8':               return toJava8(schema, name);
		case 'java_8_lombok':        return toJava8Lombok(schema, name);
		// Python
		case 'python_310':           return toPython310(schema, name);
		case 'python_39':            return toPython39(schema, name);
		case 'python_36':            return toPython36(schema, name);
		// Kotlin
		case 'kotlin_standard':      return toKotlinStandard(schema, name);
		case 'kotlin_serialization': return toKotlinSerialization(schema, name);
		// Others
		case 'csharp':               return toCSharp(schema, name);
		case 'go':                   return toGo(schema, name);
		case 'cpp':                  return toCpp(schema, name);
		case 'ruby':                 return toRuby(schema, name);
		case 'sql':                  return toSql(schema, name);
		case 'graphql':              return toGraphQL(schema, name);
		case 'openapi':              return toOpenAPI(schema, name, flowKey, method);
		case 'postman':              return toPostman(schema, name, flowKey, method);
		default:                     return '';
	}
}

// ── Naming utils ───────────────────────────────────────────────────────────
function toPascal(s: string): string {
	return s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
		.replace(/^[a-z]/, c => c.toUpperCase());
}

function toCamel(s: string): string {
	const p = toPascal(s);
	return p.charAt(0).toLowerCase() + p.slice(1);
}

// ── Prop extraction ────────────────────────────────────────────────────────
type SchemaProp = { name: string; type: string; required: boolean; };

function extractProps(schema: Record<string, unknown>): SchemaProp[] {
	const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
	const required   = (schema.required   ?? []) as string[];
	return Object.entries(properties).map(([key, def]) => ({
		name:     key,
		type:     (def.type as string) ?? 'unknown',
		required: required.includes(key),
	}));
}

// ══════════════════════════════════════════════════════════════════════════
// TypeScript
// ══════════════════════════════════════════════════════════════════════════

function tsType(t: string): string {
	const map: Record<string, string> = {
		string: 'string', number: 'number', integer: 'number',
		boolean: 'boolean', array: 'unknown[]', object: 'Record<string, unknown>', null: 'null',
	};
	return map[t] ?? 'unknown';
}

function toTsInterface(s: CombinedSchema, name: string): string {
	const iface = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `export interface ${label} {}\n`;
		const lines = props.map(p => `  ${p.name}${p.required ? '' : '?'}: ${tsType(p.type)};`);
		return `export interface ${label} {\n${lines.join('\n')}\n}\n`;
	};
	return [iface(`${name}Request`, extractProps(s.request)), iface(`${name}Response`, extractProps(s.response))].join('\n');
}

function toTsType(s: CombinedSchema, name: string): string {
	const alias = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `export type ${label} = Record<string, never>;\n`;
		const lines = props.map(p => `  ${p.name}${p.required ? '' : '?'}: ${tsType(p.type)};`);
		return `export type ${label} = {\n${lines.join('\n')}\n};\n`;
	};
	return [alias(`${name}Request`, extractProps(s.request)), alias(`${name}Response`, extractProps(s.response))].join('\n');
}

function zodType(t: string): string {
	const map: Record<string, string> = {
		string: 'z.string()', number: 'z.number()', integer: 'z.number().int()',
		boolean: 'z.boolean()', array: 'z.array(z.unknown())',
		object: 'z.record(z.string(), z.unknown())', null: 'z.null()',
	};
	return map[t] ?? 'z.unknown()';
}

function toTsZod(s: CombinedSchema, name: string): string {
	const schema = (label: string, props: SchemaProp[]) => {
		const fields = props.map(p => {
			const t = p.required ? zodType(p.type) : `${zodType(p.type)}.optional()`;
			return `  ${p.name}: ${t},`;
		});
		const body = fields.length ? `{\n${fields.join('\n')}\n}` : '{}';
		return `export const ${label}Schema = z.object(${body});\nexport type ${label} = z.infer<typeof ${label}Schema>;\n`;
	};
	return ["import { z } from 'zod';\n", schema(`${name}Request`, extractProps(s.request)), schema(`${name}Response`, extractProps(s.response))].join('\n');
}

// ══════════════════════════════════════════════════════════════════════════
// Rust
// ══════════════════════════════════════════════════════════════════════════

function rustType(t: string): string {
	const map: Record<string, string> = {
		string: 'String', number: 'f64', integer: 'i64',
		boolean: 'bool', array: 'Vec<serde_json::Value>', object: 'serde_json::Value',
	};
	return map[t] ?? 'serde_json::Value';
}

function rustNativeType(t: string): string {
	const map: Record<string, string> = {
		string: 'String', number: 'f64', integer: 'i64',
		boolean: 'bool', array: 'Vec<Box<dyn std::any::Any>>', object: 'std::collections::HashMap<String, Box<dyn std::any::Any>>',
	};
	return map[t] ?? 'String';
}

// Rust — Serde
function toRustSerde(s: CombinedSchema, name: string): string {
	const struct_ = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `#[derive(Debug, Serialize, Deserialize)]\npub struct ${label} {}\n`;
		const fields = props.map(p => {
			const t = p.required ? rustType(p.type) : `Option<${rustType(p.type)}>`;
			return `    pub ${p.name}: ${t},`;
		});
		return `#[derive(Debug, Serialize, Deserialize)]\npub struct ${label} {\n${fields.join('\n')}\n}\n`;
	};
	return ['use serde::{Deserialize, Serialize};\n', struct_(`${name}Request`, extractProps(s.request)), struct_(`${name}Response`, extractProps(s.response))].join('\n');
}

// Rust — Native (no external crates)
function toRustNative(s: CombinedSchema, name: string): string {
	const struct_ = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `#[derive(Debug)]\npub struct ${label} {}\n`;
		const fields = props.map(p => {
			const t = p.required ? rustNativeType(p.type) : `Option<${rustNativeType(p.type)}>`;
			return `    pub ${p.name}: ${t},`;
		});
		const newArgs = props.map(p => {
			const t = p.required ? rustNativeType(p.type) : `Option<${rustNativeType(p.type)}>`;
			return `        ${p.name}: ${t}`;
		});
		const newBody = props.map(p => `            ${p.name},`);
		return [
			`#[derive(Debug)]\npub struct ${label} {\n${fields.join('\n')}\n}\n`,
			`impl ${label} {\n    pub fn new(\n${newArgs.join(',\n')}\n    ) -> Self {\n        Self {\n${newBody.join('\n')}\n        }\n    }\n}\n`,
		].join('');
	};
	return [struct_(`${name}Request`, extractProps(s.request)), struct_(`${name}Response`, extractProps(s.response))].join('\n');
}

// ══════════════════════════════════════════════════════════════════════════
// PHP
// ══════════════════════════════════════════════════════════════════════════

function phpType(t: string): string {
	const map: Record<string, string> = {
		string: 'string', number: 'float', integer: 'int',
		boolean: 'bool', array: 'array', object: 'array',
	};
	return map[t] ?? 'mixed';
}

// PHP 8.2+ — readonly class
function toPhp82(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const params = props.map(p => {
			const t   = phpType(p.type);
			const opt = p.required ? '' : '?';
			const def = p.required ? '' : ' = null';
			return `        public ${opt}${t} $${toCamel(p.name)}${def},`;
		});
		const body = params.length ? `\n${params.join('\n')}\n    ` : '';
		return `readonly class ${label}\n{\n    public function __construct(${body}){}\n}\n`;
	};
	return ['<?php\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}

// PHP 8.1+ — readonly properties
function toPhp81(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const params = props.map(p => {
			const t   = phpType(p.type);
			const opt = p.required ? '' : '?';
			const def = p.required ? '' : ' = null';
			return `        public readonly ${opt}${t} $${toCamel(p.name)}${def},`;
		});
		const body = params.length ? `\n${params.join('\n')}\n    ` : '';
		return `class ${label}\n{\n    public function __construct(${body}){}\n}\n`;
	};
	return ['<?php\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}

// PHP 8.0+ — constructor promotion
function toPhp80(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const params = props.map(p => {
			const t   = phpType(p.type);
			const opt = p.required ? '' : '?';
			const def = p.required ? '' : ' = null';
			return `        public ${opt}${t} $${toCamel(p.name)}${def},`;
		});
		const body = params.length ? `\n${params.join('\n')}\n    ` : '';
		return `class ${label}\n{\n    public function __construct(${body}){}\n}\n`;
	};
	return ['<?php\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}

// PHP 7.4+ — typed properties
function toPhp74(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const fields = props.map(p => {
			const t   = phpType(p.type);
			const opt = p.required ? '' : '?';
			return `    public ${opt}${t} $${toCamel(p.name)};`;
		});
		const ctorArgs = props.map(p => {
			const t = phpType(p.type); const opt = p.required ? '' : '?';
			const def = p.required ? '' : ' = null';
			return `${opt}${t} $${toCamel(p.name)}${def}`;
		});
		const assigns = props.map(p => `        $this->${toCamel(p.name)} = $${toCamel(p.name)};`);
		return [
			`class ${label}\n{`,
			fields.join('\n'),
			`\n    public function __construct(${ctorArgs.join(', ')})\n    {\n${assigns.join('\n')}\n    }`,
			'}\n',
		].join('\n');
	};
	return ['<?php\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}

// PHP 5.6+ — docblocks, no type hints
function toPhp56(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const docProps = props.map(p => ` * @property ${phpType(p.type)}${p.required ? '' : '|null'} $${toCamel(p.name)}`);
		const fields   = props.map(p => `    /** @var ${phpType(p.type)}${p.required ? '' : '|null'} */\n    public $${toCamel(p.name)};`);
		const ctorArgs = props.map(p => `$${toCamel(p.name)}${p.required ? '' : ' = null'}`);
		const assigns  = props.map(p => `        $this->${toCamel(p.name)} = $${toCamel(p.name)};`);
		const doc = docProps.length ? `/**\n${docProps.join('\n')}\n */\n` : '';
		return [
			`${doc}class ${label}\n{`,
			fields.join('\n'),
			`\n    public function __construct(${ctorArgs.join(', ')})\n    {\n${assigns.join('\n')}\n    }`,
			'}\n',
		].join('\n');
	};
	return ['<?php\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}

// ══════════════════════════════════════════════════════════════════════════
// Java
// ══════════════════════════════════════════════════════════════════════════

function javaType(t: string): string {
	const map: Record<string, string> = {
		string: 'String', number: 'Double', integer: 'Integer',
		boolean: 'Boolean', array: 'List<Object>', object: 'Map<String, Object>',
	};
	return map[t] ?? 'Object';
}

// Java 14+ — Records
function toJava14(s: CombinedSchema, name: string): string {
	const record = (label: string, props: SchemaProp[]) => {
		const components = props.map(p => `    ${javaType(p.type)} ${toCamel(p.name)}`);
		const body = components.length ? `\n${components.join(',\n')}\n` : '';
		return `public record ${label}(${body}) {}\n`;
	};
	return [
		'import java.util.*;\n',
		record(`${name}Request`, extractProps(s.request)),
		record(`${name}Response`, extractProps(s.response)),
	].join('\n');
}

// Java 8+ — POJO with getters/setters
function toJava8(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const fields   = props.map(p => `    private ${javaType(p.type)} ${toCamel(p.name)};`);
		const getters  = props.map(p => {
			const n = toPascal(p.name);
			return `    public ${javaType(p.type)} get${n}() { return ${toCamel(p.name)}; }`;
		});
		const setters  = props.map(p => {
			const n = toPascal(p.name);
			return `    public void set${n}(${javaType(p.type)} ${toCamel(p.name)}) { this.${toCamel(p.name)} = ${toCamel(p.name)}; }`;
		});
		return `public class ${label} {\n${fields.join('\n')}\n\n${getters.join('\n')}\n\n${setters.join('\n')}\n}\n`;
	};
	return [
		'import java.util.*;\n',
		cls(`${name}Request`, extractProps(s.request)),
		cls(`${name}Response`, extractProps(s.response)),
	].join('\n');
}

// Java 8+ with Lombok
function toJava8Lombok(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const fields = props.map(p => `    private ${javaType(p.type)} ${toCamel(p.name)};`);
		return `@Data\n@Builder\n@NoArgsConstructor\n@AllArgsConstructor\npublic class ${label} {\n${fields.join('\n')}\n}\n`;
	};
	return [
		'import lombok.*;',
		'import java.util.*;\n',
		cls(`${name}Request`, extractProps(s.request)),
		cls(`${name}Response`, extractProps(s.response)),
	].join('\n');
}

// ══════════════════════════════════════════════════════════════════════════
// Python
// ══════════════════════════════════════════════════════════════════════════

function pyType36(t: string): string {
	const map: Record<string, string> = {
		string: 'str', number: 'float', integer: 'int',
		boolean: 'bool', array: 'List[Any]', object: 'Dict[str, Any]',
	};
	return map[t] ?? 'Any';
}

function pyType39(t: string): string {
	const map: Record<string, string> = {
		string: 'str', number: 'float', integer: 'int',
		boolean: 'bool', array: 'list[Any]', object: 'dict[str, Any]',
	};
	return map[t] ?? 'Any';
}

// Python 3.10+ — union syntax (str | None), lowercase generics
function toPython310(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `@dataclass\nclass ${label}:\n    pass\n`;
		const fields = props.map(p => {
			const t = pyType39(p.type);
			return p.required
				? `    ${p.name}: ${t}`
				: `    ${p.name}: ${t} | None = None`;
		});
		return `@dataclass\nclass ${label}:\n${fields.join('\n')}\n`;
	};
	return [
		'from dataclasses import dataclass\n',
		cls(`${name}Request`, extractProps(s.request)),
		cls(`${name}Response`, extractProps(s.response)),
	].join('\n');
}

// Python 3.9+ — Optional, lowercase generics
function toPython39(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `@dataclass\nclass ${label}:\n    pass\n`;
		const fields = props.map(p => {
			const t = pyType39(p.type);
			return p.required
				? `    ${p.name}: ${t}`
				: `    ${p.name}: Optional[${t}] = None`;
		});
		return `@dataclass\nclass ${label}:\n${fields.join('\n')}\n`;
	};
	return [
		'from dataclasses import dataclass',
		'from typing import Optional, Any\n',
		cls(`${name}Request`, extractProps(s.request)),
		cls(`${name}Response`, extractProps(s.response)),
	].join('\n');
}

// Python 3.6+ — Optional, uppercase generics (typing module)
function toPython36(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `@dataclass\nclass ${label}:\n    pass\n`;
		const fields = props.map(p => {
			const t = pyType36(p.type);
			return p.required
				? `    ${p.name}: ${t}`
				: `    ${p.name}: Optional[${t}] = None`;
		});
		return `@dataclass\nclass ${label}:\n${fields.join('\n')}\n`;
	};
	return [
		'from dataclasses import dataclass',
		'from typing import Optional, Any, List, Dict\n',
		cls(`${name}Request`, extractProps(s.request)),
		cls(`${name}Response`, extractProps(s.response)),
	].join('\n');
}

// ══════════════════════════════════════════════════════════════════════════
// Kotlin
// ══════════════════════════════════════════════════════════════════════════

function ktType(t: string, required: boolean): string {
	const map: Record<string, string> = {
		string: 'String', number: 'Double', integer: 'Int',
		boolean: 'Boolean', array: 'List<Any>', object: 'Map<String, Any>',
	};
	const base = map[t] ?? 'Any';
	return required ? base : `${base}?`;
}

// Kotlin — Standard data class
function toKotlinStandard(s: CombinedSchema, name: string): string {
	const data = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `data class ${label}()\n`;
		const params = props.map(p => `    val ${toCamel(p.name)}: ${ktType(p.type, p.required)}${p.required ? '' : ' = null'}`);
		return `data class ${label}(\n${params.join(',\n')}\n)\n`;
	};
	return [data(`${name}Request`, extractProps(s.request)), data(`${name}Response`, extractProps(s.response))].join('\n');
}

// Kotlin — kotlinx.serialization
function toKotlinSerialization(s: CombinedSchema, name: string): string {
	const data = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `@Serializable\ndata class ${label}()\n`;
		const params = props.map(p => {
			const serialName = p.name !== toCamel(p.name) ? `    @SerialName("${p.name}")\n` : '';
			return `${serialName}    val ${toCamel(p.name)}: ${ktType(p.type, p.required)}${p.required ? '' : ' = null'}`;
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

// ══════════════════════════════════════════════════════════════════════════
// C# / Go / C++ / Ruby — single variant each
// ══════════════════════════════════════════════════════════════════════════

function csType(t: string, required: boolean): string {
	const map: Record<string, string> = {
		string: 'string?', number: 'double', integer: 'int',
		boolean: 'bool', array: 'object[]', object: 'Dictionary<string, object>',
	};
	const base = map[t] ?? 'object';
	if (!required && !base.endsWith('?')) return base + '?';
	return base;
}

function toCSharp(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const fields = props.map(p => `    public ${csType(p.type, p.required)} ${toPascal(p.name)} { get; set; }`);
		return `public class ${label}\n{\n${fields.join('\n')}\n}\n`;
	};
	return ['using System.Collections.Generic;\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}

function goType(t: string): string {
	const map: Record<string, string> = {
		string: 'string', number: 'float64', integer: 'int64',
		boolean: 'bool', array: '[]interface{}', object: 'map[string]interface{}',
	};
	return map[t] ?? 'interface{}';
}

function toGo(s: CombinedSchema, name: string): string {
	const struct_ = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `type ${label} struct{}\n`;
		const fields = props.map(p => {
			const tag = `\`json:"${p.name}${p.required ? '' : ',omitempty'}"\``;
			return `\t${toPascal(p.name)} ${goType(p.type)} ${tag}`;
		});
		return `type ${label} struct {\n${fields.join('\n')}\n}\n`;
	};
	return ['package main\n', struct_(`${name}Request`, extractProps(s.request)), struct_(`${name}Response`, extractProps(s.response))].join('\n');
}

function cppType(t: string): string {
	const map: Record<string, string> = {
		string: 'std::string', number: 'double', integer: 'int64_t',
		boolean: 'bool', array: 'nlohmann::json', object: 'nlohmann::json',
	};
	return map[t] ?? 'nlohmann::json';
}

function toCpp(s: CombinedSchema, name: string): string {
	const struct_ = (label: string, props: SchemaProp[]) => {
		const fields = props.map(p => `    ${cppType(p.type)} ${p.name};`);
		return `struct ${label} {\n${fields.join('\n')}\n};\n`;
	};
	return ['#include <string>\n#include <nlohmann/json.hpp>\n', struct_(`${name}Request`, extractProps(s.request)), struct_(`${name}Response`, extractProps(s.response))].join('\n');
}

function toRuby(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const attrs = props.map(p => `  attr_accessor :${p.name}`);
		const init  = props.map(p => `    @${p.name} = ${p.name}`);
		const args  = props.map(p => `${p.name}: nil`).join(', ');
		return [`class ${label}`, ...attrs, `  def initialize(${args})`, ...init, '  end', 'end\n'].join('\n');
	};
	return [cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}

// ══════════════════════════════════════════════════════════════════════════
// SQL / GraphQL / OpenAPI / Postman
// ══════════════════════════════════════════════════════════════════════════

function sqlType(t: string): string {
	const map: Record<string, string> = {
		string: 'TEXT', number: 'DOUBLE PRECISION', integer: 'BIGINT',
		boolean: 'BOOLEAN', array: 'JSONB', object: 'JSONB',
	};
	return map[t] ?? 'TEXT';
}

function toSql(s: CombinedSchema, name: string): string {
	const table = (label: string, props: SchemaProp[]) => {
		const cols = [
			`  id UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
			...props.map(p => `  ${p.name} ${sqlType(p.type)}${p.required ? ' NOT NULL' : ''}`),
			`  created_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
		];
		return `CREATE TABLE ${label.toLowerCase()} (\n${cols.join(',\n')}\n);\n`;
	};
	return [table(`${name}Request`, extractProps(s.request)), table(`${name}Response`, extractProps(s.response))].join('\n');
}

function gqlType(t: string, required: boolean): string {
	const map: Record<string, string> = {
		string: 'String', number: 'Float', integer: 'Int',
		boolean: 'Boolean', array: '[JSON]', object: 'JSON',
	};
	const base = map[t] ?? 'JSON';
	return required ? `${base}!` : base;
}

function toGraphQL(s: CombinedSchema, name: string): string {
	const type_ = (label: string, props: SchemaProp[]) => {
		if (!props.length) return `type ${label}\n`;
		return `type ${label} {\n${props.map(p => `  ${p.name}: ${gqlType(p.type, p.required)}`).join('\n')}\n}\n`;
	};
	const reqProps = extractProps(s.request);
	return [
		'scalar JSON\n',
		type_(`${name}Request`, reqProps),
		type_(`${name}Response`, extractProps(s.response)),
		`input ${name}Input {\n${reqProps.map(p => `  ${p.name}: ${gqlType(p.type, p.required)}`).join('\n')}\n}\n`,
		`type Mutation {\n  ${toCamel(name)}(input: ${name}Input!): ${name}Response\n}\n`,
	].join('\n');
}

function oasType(t: string): Record<string, unknown> {
	const map: Record<string, Record<string, unknown>> = {
		string: { type: 'string' }, number: { type: 'number' }, integer: { type: 'integer' },
		boolean: { type: 'boolean' }, array: { type: 'array', items: {} }, object: { type: 'object' },
	};
	return map[t] ?? { type: 'object' };
}

function schemaToOas(schema: Record<string, unknown>): Record<string, unknown> {
	const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
	const req   = (schema.required ?? []) as string[];
	const out: Record<string, unknown> = { type: 'object', properties: {} };
	for (const [k, def] of Object.entries(props)) {
		(out.properties as Record<string, unknown>)[k] = oasType((def.type as string) ?? 'string');
	}
	if (req.length) out.required = req;
	return out;
}

function toOpenAPI(s: CombinedSchema, name: string, flowKey: string, method: 'GET' | 'POST'): string {
	const reqProps   = (s.request.properties ?? {}) as Record<string, Record<string, unknown>>;
	const reqRequired = (s.request.required ?? []) as string[];
	const operation: Record<string, unknown> = {
		summary: `Trigger ${name} flow`,
		responses: { '200': { description: 'Success', content: { 'application/json': { schema: schemaToOas(s.response) } } } },
	};
	if (method === 'GET') {
		operation['parameters'] = Object.entries(reqProps).map(([pName, def]) => ({
			name: pName, in: 'query', required: reqRequired.includes(pName),
			schema: oasType((def.type as string) ?? 'string'),
		}));
	} else {
		operation['requestBody'] = { required: true, content: { 'application/json': { schema: schemaToOas(s.request) } } };
	}
	return JSON.stringify({ openapi: '3.1.0', info: { title: name, version: '1.0.0' }, paths: { [`/flows/trigger/${flowKey}`]: { [method.toLowerCase()]: operation } } }, null, 2);
}

function toPostman(s: CombinedSchema, name: string, flowKey: string, method: 'GET' | 'POST'): string {
	const baseUrl  = `{{directus_url}}/flows/trigger/${flowKey}`;
	const reqProps = (s.request.properties ?? {}) as Record<string, Record<string, unknown>>;
	const request: Record<string, unknown> = {
		method,
		header: method === 'POST' ? [{ key: 'Content-Type', value: 'application/json' }] : [],
		url: method === 'GET'
			? { raw: baseUrl, host: ['{{directus_url}}'], path: ['flows', 'trigger', flowKey], query: Object.keys(reqProps).map(k => ({ key: k, value: '' })) }
			: { raw: baseUrl, host: ['{{directus_url}}'], path: ['flows', 'trigger', flowKey] },
	};
	if (method === 'POST') {
		const samples: Record<string, unknown> = { string: 'string', number: 0, integer: 0, boolean: true, array: [], object: {} };
		const body = Object.fromEntries(Object.entries(reqProps).map(([k, def]) => [k, samples[(def.type as string) ?? 'string'] ?? null]));
		request['body'] = { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
	}
	return JSON.stringify({
		info: { name, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
		item: [{ name: `${method} ${name}`, request }],
		variable: [{ key: 'directus_url', value: 'http://localhost:8055' }],
	}, null, 2);
}
