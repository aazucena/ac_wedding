import type { CombinedSchema } from './types';
import type { SchemaProp } from './schema';
import { extractProps, toCamel } from './schema';

function phpType(t: string): string {
	const map: Record<string, string> = {
		string: 'string', number: 'float', integer: 'int',
		boolean: 'bool', array: 'array', object: 'array',
	};
	return map[t] ?? 'mixed';
}

export function toPhp82(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const params = props.map(p => {
			const t = phpType(p.type); const opt = p.required ? '' : '?'; const def = p.required ? '' : ' = null';
			return `        public ${opt}${t} $${toCamel(p.name)}${def},`;
		});
		const body = params.length ? `\n${params.join('\n')}\n    ` : '';
		return `readonly class ${label}\n{\n    public function __construct(${body}){}\n}\n`;
	};
	return ['<?php\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}

export function toPhp81(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const params = props.map(p => {
			const t = phpType(p.type); const opt = p.required ? '' : '?'; const def = p.required ? '' : ' = null';
			return `        public readonly ${opt}${t} $${toCamel(p.name)}${def},`;
		});
		const body = params.length ? `\n${params.join('\n')}\n    ` : '';
		return `class ${label}\n{\n    public function __construct(${body}){}\n}\n`;
	};
	return ['<?php\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}

export function toPhp80(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const params = props.map(p => {
			const t = phpType(p.type); const opt = p.required ? '' : '?'; const def = p.required ? '' : ' = null';
			return `        public ${opt}${t} $${toCamel(p.name)}${def},`;
		});
		const body = params.length ? `\n${params.join('\n')}\n    ` : '';
		return `class ${label}\n{\n    public function __construct(${body}){}\n}\n`;
	};
	return ['<?php\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}

export function toPhp74(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const fields   = props.map(p => `    public ${p.required ? '' : '?'}${phpType(p.type)} $${toCamel(p.name)};`);
		const ctorArgs = props.map(p => `${p.required ? '' : '?'}${phpType(p.type)} $${toCamel(p.name)}${p.required ? '' : ' = null'}`);
		const assigns  = props.map(p => `        $this->${toCamel(p.name)} = $${toCamel(p.name)};`);
		return [
			`class ${label}\n{`, fields.join('\n'),
			`\n    public function __construct(${ctorArgs.join(', ')})\n    {\n${assigns.join('\n')}\n    }`, '}\n',
		].join('\n');
	};
	return ['<?php\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}

export function toPhp56(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: SchemaProp[]) => {
		const docProps = props.map(p => ` * @property ${phpType(p.type)}${p.required ? '' : '|null'} $${toCamel(p.name)}`);
		const fields   = props.map(p => `    /** @var ${phpType(p.type)}${p.required ? '' : '|null'} */\n    public $${toCamel(p.name)};`);
		const ctorArgs = props.map(p => `$${toCamel(p.name)}${p.required ? '' : ' = null'}`);
		const assigns  = props.map(p => `        $this->${toCamel(p.name)} = $${toCamel(p.name)};`);
		const doc = docProps.length ? `/**\n${docProps.join('\n')}\n */\n` : '';
		return [
			`${doc}class ${label}\n{`, fields.join('\n'),
			`\n    public function __construct(${ctorArgs.join(', ')})\n    {\n${assigns.join('\n')}\n    }`, '}\n',
		].join('\n');
	};
	return ['<?php\n', cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}
