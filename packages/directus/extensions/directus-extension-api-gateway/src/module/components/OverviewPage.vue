<template>
	<div class="empty-state">
		<!-- No flows -->
		<template v-if="flows.length === 0">
			<v-icon name="hub" x-large />
			<div class="empty-state__title">No webhook flows registered</div>
			<p class="empty-state__body">
				Create a webhook flow in Directus and it will appear here automatically.
			</p>
			<v-button secondary @click="openFlowSettings">
				<v-icon name="open_in_new" left />
				Go to Flows
			</v-button>
		</template>

		<!-- Flows exist -->
		<template v-else>
			<div class="overview">

				<!-- Hero -->
				<div class="overview__hero">
					<div class="overview__hero-icon">
						<v-icon name="hub" large />
					</div>
					<div class="overview__hero-body">
						<h1 class="overview__hero-title">API Gateway</h1>
						<p class="overview__hero-desc">
							A managed proxy layer for your Directus webhook flows. Each webhook flow is automatically
							registered as a versioned REST endpoint at <code class="overview__inline-code">/api/:version/:key</code>.
							From here you can configure keys, define request &amp; response schemas, control access,
							and generate type-safe client exports — all without touching the underlying flow.
						</p>
						<div class="overview__hero-features">
							<span class="overview__feature-pill"><v-icon name="route" x-small left />Auto-registration</span>
							<span class="overview__feature-pill"><v-icon name="verified_user" x-small left />Auth &amp; schema validation</span>
							<span class="overview__feature-pill"><v-icon name="code" x-small left />Type exports</span>
							<span class="overview__feature-pill"><v-icon name="menu_book" x-small left />Swagger UI</span>
						</div>
					</div>
				</div>

				<!-- Stats -->
				<div class="overview__stats">
					<div class="overview-stat">
						<span class="overview-stat__value">{{ flows.length }}</span>
						<span class="overview-stat__label">Total</span>
					</div>
					<div class="overview-stat">
						<span class="overview-stat__value overview-stat__value--enabled">{{ enabledCount }}</span>
						<span class="overview-stat__label">Enabled</span>
					</div>
					<div class="overview-stat">
						<span class="overview-stat__value overview-stat__value--disabled">{{ disabledCount }}</span>
						<span class="overview-stat__label">Disabled</span>
					</div>
					<div class="overview-stat">
						<span class="overview-stat__value overview-stat__value--deprecated">{{ deprecatedCount }}</span>
						<span class="overview-stat__label">Deprecated</span>
					</div>
				</div>

				<!-- Endpoints table -->
				<div class="overview__section">
					<p class="overview__section-title">Registered Endpoints</p>
					<table class="endpoint-table">
						<thead>
							<tr>
								<th class="endpoint-table__th endpoint-table__th--status"></th>
								<th class="endpoint-table__th">Method</th>
								<th class="endpoint-table__th">Route</th>
								<th class="endpoint-table__th">Description</th>
								<th class="endpoint-table__th endpoint-table__th--version">Version</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="row in flows"
								:key="row.id"
								class="endpoint-table__row"
								@click="$emit('select', row)"
							>
								<td class="endpoint-table__td endpoint-table__td--status">
									<span
										v-tooltip="row.deprecated ? 'Deprecated' : row.enabled ? 'Enabled' : 'Disabled'"
										:class="['status-dot', row.deprecated ? 'status-dot--deprecated' : row.enabled ? 'status-dot--enabled' : 'status-dot--disabled']"
									/>
								</td>
								<td class="endpoint-table__td">
									<span class="method-chip" :class="`method-chip--${row.method.toLowerCase()}`">{{ row.method }}</span>
								</td>
								<td class="endpoint-table__td endpoint-table__td--route">/api/{{ row.version ?? 'v1' }}/{{ row.key }}</td>
								<td class="endpoint-table__td endpoint-table__td--desc">{{ row.description || '—' }}</td>
								<td class="endpoint-table__td endpoint-table__td--version">{{ row.version ?? 'v1' }}</td>
							</tr>
						</tbody>
					</table>
				</div>

				<!-- Quick links -->
				<div class="overview__section">
					<p class="overview__section-title">Quick Links</p>
					<div class="quick-links">
						<button class="quick-link" @click="openDocs">
							<v-icon name="menu_book" class="quick-link__icon" />
							<div class="quick-link__body">
								<span class="quick-link__title">API Docs</span>
								<span class="quick-link__desc">Interactive Swagger UI for all registered endpoints</span>
							</div>
							<v-icon name="open_in_new" class="quick-link__arrow" small />
						</button>
						<button class="quick-link" @click="openSpec">
							<v-icon name="data_object" class="quick-link__icon" />
							<div class="quick-link__body">
								<span class="quick-link__title">OpenAPI Spec</span>
								<span class="quick-link__desc">Raw OpenAPI 3.0 JSON — import into Postman or Insomnia</span>
							</div>
							<v-icon name="open_in_new" class="quick-link__arrow" small />
						</button>
						<button class="quick-link" @click="openFlowSettings">
							<v-icon name="alt_route" class="quick-link__icon" />
							<div class="quick-link__body">
								<span class="quick-link__title">Manage Flows</span>
								<span class="quick-link__desc">Create or edit webhook flows in Directus Settings</span>
							</div>
							<v-icon name="open_in_new" class="quick-link__arrow" small />
						</button>
					</div>
				</div>

			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FlowRow } from '../types';

