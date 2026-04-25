<template>
	<private-view :title="selected ? selected.name : 'API Gateway'">
		<template #headline>Webhook Flows</template>

		<!-- ── Header actions ────────────────────────────────────────── -->
		<template #actions>
			<v-button v-tooltip.bottom="'Open API Docs'" secondary icon rounded @click="openDocs">
				<v-icon name="menu_book" />
			</v-button>
			<template v-if="selected">
				<v-button v-tooltip.bottom="'Open Flow'" secondary icon rounded @click="openFlow">
					<v-icon name="open_in_new" />
				</v-button>
				<v-button v-if="isDirty" v-tooltip.bottom="'Discard Changes'" secondary icon rounded @click="discardChanges">
					<v-icon name="close" />
				</v-button>
				<v-button v-tooltip.bottom="'Save Changes'" :disabled="!isDirty" :loading="saving" icon rounded @click="saveAll">
					<v-icon name="check" />
				</v-button>
			</template>
		</template>

		<!-- ── Sidebar ───────────────────────────────────────────────── -->
		<template #navigation>
			<div v-if="loading" class="nav-state">
				<v-progress-circular indeterminate x-small />
				<span>Loading…</span>
			</div>
			<v-notice v-else-if="error" type="danger">{{ error }}</v-notice>
			<template v-else>
				<v-list v-if="flows.length" nav>
					<v-list-item clickable :active="!selected" @click="selected = null">
						<div class="nav-item-row">
							<v-icon name="home" small class="nav-home-icon" />
							<v-text-overflow text="Overview" class="nav-item-name" />
						</div>
					</v-list-item>
					<v-divider />
					<v-list-item
						v-for="row in flows"
						:key="row.id"
						clickable
						:active="selected?.id === row.id"
						@click="selectFlow(row)"
					>
						<div class="nav-item-row">
							<span class="method-chip" :class="`method-chip--${row.method.toLowerCase()}`">
								{{ row.method }}
							</span>
							<v-text-overflow :text="row.name" class="nav-item-name" />
							<span
								v-tooltip="row.deprecated ? 'Deprecated' : row.enabled ? 'Enabled' : 'Disabled'"
								:class="['status-dot', row.deprecated ? 'status-dot--deprecated' : row.enabled ? 'status-dot--enabled' : 'status-dot--disabled']"
							/>
						</div>
					</v-list-item>
				</v-list>
				<div v-else class="nav-state">
					<v-icon name="hub" />
					<span>No webhook flows.</span>
				</div>
			</template>
		</template>

		<!-- ── Main ──────────────────────────────────────────────────── -->
		<div class="main">
			<overview-page v-if="!selected" :flows="flows" @select="selectFlow" />
			<flow-detail   v-else />
		</div>
	</private-view>
</template>

<script setup lang="ts">
import { provide, computed, onMounted, onUnmounted } from 'vue';
import { useApi } from '@directus/extensions-sdk';
//@ts-ignore
import formatTitle from '@directus/format-title';

import { GatewayContextKey, FIELD_TYPES, PRIMITIVE_FIELD_TYPES, FORMAT_OPTIONS } from './types';
import type { FlowRow } from './types';
import { useFlows }    from './composables/useFlows';
import { useMetadata } from './composables/useMetadata';
import { useFields }   from './composables/useFields';
import { useExport }   from './composables/useExport';
import OverviewPage    from './components/OverviewPage.vue';
import FlowDetail      from './components/FlowDetail.vue';

const api = useApi();

// ── Composables ────────────────────────────────────────────────────────────
const { loading, error, flows, selected, loadFlows } = useFlows(api);
const meta     = useMetadata(selected, flows, api);
const fields   = useFields(selected, api);
const xport    = useExport(selected);

// ── Destructure for template use ───────────────────────────────────────────
const { isDirty, saving, discardChanges, saveAll } = meta;

