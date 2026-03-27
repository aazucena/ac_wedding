import type { Router, Request, Response } from 'express';
import { Validator } from 'jsonschema';
import { TABLE, type EndpointRow, parseJson } from './types';

const validator = new Validator();

/**
 * Registers ALL /:version/:key — proxy to the matching Directus webhook flow.
 *
 * Must be registered LAST so specific routes (/docs/*, /openapi.json, etc.)
 * take priority over this catch-all.
 *
 * Flow:
 *  1. Look up the flow record by key (must be enabled).
 *  2. Validate HTTP method matches.
 *  3. Validate request body against request_schema (if defined).
 *  4. Forward to Directus /flows/trigger/:flowId via internal HTTP.
 *  5. Return the flow's JSON response (or 204 if empty).
 */
export function registerProxyRoute(
	router: Router,
	ctx: { database: any; logger: any; env: any },
): void {
	router.all('/:version/:key', async (req: Request, res: Response) => {
		// Normalise: accept kebab-case or snake_case, store is always snake_case
		const rawKey     = req.params['key']     ?? '';
		const rawVersion = req.params['version'] ?? '';
		const key        = rawKey.toLowerCase().replace(/-/g, '_');
		const version    = rawVersion.toLowerCase();

		// Reject anything that isn't a valid slug after normalisation
		if (!/^[a-z0-9_]+$/.test(key)) {
			return res.status(400).json({ error: `Invalid endpoint key "${rawKey}".` });
		}

		// 1. Look up the endpoint record
		const row: EndpointRow | undefined = await ctx.database(TABLE)
			.where({ key })
			.first();

		if (!row) {
			return res.status(404).json({ error: `No endpoint registered for key "${key}".` });
		}

		if (!row.enabled) {
			return res.status(503).json({ error: `Endpoint "${key}" is disabled.` });
		}

		// Version check
		if (version !== (row.version ?? 'v1').toLowerCase()) {
			return res.status(404).json({ error: `Endpoint "${key}" is not available on ${version}.` });
		}

		// Auth check
		if (row.auth_required) {
			const auth = req.headers['authorization'];
			if (!auth) {
				return res.status(401).json({ error: `Endpoint "${key}" requires authentication.` });
			}
		}

		// 2. Method check
		const expectedMethod = (row.method ?? 'GET').toUpperCase();
		const actualMethod   = req.method.toUpperCase();

		if (actualMethod !== expectedMethod) {
			res.set('Allow', expectedMethod);
			return res.status(405).json({
				error: `Method ${actualMethod} not allowed. Expected ${expectedMethod}.`,
			});
		}

		// 3. Schema validation (request body only, for mutating methods)
		const requestSchema = parseJson(row.request_schema);
		if (requestSchema && ['POST', 'PUT', 'PATCH'].includes(actualMethod)) {
			const body   = req.body ?? {};
			const result = validator.validate(body, requestSchema as object);
			if (!result.valid) {
				return res.status(422).json({
					error:  'Request body failed schema validation.',
					errors: result.errors.map(e => e.stack),
				});
			}
		}

		// 4. Forward to Directus webhook flow
		const env = ctx.env;
		const directusUrl = ((env['PUBLIC_URL'] as string | undefined)
			?? `http://localhost:${(env['PORT'] as string | undefined) ?? '8055'}`)
			.replace(/\/$/, '');

		const triggerUrl = `${directusUrl}/flows/trigger/${row.flow}`;

		try {
			const isBodyMethod = ['POST', 'PUT', 'PATCH'].includes(actualMethod);

			const headers: Record<string, string> = { 'Content-Type': 'application/json' };
			if (req.headers['authorization']) {
				headers['Authorization'] = req.headers['authorization'] as string;
			}

			const upstreamRes = await fetch(triggerUrl, {
				method: actualMethod,
				headers,
				...(isBodyMethod ? { body: JSON.stringify(req.body ?? {}) } : {}),
			});

			// 5. Return flow response
			if (row.deprecated) res.set('Deprecation', 'true');

			if (upstreamRes.status === 204 || upstreamRes.headers.get('content-length') === '0') {
				return res.status(204).send();
			}

			const contentType = upstreamRes.headers.get('content-type') ?? '';
			if (contentType.includes('application/json')) {
				const data = await upstreamRes.json();
				return res.status(upstreamRes.status).json(data);
			}

			const text = await upstreamRes.text();
			return res.status(upstreamRes.status).send(text);

		} catch (err) {
			ctx.logger.error(`[api-gateway] Failed to proxy flow "${key}" (${row.flow}):`, err);
			return res.status(502).json({ error: 'Failed to reach upstream flow.' });
		}
	});
}
