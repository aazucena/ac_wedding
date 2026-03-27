import { ref } from 'vue';
import type { Ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { TABLE } from '../types';
import type { FlowRow } from '../types';
import { parseTagArray, parseFieldArray } from '../utils';

export interface UseFlowsReturn {
	loading:   Ref<boolean>;
	error:     Ref<string | null>;
	flows:     Ref<FlowRow[]>;
	selected:  Ref<FlowRow | null>;
	loadFlows: () => Promise<void>;
}

export function useFlows(api: ReturnType<typeof useApi>): UseFlowsReturn {
	const loading  = ref(true);
	const error    = ref<string | null>(null);
	const flows    = ref<FlowRow[]>([]);
	const selected = ref<FlowRow | null>(null);

	async function loadFlows(): Promise<void> {
		loading.value = true;
		error.value   = null;
		try {
			const { data } = await api.get(`/items/${TABLE}`, {
				params: {
					fields: [
						'id', 'flow', 'key', 'method', 'enabled', 'deprecated',
						'auth_required', 'version', 'description', 'tags',
						'request_schema', 'response_schema', 'flow.id', 'flow.name',
					],
					sort:  ['key'],
					limit: -1,
				},
			});

			flows.value = (data.data as any[]).map(row => ({
				id:              row.id,
				flow:            row.flow?.id   ?? row.flow,
				name:            row.flow?.name ?? row.flow,
				key:             row.key,
				method:          ((row.method ?? 'GET') as string).toUpperCase() as 'GET' | 'POST',
				enabled:         row.enabled       ?? true,
				deprecated:      row.deprecated    ?? false,
				auth_required:   row.auth_required ?? false,
				version:         row.version       ?? 'v1',
				description:     row.description   ?? '',
				tags:            parseTagArray(row.tags),
				request_fields:  parseFieldArray(row.request_schema),
				response_fields: parseFieldArray(row.response_schema),
			} satisfies FlowRow));
		} catch (e: any) {
			error.value = (e?.response?.data?.errors?.[0]?.message as string | undefined)
				?? 'Failed to load flows.';
		} finally {
			loading.value = false;
		}
	}

	return { loading, error, flows, selected, loadFlows };
}
