import type { InjectionKey, Ref, ComputedRef } from 'vue';
import type { SchemaField, SubField, FieldType, LangKey } from '../shared/schema-export';

export type { SchemaField, SubField, LangKey };

// ── Table ──────────────────────────────────────────────────────────────────
export const TABLE = 'api_endpoints';

// ── Domain types ───────────────────────────────────────────────────────────
export interface FlowRow {
	id:              string;
	flow:            string;
	name:            string;
	key:             string;
	method:          'GET' | 'POST';
	enabled:         boolean;
	deprecated:      boolean;
	auth_required:   boolean;
	version:         string;
	description:     string;
	tags:            string[];
	request_fields:  SchemaField[];
	response_fields: SchemaField[];
}

export type TabKey = 'request' | 'response';

export interface SavedSnapshot {
	key:           string;
	enabled:       boolean;
	deprecated:    boolean;
	auth_required: boolean;
	version:       string;
	description:   string;
	tags:          string[];
}

// ── Constants ──────────────────────────────────────────────────────────────
export const FIELD_TYPES: FieldType[] = ['string', 'number', 'integer', 'boolean', 'array', 'object'];
export const PRIMITIVE_FIELD_TYPES: FieldType[] = ['string', 'number', 'integer', 'boolean'];

export const FORMAT_OPTIONS = [
	{ text: 'TypeScript', value: 'typescript' },
	{ text: 'Rust',       value: 'rust'       },
	{ text: 'PHP',        value: 'php'        },
	{ text: 'C#',         value: 'csharp'     },
	{ text: 'Java',       value: 'java'       },
	{ text: 'Python',     value: 'python'     },
	{ text: 'Go',         value: 'go'         },
	{ text: 'Kotlin',     value: 'kotlin'     },
	{ text: 'C++',        value: 'cpp'        },
	{ text: 'Ruby',       value: 'ruby'       },
	{ text: 'SQL',        value: 'sql'        },
	{ text: 'GraphQL',    value: 'graphql'    },
	{ text: 'OpenAPI',    value: 'openapi'    },
	{ text: 'Postman',    value: 'postman'    },
] as const;

export const LANG_VARIANTS: Record<string, Array<{ text: string; value: string }>> = {
	typescript: [
		{ value: 'interface',     text: 'Interface'             },
		{ value: 'type',          text: 'Type'                  },
		{ value: 'zod',           text: 'Zod'                   },
	],
	rust: [
		{ value: 'serde',         text: 'Serde'                 },
		{ value: 'native',        text: 'Native'                },
	],
	php: [
		{ value: '82',            text: 'PHP 8.2+'              },
		{ value: '81',            text: 'PHP 8.1+'              },
		{ value: '80',            text: 'PHP 8.0+'              },
		{ value: '74',            text: 'PHP 7.4+'              },
		{ value: '56',            text: 'PHP 5.6+'              },
	],
	java: [
		{ value: '14',            text: 'Java 14+'              },
		{ value: '8',             text: 'Java 8+'               },
		{ value: '8_lombok',      text: 'Java 8+ (Lombok)'      },
	],
	python: [
		{ value: '310',           text: 'Python 3.10+'          },
		{ value: '39',            text: 'Python 3.9+'           },
		{ value: '36',            text: 'Python 3.6+'           },
	],
	kotlin: [
		{ value: 'standard',      text: 'Standard'              },
		{ value: 'serialization', text: 'kotlinx.serialization' },
	],
};

// ── Provide / inject context ───────────────────────────────────────────────
export interface GatewayContext {
	// flows
	flows:    Ref<FlowRow[]>;
	selected: Ref<FlowRow | null>;
	// metadata (key + save + tags)
	keyDraft:      Ref<string>;
	keyError:      Ref<string | null>;
	keyInputRef:   Ref<any>;
	isDirty:       Ref<boolean>;
	saving:        Ref<boolean>;
	savedSnapshot: Ref<SavedSnapshot>;
	setDirty:      () => void;
	saveAll:       () => Promise<void>;
	discardChanges: () => void;
	normalizeKey:  () => void;
	toggleEnabled: (v: boolean) => void;
	addTag:        (tag: string) => void;
	removeTag:     (tag: string) => void;
	onTagKeydown:  (e: KeyboardEvent) => void;
	onTagBlur:     (e: FocusEvent) => void;
	// fields
	activeTab:          Ref<TabKey>;
	drawerIndex:        Ref<number | null>;
	drawerOpen:         ComputedRef<boolean>;
	drawerEdits:        SchemaField;
	isNewField:         Ref<boolean>;
	activeFields:       ComputedRef<SchemaField[]>;
	activeFieldsSorted: { value: SchemaField[] };
	openField:          (i: number) => void;
	addField:           () => void;
	closeDrawer:        () => void;
	saveDrawer:         () => Promise<void>;
	removeField:        (i: number) => void;
	saveActiveFields:   () => Promise<void>;
	// export
	exportFormat:    Ref<string>;
	exportVariant:   Ref<string>;
	currentVariants: ComputedRef<Array<{ text: string; value: string }>>;
	exportOutput:    ComputedRef<string>;
	copied:          Ref<boolean>;
	copyExport:      () => Promise<void>;
	// constants
	FORMAT_OPTIONS:          typeof FORMAT_OPTIONS;
	FIELD_TYPE_OPTIONS:      Array<{ text: string; value: FieldType }>;
	PRIMITIVE_TYPE_OPTIONS:  Array<{ text: string; value: FieldType }>;
}

export const GatewayContextKey: InjectionKey<GatewayContext> = Symbol('GatewayContext');
