import { ref, reactive, computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { TABLE } from '../types';
import type { FlowRow, TabKey } from '../types';
import type { SchemaField } from '../../shared/schema-export';

export interface UseFieldsReturn {
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
	resetForFlow:       () => void;
}

export function useFields(
	selected: Ref<FlowRow | null>,
	api:      ReturnType<typeof useApi>,
): UseFieldsReturn {
	const activeTab   = ref<TabKey>('request');
	const drawerIndex = ref<number | null>(null);
	const isNewField  = ref(false);
	const drawerEdits = reactive<SchemaField>({
		name: '', type: 'string', required: false, nullable: false, example: '', description: '',
	});

	const drawerOpen = computed(() => drawerIndex.value !== null);

	const activeFields = computed<SchemaField[]>(() => {
		if (!selected.value) return [];
		return activeTab.value === 'request'
			? selected.value.request_fields
			: selected.value.response_fields;
	});

	// Writable computed so Draggable v-model can splice the array in-place
	const activeFieldsSorted = computed<SchemaField[]>({
		get: () => activeFields.value,
		set: (reordered) => {
			if (!selected.value) return;
			if (activeTab.value === 'request') selected.value.request_fields  = reordered;
			else                               selected.value.response_fields = reordered;
		},
	});

	function openField(index: number) {
		isNewField.value        = false;
		const f                 = activeFields.value[index];
		if (!f) return;
		drawerEdits.name        = f.name;
		drawerEdits.type        = f.type;
		drawerEdits.required    = f.required;
		drawerEdits.nullable    = f.nullable    ?? false;
		drawerEdits.example     = f.example     ?? '';
		drawerEdits.description = f.description ?? '';
		drawerIndex.value       = index;
	}

	function addField() {
		isNewField.value = true;
		activeFields.value.push({ name: '', type: 'string', required: false, nullable: false, example: '', description: '' });
		const newIndex          = activeFields.value.length - 1;
		drawerEdits.name        = '';
		drawerEdits.type        = 'string';
		drawerEdits.required    = false;
		drawerEdits.nullable    = false;
		drawerEdits.example     = '';
		drawerEdits.description = '';
		drawerIndex.value       = newIndex;
	}

	function closeDrawer() {
		if (isNewField.value && drawerIndex.value !== null) {
			activeFields.value.splice(drawerIndex.value, 1);
		}
		drawerIndex.value = null;
		isNewField.value  = false;
	}

	async function saveDrawer(): Promise<void> {
		if (drawerIndex.value === null || !drawerEdits.name?.trim()) return;
		const f = activeFields.value[drawerIndex.value];
		if (!f) return;
		f.name        = drawerEdits.name.trim();
		f.type        = drawerEdits.type;
		f.required    = drawerEdits.required;
		f.nullable    = drawerEdits.nullable    || undefined;
		f.example     = drawerEdits.example?.trim()     || undefined;
		f.description = drawerEdits.description?.trim() || undefined;
		drawerIndex.value = null;
		isNewField.value  = false;
		await saveActiveFields();
	}

	function removeField(index: number) {
		activeFields.value.splice(index, 1);
		saveActiveFields();
	}

	async function saveActiveFields(): Promise<void> {
		if (!selected.value) return;
		const valid   = activeFields.value.filter(f => f.name.trim());
		const dbField = activeTab.value === 'request' ? 'request_schema' : 'response_schema';
		await api.patch(`/items/${TABLE}/${selected.value.id}`, { [dbField]: valid });
	}

	function resetForFlow() {
		activeTab.value   = 'request';
		drawerIndex.value = null;
		isNewField.value  = false;
	}

	return {
		activeTab, drawerIndex, drawerOpen, drawerEdits, isNewField,
		activeFields, activeFieldsSorted,
		openField, addField, closeDrawer, saveDrawer, removeField, saveActiveFields,
		resetForFlow,
	};
}
