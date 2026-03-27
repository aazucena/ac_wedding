import type { Router, Request, Response } from 'express';
import { generateExport, fieldsToJsonSchema } from '../../shared/schema-export';
import type { LangKey, SchemaField } from '../../shared/schema-export';
import { TABLE, LANG_EXT, type EndpointRow, parseFieldArray } from './types';

/**
 * Registers GET /v1/export/:key — returns the generated schema export for a flow.
 *
 * Query params:
 *   lang     — language/format  (e.g. "typescript", "json", "openapi")  default: "typescript"
 *   format   — variant          (e.g. "interface", "type", "zod")        default: "interface"
 *   download — if present, sets Content-Disposition to attachment
 */
export function registerExportRoute(
	router: Router,
	ctx: { database: any; logger: any },
): void {
	router.get('/:version/export/:key', async (req: Request, res: Response): Promise<void> => {
		const rawKey = req.params['key'] ?? '';
		const rawVersion = req.params['version'] ?? '';
		const key    = rawKey.toLowerCase().replace(/-/g, '_');
		const version    = rawVersion.toLowerCase();

		if (!/^[a-z0-9_]+$/.test(key)) {
			res.status(400).json({ error: `Invalid endpoint key "${rawKey}".` });
			return;
		}

		const row: EndpointRow | undefined = await ctx.database(TABLE)
			.where({ key })
			.first('key', 'method', 'request_schema', 'response_schema', 'enabled');

		if (!row) {
			res.status(404).json({ error: `No endpoint registered for key "${key}".` });
			return;
		}

		if (!row.enabled) {
			res.status(503).json({ error: `Endpoint "${key}" is disabled.` });
			return;
		}

		// Version check
		if (version !== (row.version ?? 'v1').toLowerCase()) {
			res.status(404).json({ error: `Endpoint "${key}" is not available on ${version}.` });
      return
		}

		const lang     = ((req.query.lang     as string | undefined) ?? 'typescript').toLowerCase();
		const format   = ((req.query.format   as string | undefined) ?? 'interface').toLowerCase();
		const download =   req.query.download !== undefined;
		const langKey: LangKey = (format ? `${lang}_${format}` : lang) as LangKey;

		try {
			const requestFields  = parseFieldArray(row.request_schema) as SchemaField[];
			const responseFields = parseFieldArray(row.response_schema) as SchemaField[];

			const output = generateExport(
				{
					request:  fieldsToJsonSchema(requestFields),
					response: fieldsToJsonSchema(responseFields),
				},
				key,
				langKey,
				(row.method ?? 'GET').toUpperCase() as 'GET' | 'POST',
			);

			const isJson = ['json', 'openapi', 'postman'].includes(lang);
			const ext    = LANG_EXT[lang] ?? 'txt';

			res.status(200).set(
				'Content-Type',
				isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
			);

			if (download) {
				res.set('Content-Disposition', `attachment; filename="${key}.${ext}"`);
			}

			res.send(output);
		} catch (err) {
			ctx.logger.error(`[api-gateway] Export failed for "${key}":`, err);
			res.status(500).json({ error: 'Failed to generate export.' });
		}
	});
}
