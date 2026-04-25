export type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

export interface SubField {
	name:         string;
	type:         'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
	itemType?:    FieldType;
	valueType?:   FieldType;
	required?:    boolean;
	nullable?:    boolean;
	description?: string;
	example?:     string;
}

export interface SchemaField {
	name:         string;
	type:         FieldType;
	itemType?:    FieldType;   // simple typed array  — e.g. string[]
	valueType?:   FieldType;   // simple record object — e.g. Record<string, number>
	properties?:  SubField[];  // named sub-props for object fields  (depth 1)
	itemSchema?:  SubField[];  // typed object-item schema for array fields (depth 1)
	required:     boolean;
	nullable?:    boolean;
	description?: string;
	example?:     string;
}

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
