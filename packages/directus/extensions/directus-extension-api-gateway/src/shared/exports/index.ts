export type { FieldType, SubField, SchemaField, CombinedSchema, LangKey } from './types';
export { fieldsToJsonSchema } from './schema';

import type { CombinedSchema, LangKey } from './types';
import { toPascal }                      from './schema';
import { toTsInterface, toTsType, toTsZod } from './typescript';
import { toRustSerde, toRustNative }        from './rust';
import { toPhp82, toPhp81, toPhp80, toPhp74, toPhp56 } from './php';
import { toJava14, toJava8, toJava8Lombok } from './java';
import { toPython310, toPython39, toPython36 } from './python';
import { toKotlinStandard, toKotlinSerialization } from './kotlin';
import { toCSharp }    from './csharp';
import { toGo }        from './go';
import { toCpp }       from './cpp';
import { toRuby }      from './ruby';
import { toSql }       from './sql';
import { toGraphQL }   from './graphql';
import { toOpenAPI }   from './openapi';
import { toPostman }   from './postman';

export function generateExport(
	schema: CombinedSchema,
	flowKey: string,
	lang: LangKey,
	method: 'GET' | 'POST' = 'POST',
): string {
	const name = toPascal(flowKey);
	switch (lang) {
		case 'typescript_interface': return toTsInterface(schema, name);
		case 'typescript_type':      return toTsType(schema, name);
		case 'typescript_zod':       return toTsZod(schema, name);
		case 'rust_serde':           return toRustSerde(schema, name);
		case 'rust_native':          return toRustNative(schema, name);
		case 'php_82':               return toPhp82(schema, name);
		case 'php_81':               return toPhp81(schema, name);
		case 'php_80':               return toPhp80(schema, name);
		case 'php_74':               return toPhp74(schema, name);
		case 'php_56':               return toPhp56(schema, name);
		case 'java_14':              return toJava14(schema, name);
		case 'java_8':               return toJava8(schema, name);
		case 'java_8_lombok':        return toJava8Lombok(schema, name);
		case 'python_310':           return toPython310(schema, name);
		case 'python_39':            return toPython39(schema, name);
		case 'python_36':            return toPython36(schema, name);
		case 'kotlin_standard':      return toKotlinStandard(schema, name);
		case 'kotlin_serialization': return toKotlinSerialization(schema, name);
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
