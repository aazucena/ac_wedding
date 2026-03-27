import { ref, computed, watch } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { generateExport, fieldsToJsonSchema } from '../../shared/schema-export';
import type { LangKey } from '../../shared/schema-export';
import { LANG_VARIANTS } from '../types';
import type { FlowRow } from '../types';

export interface UseExportReturn {
	exportFormat:    Ref<string>;
	exportVariant:   Ref<string>;
	currentVariants: ComputedRef<Array<{ text: string; value: string }>>;
	exportLang:      ComputedRef<LangKey | null>;
	exportOutput:    ComputedRef<string>;
	copied:          Ref<boolean>;
	copyExport:      () => Promise<void>;
	resetForFlow:    () => void;
}

export function useExport(selected: Ref<FlowRow | null>): UseExportReturn {
	const exportFormat  = ref('typescript');
	const exportVariant = ref('interface');
	const copied        = ref(false);

	const currentVariants = computed(() => LANG_VARIANTS[exportFormat.value] ?? []);

	watch(exportFormat, (fmt) => {
		const variants = LANG_VARIANTS[fmt];
		exportVariant.value = variants?.length ? (variants[0]?.value ?? '') : '';
	});

	const exportLang = computed<LangKey | null>(() => {
		if (!exportFormat.value) return null;
		if (currentVariants.value.length) return `${exportFormat.value}_${exportVariant.value}` as LangKey;
		return exportFormat.value as LangKey;
	});

	const exportOutput = computed<string>(() => {
		if (!selected.value || !exportLang.value) return '';
		return generateExport(
			{
				request:  fieldsToJsonSchema(selected.value.request_fields.filter(f => f.name.trim())),
				response: fieldsToJsonSchema(selected.value.response_fields.filter(f => f.name.trim())),
			},
			selected.value.key,
			exportLang.value,
			selected.value.method,
		);
	});

	async function copyExport(): Promise<void> {
		if (!exportOutput.value) return;
		await navigator.clipboard.writeText(exportOutput.value);
		copied.value = true;
		setTimeout(() => { copied.value = false; }, 2000);
	}

	function resetForFlow() {
		exportFormat.value  = 'typescript';
		exportVariant.value = 'interface';
	}

	return {
		exportFormat, exportVariant, currentVariants, exportLang,
		exportOutput, copied, copyExport, resetForFlow,
	};
}
