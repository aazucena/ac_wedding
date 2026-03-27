import { defineHook } from '@directus/extensions-sdk';
import { randomUUID } from 'crypto';
import { syncTable }  from './lib/sync';
import { toFlowKey } from './lib/utils';

const TABLE = 'api_endpoints';

export default defineHook(({ filter, action }, { database, logger }) => {

	// ── Sync collection on server start ───────────────────────────────────
	action('server.start', async () => {
		try {
			await syncTable(database, logger);
		} catch (err) {
			logger.warn('[api-gateway] Could not sync table on startup:', err);
		}
	});

	// ── Auto-generate key before a webhook flow is created ────────────────
	// Only fires on create — keys are stable once set, like Directus operation keys.
	filter('items.create', (payload: Record<string, unknown>, meta: Record<string, any>) => {
		const collection: string = meta['collection'];
		if (collection !== 'directus_flows') return payload;
		if (payload['trigger'] !== 'webhook') return payload;

		const options = (payload['options'] ?? {}) as Record<string, unknown>;
		if (options['key']) return payload; // already set — leave it alone

		return {
			...payload,
			options: {
				...options,
				key: toFlowKey((payload['name'] as string | undefined) ?? 'flow'),
			},
		};
	});

	// ── Register flow in api_endpoints after creation ─────────────────────
	action('items.create', async (meta: Record<string, any>) => {
		const payload:    Record<string, unknown> = meta['payload'];
		const flowId:     string                  = meta['key'];
		const collection: string                  = meta['collection'];
		if (collection !== 'directus_flows') return;
		if (payload['trigger'] !== 'webhook') return;

		const options = (payload['options'] ?? {}) as Record<string, unknown>;
		const flowKey = (options['key'] as string | undefined)
			?? toFlowKey((payload['name'] as string | undefined) ?? 'flow');
		const method  = ((options['method'] as string | undefined) ?? 'GET').toUpperCase();

		try {
			await database(TABLE).insert({
				id:              randomUUID(),
				flow:            flowId,
				key:             flowKey,
				method,
				enabled:         true,
				request_schema:  null,
				response_schema: null,
				description:     null,
				auth_required:   false,
				tags:            null,
				deprecated:      false,
				version:         'v1',
			});
			logger.info(`[api-gateway] Registered webhook flow "${flowKey}" (${flowId})`);
		} catch (err) {
			logger.warn(`[api-gateway] Failed to register flow ${flowId}:`, err);
		}
	});

	// ── Clean up api_endpoints when a flow is deleted ─────────────────────
	action('items.delete', async (meta: Record<string, any>) => {
		const keys:       string[] = meta['keys'];
		const collection: string   = meta['collection'];
		if (collection !== 'directus_flows') return;
		try {
			const deleted = await database(TABLE).whereIn('flow', keys).delete();
			if (deleted) logger.info(`[api-gateway] Removed ${deleted} api_endpoints record(s)`);
		} catch {
			// Table may not exist yet — ignore silently
		}
	});
});