const props = defineProps<{ flows: FlowRow[] }>();
defineEmits<{ select: [row: FlowRow] }>();

const enabledCount    = computed(() => props.flows.filter(f => f.enabled && !f.deprecated).length);
const disabledCount   = computed(() => props.flows.filter(f => !f.enabled).length);
const deprecatedCount = computed(() => props.flows.filter(f => f.deprecated).length);

function openDocs()         { globalThis.open('/api/docs', '_blank'); }
function openSpec()         { globalThis.open('/api/openapi.json', '_blank'); }
function openFlowSettings() { globalThis.open('/admin/settings/flows', '_blank'); }
</script>

<style scoped>
.empty-state {
	display:         flex;
	flex-direction:  column;
	align-items:     center;
	justify-content: center;
	gap:             16px;
	padding:         80px 24px;
	color:           var(--foreground-subdued);
	text-align:      center;
	margin:          0 auto;
}

.empty-state__title {
	font-size:   18px;
	font-weight: 600;
	color:       var(--foreground-normal);
	margin:      0;
}

.empty-state__body {
	font-size:   14px;
	line-height: 1.6;
	margin:      0;
}

/* ── Overview ────────────────────────────────────────────────── */
.overview {
	display:        flex;
	flex-direction: column;
	gap:            32px;
	max-width:      860px;
	text-align:     left;
}

.overview__hero {
	display:       flex;
	gap:           20px;
	align-items:   flex-start;
	padding:       24px;
	background:    var(--theme--form--field--input--background-subdued);
	border:        1px solid var(--theme--form--field--input--border-color);
	border-radius: var(--theme--border-radius);
}

.overview__hero-icon {
	display:         flex;
	align-items:     center;
	justify-content: center;
	width:           48px;
	height:          48px;
	border-radius:   var(--theme--border-radius);
	background:      var(--theme--primary-background);
	color:           var(--theme--primary);
	flex-shrink:     0;
}

.overview__hero-body {
	display:        flex;
	flex-direction: column;
	gap:            10px;
	flex:           1;
	min-width:      0;
}

.overview__hero-title {
	font-size:   20px;
	font-weight: 700;
	color:       var(--foreground-normal);
	margin:      0;
	line-height: 1.2;
}

.overview__hero-desc {
	font-size:   14px;
	line-height: 1.7;
	color:       var(--foreground-subdued);
	margin:      0;
}

.overview__inline-code {
	font-family:   var(--family-monospace);
	font-size:     12px;
	padding:       1px 5px;
	background:    var(--theme--background);
	border:        1px solid var(--theme--form--field--input--border-color);
	border-radius: 4px;
	color:         var(--theme--primary);
}

.overview__hero-features {
	display:   flex;
	flex-wrap: wrap;
	gap:       6px;
}

.overview__feature-pill {
	display:       inline-flex;
	align-items:   center;
	gap:           4px;
	font-size:     11px;
	font-weight:   600;
	padding:       3px 10px;
	border-radius: 999px;
	background:    var(--theme--background);
	border:        1px solid var(--theme--form--field--input--border-color);
	color:         var(--foreground-subdued);
}

/* ── Stats ───────────────────────────────────────────────────── */
.overview__stats {
	display:               grid;
	grid-template-columns: repeat(4, 1fr);
	gap:                   1px;
	background:            var(--theme--form--field--input--border-color);
	border:                1px solid var(--theme--form--field--input--border-color);
	border-radius:         var(--theme--border-radius);
	overflow:              hidden;
}

.overview-stat {
	display:        flex;
	flex-direction: column;
	align-items:    center;
	gap:            4px;
	padding:        20px 16px;
	background:     var(--theme--form--field--input--background-subdued);
}