// ── Provide context to FlowDetail ──────────────────────────────────────────
const FIELD_TYPE_OPTIONS     = FIELD_TYPES.map(t => ({ text: formatTitle(t), value: t }));
const PRIMITIVE_TYPE_OPTIONS = PRIMITIVE_FIELD_TYPES.map(t => ({ text: formatTitle(t), value: t }));

provide(GatewayContextKey, {
	// flows
	flows,
	selected,
	// metadata
	keyDraft:      meta.keyDraft,
	keyError:      meta.keyError,
	keyInputRef:   meta.keyInputRef,
	isDirty:       meta.isDirty,
	saving:        meta.saving,
	savedSnapshot: meta.savedSnapshot,
	setDirty:      meta.setDirty,
	saveAll:       meta.saveAll,
	discardChanges: meta.discardChanges,
	normalizeKey:  meta.normalizeKey,
	toggleEnabled: meta.toggleEnabled,
	addTag:        meta.addTag,
	removeTag:     meta.removeTag,
	onTagKeydown:  meta.onTagKeydown,
	onTagBlur:     meta.onTagBlur,
	// fields
	activeTab:          fields.activeTab,
	drawerIndex:        fields.drawerIndex,
	drawerOpen:         fields.drawerOpen,
	drawerEdits:        fields.drawerEdits,
	isNewField:         fields.isNewField,
	activeFields:       fields.activeFields,
	activeFieldsSorted: fields.activeFieldsSorted,
	openField:          fields.openField,
	addField:           fields.addField,
	closeDrawer:        fields.closeDrawer,
	saveDrawer:         fields.saveDrawer,
	removeField:        fields.removeField,
	saveActiveFields:   fields.saveActiveFields,
	// export
	exportFormat:    xport.exportFormat,
	exportVariant:   xport.exportVariant,
	currentVariants: xport.currentVariants,
	exportOutput:    xport.exportOutput,
	copied:          xport.copied,
	copyExport:      xport.copyExport,
	// constants
	FORMAT_OPTIONS,
	FIELD_TYPE_OPTIONS,
	PRIMITIVE_TYPE_OPTIONS,
});

// ── Flow selection ─────────────────────────────────────────────────────────
function selectFlow(row: FlowRow) {
	selected.value = row;
	meta.resetForFlow(row);
	fields.resetForFlow();
	xport.resetForFlow();
}

// ── Navigation helpers ─────────────────────────────────────────────────────
const flowHref = computed(() => {
	if (!selected.value) return '#';
	const id = (selected.value.flow as any)?.id ?? selected.value.flow;
	return `/admin/settings/flows/${id}`;
});

function openFlow() { globalThis.open(flowHref.value, '_blank'); }
function openDocs() { globalThis.open('/api/docs', '_blank'); }

// ── Keyboard shortcut ──────────────────────────────────────────────────────
function onKeydown(e: KeyboardEvent) {
	if ((e.ctrlKey || e.metaKey) && e.key === 's') {
		e.preventDefault();
		if (isDirty.value) saveAll();
	}
}

onMounted(() => { loadFlows(); document.addEventListener('keydown', onKeydown); });
onUnmounted(() => { document.removeEventListener('keydown', onKeydown); });
</script>

<style scoped>
/* ── Sidebar ─────────────────────────────────────────────────── */
.nav-state {
	display:     flex;
	align-items: center;
	gap:         8px;
	padding:     12px 16px;
	font-size:   13px;
	color:       var(--foreground-subdued);
}

.nav-item-row {
	display:     flex;
	align-items: center;
	gap:         8px;
	width:       100%;
	min-width:   0;
}

.nav-item-name { flex: 1; min-width: 0; }
.nav-home-icon { color: var(--foreground-subdued); flex-shrink: 0; }

.method-chip {
	flex-shrink:    0;
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

/* ── Main ────────────────────────────────────────────────────── */
.main { padding: var(--content-padding); }
</style>
