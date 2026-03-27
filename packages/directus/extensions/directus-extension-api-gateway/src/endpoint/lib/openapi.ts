import type { Router, Request, Response } from 'express';
import { fieldsToJsonSchema } from '../../shared/schema-export';
import type { SchemaField } from '../../shared/schema-export';
import { TABLE, type EndpointRow, parseFieldArray, parseTags } from './types';

/**
 * Registers GET /openapi.json — returns a combined OpenAPI 3.0 spec for all
 * enabled endpoints.
 */
export function registerOpenApiRoute(
	router: Router,
	ctx: { database: any; logger: any; env: any },
): void {
	router.get('/openapi.json', async (_req: Request, res: Response) => {
		try {
			const rows: EndpointRow[] = await ctx.database(TABLE)
				.where({ enabled: true })
				.select('key', 'method', 'request_schema', 'response_schema',
				        'auth_required', 'deprecated', 'version', 'description', 'tags');

			const paths: Record<string, unknown> = {};

			for (const row of rows) {
				const method     = (row.method ?? 'GET').toLowerCase();
				const pathKey    = `/api/${row.version ?? 'v1'}/${row.key}`;
				const tags       = parseTags(row.tags).length ? parseTags(row.tags) : [row.key];
				const reqFields  = parseFieldArray(row.request_schema) as SchemaField[];
				const respFields = parseFieldArray(row.response_schema) as SchemaField[];
				const reqSchema  = fieldsToJsonSchema(reqFields);
				const respSchema = fieldsToJsonSchema(respFields);

				const operation: Record<string, unknown> = {
					operationId: row.key,
					summary:     row.description ?? row.key,
					tags,
					...(row.deprecated    ? { deprecated: true }              : {}),
					...(row.auth_required ? { security: [{ bearerAuth: [] }] } : {}),
					responses: {
						'200': {
							description: 'Success',
							...(respFields.length ? {
								content: { 'application/json': { schema: respSchema } },
							} : {}),
						},
						...(row.auth_required ? { '401': { description: 'Unauthorized' } } : {}),
					},
				};

				if (['post', 'put', 'patch'].includes(method) && reqFields.length) {
					operation['requestBody'] = {
						required: true,
						content: { 'application/json': { schema: reqSchema } },
					};
				}

				paths[pathKey] = { [method]: operation };
			}

			const env = ctx.env;
			const directusUrl = ((env['PUBLIC_URL'] as string | undefined)
				?? `http://localhost:${(env['PORT'] as string | undefined) ?? '8055'}`)
				.replace(/\/$/, '');

			// ── Gateway's own routes ─────────────────────────────────────────
			const GATEWAY_TAG = 'API Gateway';

			const gatewayPaths: Record<string, unknown> = {
				'/api/keys': {
					get: {
						operationId: 'getFlowKeys',
						tags:        [GATEWAY_TAG],
						summary:     'List all enabled endpoint keys',
						description: 'Returns a map of registered flow keys to their flow ID, HTTP method, and request/response schemas.',
						responses: {
							'200': {
								description: 'OK',
								content: {
									'application/json': {
										schema: {
											type: 'object',
											additionalProperties: {
												type: 'object',
												properties: {
													id:              { type: 'string', format: 'uuid' },
													method:          { type: 'string', example: 'POST' },
													request_schema:  { type: 'object', nullable: true },
													response_schema: { type: 'object', nullable: true },
												},
											},
										},
									},
								},
							},
						},
					},
				},
				'/api/openapi.json': {
					get: {
						operationId: 'getOpenApiSpec',
						tags:        [GATEWAY_TAG],
						summary:     'OpenAPI 3.0 specification',
						description: 'Returns the live-generated OpenAPI 3.0 spec for all enabled endpoints.',
						responses: {
							'200': {
								description: 'OK',
								content: { 'application/json': { schema: { type: 'object' } } },
							},
						},
					},
				},
				'/api/docs': {
					get: {
						operationId: 'getSwaggerUi',
						tags:        [GATEWAY_TAG],
						summary:     'Swagger UI',
						description: 'Interactive documentation UI. All assets are served same-origin.',
						responses: {
							'200': {
								description: 'HTML page',
								content: { 'text/html': { schema: { type: 'string' } } },
							},
						},
					},
				},
				'/api/{version}/export/{key}': {
					get: {
						operationId: 'exportSchema',
						tags:        [GATEWAY_TAG],
						summary:     'Export endpoint schema',
						description: 'Generates typed source code or a spec fragment from the stored field definitions for a given endpoint key.',
						parameters: [
							{ name: 'version', in: 'path',  required: true,  schema: { type: 'string', example: 'v1' } },
							{ name: 'key',     in: 'path',  required: true,  schema: { type: 'string', example: 'my_endpoint' } },
							{ name: 'lang',    in: 'query', required: false, schema: { type: 'string', default: 'typescript', enum: ['typescript','javascript','python','rust','go','kotlin','java','csharp','php','cpp','ruby','graphql','openapi','postman','json','sql'] } },
							{ name: 'format',  in: 'query', required: false, schema: { type: 'string', default: 'interface', example: 'zod' } },
							{ name: 'download',in: 'query', required: false, schema: { type: 'boolean' }, description: 'If present, response is sent as a file attachment.' },
						],
						responses: {
							'200': { description: 'Generated source code or spec fragment', content: { 'text/plain': { schema: { type: 'string' } }, 'application/json': { schema: { type: 'object' } } } },
							'400': { description: 'Invalid key format' },
							'404': { description: 'Endpoint not found' },
							'503': { description: 'Endpoint disabled' },
						},
					},
				},
			};

			const spec = {
				openapi: '3.0.3',
				info: { title: 'API Gateway', version: '1.0.0' },
				servers: [{ url: directusUrl }],
				tags: [{ name: GATEWAY_TAG, description: 'API Gateway management routes' }],
				paths: { ...gatewayPaths, ...paths },
				components: {
					securitySchemes: {
						bearerAuth: { type: 'http', scheme: 'bearer' },
					},
				},
			};

			res.status(200).json(spec);
		} catch (err) {
			ctx.logger.error('[api-gateway] /openapi.json error:', err);
			res.status(500).json({ error: 'Failed to generate OpenAPI spec.' });
		}
	});
}
