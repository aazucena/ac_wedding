import { randomUUID } from 'crypto';
import { toFlowKey, parseOptions } from './utils';

const TABLE = 'api_endpoints';

/** All columns added after the initial table creation — used for migration on existing installs. */
const MIGRATIONS: Array<[column: string, define: (t: any) => void]> = [
	['method',        t => t.string('method', 10).notNullable().defaultTo('GET')],
	['description',   t => t.text('description').nullable()],
	['auth_required', t => t.boolean('auth_required').notNullable().defaultTo(false)],
	['tags',          t => t.text('tags').nullable()],
	['deprecated',    t => t.boolean('deprecated').notNullable().defaultTo(false)],
	['version',       t => t.string('version', 20).notNullable().defaultTo('v1')],
];

/**
 * Ensures the `api_endpoints` table exists and is in sync with the current
 * set of webhook flows in `directus_flows`.
 *
 * Strategy (runs on every server start):
 *  1. Create table if missing; otherwise run any pending column migrations.
 *  2. Snapshot existing rows so user-configured data survives the truncate.
 *  3. Truncate.
 *  4. Re-insert one row per webhook flow, restoring saved data where available.
 */
export async function syncTable(database: any, logger: any): Promise<void> {
	const exists = await database.schema.hasTable(TABLE);

	if (!exists) {
		await database.schema.createTable(TABLE, (table: any) => {
			table.uuid('id').primary();
			table.uuid('flow')
				.notNullable()
				.references('id')
				.inTable('directus_flows')
				.onDelete('CASCADE');
			table.string('key', 255).notNullable().unique();
			table.string('method', 10).notNullable().defaultTo('GET');
			table.boolean('enabled').notNullable().defaultTo(true);
			table.text('request_schema').nullable();
			table.text('response_schema').nullable();
			table.text('description').nullable();
			table.boolean('auth_required').notNullable().defaultTo(false);
			table.text('tags').nullable();
			table.boolean('deprecated').notNullable().defaultTo(false);
			table.string('version', 20).notNullable().defaultTo('v1');
		});
		logger.info(`[api-gateway] Created "${TABLE}" collection`);
	} else {
		// Run pending column migrations for existing installs
		for (const [col, fn] of MIGRATIONS) {
			if (!(await database.schema.hasColumn(TABLE, col))) {
				await database.schema.alterTable(TABLE, fn);
				logger.info(`[api-gateway] Added "${col}" column to "${TABLE}"`);
			}
		}
	}

	// Snapshot existing rows keyed by flow ID so user config survives truncate
	const existing: Array<{
		flow:            string;
		enabled:         boolean;
		request_schema:  string | null;
		response_schema: string | null;
		description:     string | null;
		auth_required:   boolean;
		tags:            string | null;
		deprecated:      boolean;
		version:         string;
	}> = await database(TABLE).select(
		'flow', 'enabled', 'request_schema', 'response_schema',
		'description', 'auth_required', 'tags', 'deprecated', 'version',
	);

	const savedByFlow = new Map(existing.map(r => [r.flow, r]));

	await database(TABLE).truncate();

	const flows: Array<{ id: string; name: string; options: unknown }> =
		await database('directus_flows')
			.where({ trigger: 'webhook' })
			.select('id', 'name', 'options');

	if (flows.length === 0) {
		logger.info(`[api-gateway] No webhook flows found — "${TABLE}" is empty`);
		return;
	}

	const rows = flows.map(flow => {
		const options = parseOptions(flow.options);
		const key     = (options['key'] as string | undefined) ?? toFlowKey(flow.name ?? 'flow');
		const method  = ((options['method'] as string | undefined) ?? 'GET').toUpperCase();
		const saved   = savedByFlow.get(flow.id);

		return {
			id:              randomUUID(),
			flow:            flow.id,
			key,
			method,
			enabled:         saved?.enabled          ?? true,
			request_schema:  saved?.request_schema   ?? null,
			response_schema: saved?.response_schema  ?? null,
			description:     saved?.description      ?? null,
			auth_required:   saved?.auth_required    ?? false,
			tags:            saved?.tags             ?? null,
			deprecated:      saved?.deprecated       ?? false,
			version:         saved?.version          ?? 'v1',
		};
	});

	await database(TABLE).insert(rows);
	logger.info(`[api-gateway] Synced ${rows.length} webhook flow(s) into "${TABLE}"`);
}
