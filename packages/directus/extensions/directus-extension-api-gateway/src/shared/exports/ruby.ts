import type { CombinedSchema } from './types';
import { extractProps } from './schema';

export function toRuby(s: CombinedSchema, name: string): string {
	const cls = (label: string, props: ReturnType<typeof extractProps>) => {
		const attrs = props.map(p => `  attr_accessor :${p.name}`);
		const init  = props.map(p => `    @${p.name} = ${p.name}`);
		const args  = props.map(p => `${p.name}: nil`).join(', ');
		return [`class ${label}`, ...attrs, `  def initialize(${args})`, ...init, '  end', 'end\n'].join('\n');
	};
	return [cls(`${name}Request`, extractProps(s.request)), cls(`${name}Response`, extractProps(s.response))].join('\n');
}