.overview-stat__value {
	font-size:   28px;
	font-weight: 700;
	color:       var(--foreground-normal);
	line-height: 1;
}

.overview-stat__value--enabled    { color: var(--theme--success); }
.overview-stat__value--disabled   { color: var(--theme--form--field--input--foreground-subdued); }
.overview-stat__value--deprecated { color: var(--theme--warning); }

.overview-stat__label {
	font-size:      11px;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color:          var(--foreground-subdued);
}

/* ── Section ─────────────────────────────────────────────────── */
.overview__section {
	display:        flex;
	flex-direction: column;
	gap:            12px;
}

.overview__section-title {
	font-size:      11px;
	font-weight:    600;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color:          var(--foreground-subdued);
	margin:         0;
}

/* ── Endpoint table ──────────────────────────────────────────── */
.endpoint-table {
	width:           100%;
	border-collapse: separate;
	border-spacing:  0;
	border:          1px solid var(--theme--form--field--input--border-color);
	border-radius:   var(--theme--border-radius);
	overflow:        hidden;
	font-size:       14px;
}

.endpoint-table__th {
	padding:        8px 14px;
	background:     var(--theme--form--field--input--background-subdued);
	border-bottom:  1px solid var(--theme--form--field--input--border-color);
	font-size:      11px;
	font-weight:    600;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color:          var(--foreground-subdued);
	text-align:     left;
	white-space:    nowrap;
}

.endpoint-table__th--status  { width: 32px; padding-right: 0; }
.endpoint-table__th--version { width: 70px; }

.endpoint-table__row {
	cursor:     pointer;
	transition: background 0.15s;
}

.endpoint-table__row:hover td { background: var(--theme--form--field--input--background-subdued); }

.endpoint-table__row:not(:last-child) td {
	border-bottom: 1px solid var(--theme--form--field--input--border-color);
}

.endpoint-table__td {
	padding:        11px 14px;
	vertical-align: middle;
}

.endpoint-table__td--status {
	width:         32px;
	padding-right: 0;
	text-align:    center;
}

.endpoint-table__td--route {
	font-family: var(--family-monospace);
	font-size:   13px;
	color:       var(--theme--primary);
	white-space: nowrap;
}

.endpoint-table__td--desc {
	color:         var(--foreground-subdued);
	max-width:     240px;
	white-space:   nowrap;
	overflow:      hidden;
	text-overflow: ellipsis;
}

.endpoint-table__td--version {
	color:       var(--foreground-subdued);
	font-size:   12px;
	white-space: nowrap;
}

/* ── Method chip ─────────────────────────────────────────────── */
.method-chip {
	display:        inline-flex;
	align-items:    center;
	font-family:    var(--family-monospace);
	font-size:      9px;
	font-weight:    700;
	letter-spacing: 0.06em;
	padding:        2px 6px;
	border-radius:  var(--border-radius);
}
.method-chip--get  { background: #e8f5e9; color: #2e7d32; }
.method-chip--post { background: #e3f2fd; color: #1565c0; }

/* ── Status dot ──────────────────────────────────────────────── */
.status-dot {
	display:       inline-block;
	flex-shrink:   0;
	width:         8px;
	height:        8px;
	border-radius: 50%;
}
.status-dot--enabled    { background: var(--theme--success); }
.status-dot--disabled   { background: var(--theme--form--field--input--foreground-subdued); }
.status-dot--deprecated { background: var(--theme--warning); }

/* ── Quick links ─────────────────────────────────────────────── */
.quick-links {
	display:        flex;
	flex-direction: column;
	gap:            1px;
	background:     var(--theme--form--field--input--border-color);
	border:         1px solid var(--theme--form--field--input--border-color);
	border-radius:  var(--theme--border-radius);
	overflow:       hidden;
}

.quick-link {
	display:    flex;
	align-items: center;
	gap:        16px;
	padding:    14px 16px;
	background: var(--theme--background);
	border:     none;
	cursor:     pointer;
	text-align: left;
	width:      100%;
	transition: background 0.15s;
	color:      inherit;
}

.quick-link:hover { background: var(--theme--form--field--input--background-subdued); }

.quick-link__icon  { color: var(--theme--primary); flex-shrink: 0; }
.quick-link__arrow { color: var(--foreground-subdued); flex-shrink: 0; }

.quick-link__body {
	display:        flex;
	flex-direction: column;
	gap:            2px;
	flex:           1;
	min-width:      0;
}

.quick-link__title {
	font-size:   14px;
	font-weight: 600;
	color:       var(--foreground-normal);
}

.quick-link__desc {
	font-size: 13px;
	color:     var(--foreground-subdued);
}
</style>
