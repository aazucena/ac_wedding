// Re-export barrel — implementation lives in ./exports/
export type { FieldType, SubField, SchemaField, CombinedSchema, LangKey } from './exports/types';
export { fieldsToJsonSchema, generateExport } from './exports/index';
