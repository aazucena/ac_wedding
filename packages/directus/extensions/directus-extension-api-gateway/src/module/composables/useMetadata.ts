import { ref, computed, watch, nextTick } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { TABLE } from '../types';
import type { FlowRow, SavedSnapshot } from '../types';
import { toSnake, toSnakeTyping } from '../utils';

export interface UseMetadataReturn {
	// key
	keyDraft:    Ref<string>;
	keyError:    Ref<string | null>;
	keyInputRef: Ref<any>;
	savedKey:    ComputedRef<string>;
	normalizeKey: () => void;
	validateKey:  (key: string) => string | null;
	// dirty / save
	isDirty:       Ref<boolean>;
	saving:        Ref<boolean>;
	savedSnapshot: Ref<SavedSnapshot>;
	setDirty:      () => void;
	saveAll:       () => Promise<void>;
	discardChanges: () => void;
	// tags + toggles
	toggleEnabled: (v: boolean) => void;
	addTag:        (tag: string) => void;
	removeTag:     (tag: string) => void;
	onTagKeydown:  (e: KeyboardEvent) => void;
	onTagBlur:     (e: FocusEvent) => void;
	// reset helper called by module.vue on flow select
	resetForFlow:  (row: FlowRow) => void;
}

export function useMetadata(
	selected: Ref<FlowRow | null>,
	flows:    Ref<FlowRow[]>,
	api:      ReturnType<typeof useApi>,
): UseMetadataReturn {

	// ── Key ──────────────────────────────────────────────────────────────
	const keyDraft    = ref('');
	const keyError    = ref<string | null>(null);
	const keyInputRef = ref<any>(null);

	const savedSnapshot = ref<SavedSnapshot>({
		key: '', enabled: true, deprecated: false,
		auth_required: false, version: 'v1', description: '', tags: [],
	});

	const savedKey = computed(() => savedSnapshot.value.key);

	// ── Dirty ─────────────────────────────────────────────────────────────
	const isDirty = ref(false);
	const saving  = ref(false);

	function setDirty() { isDirty.value = true; }

	// ── Snake-case enforcement watcher ────────────────────────────────────
	watch(keyDraft, (val) => {
		const normalized = toSnakeTyping(val);
		if (normalized !== val) {
			keyDraft.value = normalized;
			nextTick(() => {
				const native: HTMLInputElement | null =
					keyInputRef.value?.$el?.querySelector('input') ?? null;
				if (native && native.value !== normalized) {
					const pos    = native.selectionStart ?? normalized.length;
					native.value = normalized;
					const newPos = Math.max(0, Math.min(pos - (val.length - normalized.length), normalized.length));
					native.setSelectionRange(newPos, newPos);
				}
			});
		}
		if (selected.value) isDirty.value = toSnake(normalized) !== savedKey.value;
	}, { flush: 'sync' });

	// ── Key helpers ───────────────────────────────────────────────────────
	function validateKey(key: string): string | null {
		if (!key) return 'Key is required.';
		const duplicate = flows.value.find(f => f.key === key && f.id !== selected.value?.id);
		if (duplicate) return `Key "${key}" is already used by "${duplicate.name}".`;
		return null;
	}

	function normalizeKey() {
		if (!selected.value) return;
		const normalized   = toSnake(keyDraft.value) || selected.value.key;
		keyDraft.value     = normalized;
		keyError.value     = validateKey(normalized);
		if (normalized !== selected.value.key) isDirty.value = true;
	}

	// ── Save / discard ────────────────────────────────────────────────────
	async function saveAll(): Promise<void> {
		if (!selected.value || saving.value) return;
		const newKey = toSnake(keyDraft.value) || selected.value.key;
		keyError.value = validateKey(newKey);
		if (keyError.value) return;

		saving.value = true;
		try {
			await api.patch(`/items/${TABLE}/${selected.value.id}`, {
				key:           newKey,
				enabled:       selected.value.enabled,
				deprecated:    selected.value.deprecated,
				auth_required: selected.value.auth_required,
				version:       selected.value.version || 'v1',
				description:   selected.value.description || null,
				tags:          JSON.stringify(selected.value.tags),
			});

			selected.value.key = newKey;
			keyDraft.value     = newKey;
			savedSnapshot.value = {
				key:           newKey,
				enabled:       selected.value.enabled,
				deprecated:    selected.value.deprecated,
				auth_required: selected.value.auth_required,
				version:       selected.value.version || 'v1',
				description:   selected.value.description,
				tags:          [...selected.value.tags],
			};
			isDirty.value = false;
		} finally {
			saving.value = false;
		}
	}

	function discardChanges() {
		if (!selected.value) return;
		const s = savedSnapshot.value;
		selected.value.enabled       = s.enabled;
		selected.value.deprecated    = s.deprecated;
		selected.value.auth_required = s.auth_required;
		selected.value.version       = s.version;
		selected.value.description   = s.description;
		selected.value.tags          = [...s.tags];
		keyDraft.value               = s.key;
		keyError.value               = null;
		isDirty.value                = false;
	}

	// ── Tags ──────────────────────────────────────────────────────────────
	function addTag(tag: string) {
		if (!selected.value) return;
		const trimmed = tag.trim().toLowerCase();
		if (!trimmed || selected.value.tags.includes(trimmed)) return;
		selected.value.tags = [...selected.value.tags, trimmed];
		setDirty();
	}

	function removeTag(tag: string) {
		if (!selected.value) return;
		selected.value.tags = selected.value.tags.filter(t => t !== tag);
		setDirty();
	}

	function onTagKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault();
			const input = event.target as HTMLInputElement;
			addTag(input.value);
			input.value = '';
		}
	}

	function onTagBlur(event: FocusEvent) {
		const input = event.target as HTMLInputElement;
		if (input.value.trim()) {
			addTag(input.value);
			input.value = '';
		}
	}

	function toggleEnabled(value: boolean) {
		if (!selected.value) return;
		selected.value.enabled = value;
		setDirty();
	}

	// ── Reset on flow select ──────────────────────────────────────────────
	function resetForFlow(row: FlowRow) {
		keyDraft.value = row.key;
		savedSnapshot.value = {
			key:           row.key,
			enabled:       row.enabled,
			deprecated:    row.deprecated,
			auth_required: row.auth_required,
			version:       row.version,
			description:   row.description,
			tags:          [...row.tags],
		};
		isDirty.value  = false;
		keyError.value = null;
	}

	return {
		keyDraft, keyError, keyInputRef, savedKey,
		normalizeKey, validateKey,
		isDirty, saving, savedSnapshot,
		setDirty, saveAll, discardChanges,
		toggleEnabled, addTag, removeTag, onTagKeydown, onTagBlur,
		resetForFlow,
	};
}
