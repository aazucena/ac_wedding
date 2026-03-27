import { defineEndpoint } from '@directus/extensions-sdk';
import type { Request, Response } from 'express';
import { TABLE, type EndpointRow, parseJson } from './lib/types';
import { registerSwaggerRoutes } from './lib/swagger';
import { registerOpenApiRoute }  from './lib/openapi';
import { registerProxyRoute }    from './lib/proxy';
import { registerExportRoute }   from './lib/export';

export default defineEndpoint({
	id: 'api',
	handler: (router, ctx) => {
		const { database, logger, env } = ctx as any;
		const apiCtx = { database, logger, env };

		// ── GET /keys ─────────────────────────────────────────────────────
		router.get('/keys', async (_req: Request, res: Response) => {
			try {
				const rows: EndpointRow[] = await database(TABLE)
					.where({ enabled: true })
					.select('key', 'flow', 'method', 'request_schema', 'response_schema');

				const map = Object.fromEntries(
					rows.map(row => [
						row.key,
						{
							id:              row.flow,
							method:          row.method,
							request_schema:  parseJson(row.request_schema),
							response_schema: parseJson(row.response_schema),
						},
					]),
				);

				res.json(map);
			} catch (err) {
				logger.error('[api-gateway] /keys error:', err);
				res.status(500).json({ error: 'Failed to retrieve flow keys.' });
			}
		});

		// Specific routes registered before the catch-all proxy
		registerSwaggerRoutes(router, { logger });
		registerOpenApiRoute(router, apiCtx);
		registerExportRoute(router, apiCtx);

		// Catch-all must be last — matches /:version/:key
		registerProxyRoute(router, apiCtx);
	},
});
