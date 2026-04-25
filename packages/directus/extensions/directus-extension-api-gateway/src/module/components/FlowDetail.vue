<template>
	<div>
		<!-- Header form -->
		<div class="detail-header">

			<!-- Key -->
			<div class="field-row full">
				<p class="type-label">Key</p>
				<v-input
					:ref="(el: any) => { ctx.keyInputRef.value = el; }"
					v-model="ctx.keyDraft.value"
					:class="['key-input', { 'key-input--error': ctx.keyError.value }]"
					placeholder="snake_case_key"
					font="monospace"
					db-safe
					@blur="ctx.normalizeKey"
					@keydown.enter="($event.target as HTMLElement).blur()"
				>
					<template #prepend>
						<span class="method-chip" :class="`method-chip--${ctx.selected.value!.method.toLowerCase()}`">
							{{ ctx.selected.value!.method }}
						</span>
					</template>
				</v-input>
				<p v-if="ctx.keyError.value" class="key-error type-note">{{ ctx.keyError.value }}</p>
				<p v-else class="type-note">Used as the endpoint identifier.</p>
			</div>

			<!-- Version + Enabled -->
			<div class="field-row half">
				<p class="type-label">Version</p>
				<v-input
					v-model="ctx.selected.value!.version"
					placeholder="v1"
					font="monospace"
					@update:model-value="ctx.setDirty"
				/>
				<p class="type-note">URL path segment (e.g. /v1/).</p>
			</div>
			<div class="field-row half">
				<p class="type-label">Enabled</p>
				<v-checkbox
					block
					icon-on="check_box"
					icon-off="check_box_outline_blank"
					:model-value="ctx.selected.value!.enabled"
					label="Enabled"
					:style="{ '--v-checkbox-color': 'var(--theme--primary)', '--v-checkbox-unchecked-color': 'var(--theme--form--field--input--foreground-subdued)' }"
					@update:model-value="ctx.toggleEnabled"
				/>
				<p class="type-note">When disabled, excluded from the flow-keys response.</p>
			</div>

			<!-- Auth Required + Deprecated -->
			<div class="field-row half">
				<p class="type-label">Auth Required</p>
				<v-checkbox
					block
					icon-on="check_box"
					icon-off="check_box_outline_blank"
					:model-value="ctx.selected.value!.auth_required"
					label="Auth Required"
					:style="{ '--v-checkbox-color': 'var(--theme--primary)', '--v-checkbox-unchecked-color': 'var(--theme--form--field--input--foreground-subdued)' }"
					@update:model-value="(v: boolean) => { ctx.selected.value!.auth_required = v; ctx.setDirty(); }"
				/>
				<p class="type-note">Callers must pass an Authorization header.</p>
			</div>
			<div class="field-row half">
				<p class="type-label">Deprecated</p>
				<v-checkbox
					block
					icon-on="check_box"
					icon-off="check_box_outline_blank"
					:model-value="ctx.selected.value!.deprecated"
					label="Deprecated"
					:style="{ '--v-checkbox-color': 'var(--theme--warning)', '--v-checkbox-unchecked-color': 'var(--theme--form--field--input--foreground-subdued)' }"
					@update:model-value="(v: boolean) => { ctx.selected.value!.deprecated = v; ctx.setDirty(); }"
				/>
				<p class="type-note">Adds a <code>Deprecation: true</code> response header.</p>
			</div>

			<!-- Tags -->
			<div class="field-row full">
				<p class="type-label">Tags</p>
				<v-input placeholder="Add a tag…" @keydown="ctx.onTagKeydown" @blur="ctx.onTagBlur">
					<template #append><v-icon name="local_offer" /></template>
				</v-input>
				<div v-if="ctx.selected.value!.tags.length" class="tags">
					<v-chip
						v-for="tag in ctx.selected.value!.tags"
						:key="tag"
						small label clickable
						class="tag-chip"
						@click="ctx.removeTag(tag)"
					>
						{{ tag }}<v-icon name="close" x-small right />
					</v-chip>
				</div>
				<p class="type-note">Press Enter or comma to add. Click a tag to remove it.</p>
			</div>

			<!-- Description -->
			<div class="field-row full">
				<p class="type-label">Description</p>
				<v-textarea
					:model-value="ctx.selected.value!.description"
					placeholder="Describe what this endpoint does…"
					@update:model-value="(v: string) => { ctx.selected.value!.description = v; ctx.setDirty(); }"
				/>
			</div>

		</div>

		<!-- Two-column body -->
		<div class="body">

			<!-- Left — field repeater -->
			<div class="body__schema">
				<div class="tabs-bar">
					<v-tabs
						:model-value="[ctx.activeTab.value]"
						class="schema-tabs"
						@update:model-value="ctx.activeTab.value = ($event as string[])[0] as any"
					>
						<v-tab value="request">
							{{ ctx.selected.value!.method === 'GET' ? 'Query Params' : 'Request Body' }}
							<span v-if="ctx.selected.value!.request_fields.length" class="tab-count">
								{{ ctx.selected.value!.request_fields.length }}
							</span>
						</v-tab>
						<v-tab value="response">
							Response
							<span v-if="ctx.selected.value!.response_fields.length" class="tab-count">
								{{ ctx.selected.value!.response_fields.length }}
							</span>
						</v-tab>
					</v-tabs>
				</div>

				<v-notice v-if="!ctx.activeFields.value.length">No fields defined yet.</v-notice>
				<draggable
					v-else
					v-model="ctx.activeFieldsSorted.value"
					tag="v-list"
					item-key="name"
					handle=".drag-handle"
					:force-fallback="true"
					@end="ctx.saveActiveFields"
				>
					<template #item="{ element, index }">
						<v-list-item block clickable @click="ctx.openField(index)">
							<v-icon name="drag_handle" class="drag-handle" left @click.stop />
							<v-chip small class="field-row__type">{{ element.type }}</v-chip>
							<span class="field-row__name">{{ element.name ? formatTitle(element.name) : 'Unnamed field' }}</span>
							<div class="spacer" />
							<v-icon name="close" small class="field-row__remove" @click.stop="ctx.removeField(index)" />
						</v-list-item>
					</template>
				</draggable>

				<div class="repeater-actions">
					<v-button @click="ctx.addField">Create New</v-button>
				</div>
			</div>

			<!-- Right — export -->
			<div class="body__export">
				<p class="export-title">Export Schema</p>
				<div class="export-dropdowns">
					<div class="export-lang-select">
						<v-select v-model="ctx.exportFormat.value" :items="ctx.FORMAT_OPTIONS" />
					</div>
					<div v-if="ctx.currentVariants.value.length" class="export-variant-select">
						<v-select v-model="ctx.exportVariant.value" :items="ctx.currentVariants.value" />
					</div>
				</div>
				<div class="input-code">
					<v-button
						v-tooltip.left="ctx.copied.value ? 'Copied!' : 'Copy'"
						icon small secondary
						class="copy-button"
						@click="ctx.copyExport"
					>
						<v-icon :name="ctx.copied.value ? 'check' : 'content_copy'" />
					</v-button>
					<pre class="code-pre">{{ ctx.exportOutput.value }}</pre>
				</div>
			</div>

		</div>

		<!-- Field drawer -->
		<v-drawer
			:model-value="ctx.drawerOpen.value"
			:title="ctx.drawerEdits.name ? formatTitle(ctx.drawerEdits.name) : 'New Field'"
			persistent
			@cancel="ctx.closeDrawer"
			@apply="ctx.saveDrawer"
		>
			<template #actions>
				<v-button
					v-tooltip.bottom="'Save'"
					icon rounded
					:disabled="!ctx.drawerEdits.name?.trim()"
					@click="ctx.saveDrawer"
				>
					<v-icon name="check" />
				</v-button>
			</template>

			<div class="drawer-content">
				<div class="form-grid">
					<div class="grid-element full">
						<p class="type-label">Field Name</p>
						<v-input v-model="ctx.drawerEdits.name" autofocus placeholder="field_name" font="monospace" db-safe />
					</div>
					<div class="grid-element full">
						<p class="type-label">Type</p>
						<v-select v-model="ctx.drawerEdits.type" :items="ctx.FIELD_TYPE_OPTIONS" @update:model-value="onTypeChange" />
					</div>

					<!-- Array sub-type controls -->
					<template v-if="ctx.drawerEdits.type === 'array'">
						<div class="grid-element full">
							<p class="type-label">Item Schema</p>
							<v-tabs
								:model-value="[arrayMode]"
								class="sub-schema-tabs"
								@update:model-value="setArrayMode(($event as string[])[0] as 'simple' | 'nested')"
							>
								<v-tab value="simple">Typed</v-tab>
								<v-tab value="nested">Object items</v-tab>
							</v-tabs>
							<v-select
								v-if="arrayMode === 'simple'"
								v-model="ctx.drawerEdits.itemType"
								:items="ctx.PRIMITIVE_TYPE_OPTIONS"
								placeholder="Any (unknown)"
								show-deselect
							/>
							<template v-else>
								<v-notice v-if="!ctx.drawerEdits.itemSchema?.length" type="info">
									No properties defined yet.
								</v-notice>
								<draggable
									v-else
									v-model="ctx.drawerEdits.itemSchema"
									tag="v-list"
									item-key="name"
									handle=".sub-drag-handle"
									:force-fallback="true"
								>
									<template #item="{ element: sub, index: i }">
										<v-list-item block clickable @click="openSubField('itemSchema', i)">
											<v-icon name="drag_handle" class="sub-drag-handle" left @click.stop />
											<v-chip small class="sub-prop-type">{{ sub.type }}</v-chip>
											<span class="sub-prop-name">{{  sub.name ? formatTitle(sub.name) : 'Unnamed property/field' }}</span>
											<div class="spacer" />
											<v-icon name="close" small class="sub-prop-remove" @click.stop="removeSubField('itemSchema', i)" />
										</v-list-item>
									</template>
								</draggable>
								<div class="sub-prop-actions">
									<v-button secondary @click="addSubField('itemSchema')">Add property</v-button>
								</div>
							</template>
						</div>
					</template>

					<!-- Object sub-type controls -->
					<template v-else-if="ctx.drawerEdits.type === 'object'">
						<div class="grid-element full">
							<p class="type-label">Object Schema</p>
							<v-tabs
								:model-value="[objectMode]"
								class="sub-schema-tabs"
								@update:model-value="setObjectMode(($event as string[])[0] as 'simple' | 'nested')"
							>
								<v-tab value="simple">Record</v-tab>
								<v-tab value="nested">Named props</v-tab>
							</v-tabs>
							<v-select
								v-if="objectMode === 'simple'"
								v-model="ctx.drawerEdits.valueType"
								:items="ctx.PRIMITIVE_TYPE_OPTIONS"
								placeholder="Any (unknown)"
								show-deselect
							/>
							<template v-else>
								<v-notice v-if="!ctx.drawerEdits.properties?.length" type="info">
									No properties defined yet.
								</v-notice>
								<draggable
									v-else
									v-model="ctx.drawerEdits.properties"
									tag="v-list"
									item-key="name"
									handle=".sub-drag-handle"
									:force-fallback="true"
								>
									<template #item="{ element: sub, index: i }">
										<v-list-item block clickable @click="openSubField('properties', i)">
											<v-icon name="drag_handle" class="sub-drag-handle" left @click.stop />
											<v-chip small class="sub-prop-type">{{ sub.type }}</v-chip>
											<span class="sub-prop-name">{{ sub.name ? formatTitle(sub.name) : 'Unnamed property/field' }}</span>
											<div class="spacer" />
											<v-icon name="close" small class="sub-prop-remove" @click.stop="removeSubField('properties', i)" />
										</v-list-item>
									</template>
								</draggable>
								<div class="sub-prop-actions">
									<v-button secondary @click="addSubField('properties')">Add property</v-button>
								</div>
							</template>
						</div>
					</template>
					<div class="grid-element half">
						<p class="type-label">Required</p>
						<v-checkbox
							block icon-on="check_box" icon-off="check_box_outline_blank"
							:model-value="ctx.drawerEdits.required"
							label="Requires a value"
							@update:model-value="ctx.drawerEdits.required = $event"
						/>
					</div>
					<div class="grid-element half">
						<p class="type-label">Nullable</p>
						<v-checkbox
							block icon-on="check_box" icon-off="check_box_outline_blank"
							:model-value="ctx.drawerEdits.nullable"
							label="Can be null"
							@update:model-value="ctx.drawerEdits.nullable = $event"
						/>
					</div>
					<div class="grid-element full">
						<p class="type-label">Example</p>
						<v-input v-model="ctx.drawerEdits.example" placeholder="e.g. john@example.com" font="monospace" />
					</div>
					<div class="grid-element full">
						<p class="type-label">Description</p>
						<v-textarea v-model="ctx.drawerEdits.description" placeholder="Describe what this field represents…" />
					</div>
				</div>
			</div>
		</v-drawer>

		<!-- Sub-property nested drawer -->
		<v-drawer
			:model-value="subDrawerOpen"
			:title="subEdits.name ? formatTitle(subEdits.name) : 'New Property'"
			persistent
			@cancel="closeSubDrawer"
			@apply="saveSubField"
		>
			<template #actions>
				<v-button
					v-tooltip.bottom="'Save'"
					icon rounded
					:disabled="!subEdits.name?.trim()"
					@click="saveSubField"
				>
					<v-icon name="check" />
				</v-button>
			</template>
			<div class="drawer-content">
				<div class="form-grid">
					<div class="grid-element full">
						<p class="type-label">Property Name</p>
						<v-input v-model="subEdits.name" autofocus placeholder="property_name" font="monospace" db-safe />
					</div>
					<div class="grid-element full">
						<p class="type-label">Type</p>
						<v-select v-model="subEdits.type" :items="ctx.FIELD_TYPE_OPTIONS" @update:model-value="onSubTypeChange" />
					</div>
					<div v-if="subEdits.type === 'array'" class="grid-element full">
						<p class="type-label">Item Type</p>
						<v-select v-model="subEdits.itemType" :items="ctx.PRIMITIVE_TYPE_OPTIONS" placeholder="Any (unknown)" show-deselect />
					</div>
					<div v-else-if="subEdits.type === 'object'" class="grid-element full">
						<p class="type-label">Value Type</p>
						<v-select v-model="subEdits.valueType" :items="ctx.PRIMITIVE_TYPE_OPTIONS" placeholder="Any (unknown)" show-deselect />
					</div>
					<div class="grid-element half">
						<p class="type-label">Required</p>
						<v-checkbox
							block icon-on="check_box" icon-off="check_box_outline_blank"
							:model-value="subEdits.required"
							label="Requires a value"
							@update:model-value="subEdits.required = $event"
						/>
					</div>
					<div class="grid-element half">
						<p class="type-label">Nullable</p>
						<v-checkbox
							block icon-on="check_box" icon-off="check_box_outline_blank"
							:model-value="subEdits.nullable"
							label="Can be null"
							@update:model-value="subEdits.nullable = $event"
						/>
					</div>
					<div class="grid-element full">
						<p class="type-label">Example</p>
						<v-input v-model="subEdits.example" placeholder="e.g. john@example.com" font="monospace" />
					</div>
					<div class="grid-element full">
						<p class="type-label">Description</p>
						<v-textarea v-model="subEdits.description" placeholder="Describe what this field represents…" />
					</div>
				</div>
			</div>
		</v-drawer>
	</div>
</template>

<script setup lang="ts">
import { inject, ref, reactive, watch } from 'vue';
//@ts-ignore
import formatTitle from '@directus/format-title';
import Draggable   from 'vuedraggable';
import { GatewayContextKey } from '../types';
import type { SubField } from '../types';

const ctx = inject(GatewayContextKey)!;

// ── Field-type mode (simple vs nested) ────────────────────────
const arrayMode  = ref<'simple' | 'nested'>('simple');
const objectMode = ref<'simple' | 'nested'>('simple');

watch(() => ctx.drawerOpen.value, (open) => {
	if (!open) return;
	arrayMode.value  = (ctx.drawerEdits.itemSchema?.length  ?? 0) > 0 ? 'nested' : 'simple';
	objectMode.value = (ctx.drawerEdits.properties?.length ?? 0) > 0 ? 'nested' : 'simple';
});

function onTypeChange() {
	if (ctx.drawerEdits.type !== 'array')  { arrayMode.value  = 'simple'; ctx.drawerEdits.itemSchema  = undefined; }
	if (ctx.drawerEdits.type !== 'object') { objectMode.value = 'simple'; ctx.drawerEdits.properties = undefined; }
}

function setArrayMode(mode: 'simple' | 'nested') {
	arrayMode.value = mode;
	if (mode === 'simple') {
		ctx.drawerEdits.itemSchema = undefined;
	} else {
		ctx.drawerEdits.itemType = undefined;
		if (!ctx.drawerEdits.itemSchema) ctx.drawerEdits.itemSchema = [];
	}
}

function setObjectMode(mode: 'simple' | 'nested') {
	objectMode.value = mode;
	if (mode === 'simple') {
		ctx.drawerEdits.properties = undefined;
	} else {
		ctx.drawerEdits.valueType = undefined;
		if (!ctx.drawerEdits.properties) ctx.drawerEdits.properties = [];
	}
}

// ── Sub-field nested drawer ────────────────────────────────────
const subDrawerOpen   = ref(false);
const isNewSubField   = ref(false);
const subDrawerTarget = ref<'itemSchema' | 'properties' | null>(null);
const subDrawerIndex  = ref<number | null>(null);
const subEdits = reactive<{
	name: string; type: SubField['type']; required: boolean;
	itemType?: SubField['type']; valueType?: SubField['type'];
	nullable?: boolean; description?: string; example?: string;
}>({
	name: '', type: 'string', required: false,
	itemType: undefined, valueType: undefined,
	nullable: false, description: '', example: '',
});

function openSubField(target: 'itemSchema' | 'properties', i: number) {
	const item = (ctx.drawerEdits[target] as SubField[])?.[i];
	if (!item) return;
	subDrawerTarget.value = target;
	subDrawerIndex.value  = i;
	subEdits.name         = item.name;
	subEdits.type         = item.type;
	subEdits.required     = item.required     ?? false;
	subEdits.itemType     = item.itemType;
	subEdits.valueType    = item.valueType;
	subEdits.nullable     = item.nullable     ?? false;
	subEdits.description  = item.description  ?? '';
	subEdits.example      = item.example      ?? '';
	isNewSubField.value   = false;
	subDrawerOpen.value   = true;
}

function addSubField(target: 'itemSchema' | 'properties') {
	if (!ctx.drawerEdits[target]) ctx.drawerEdits[target] = [];
	const arr = ctx.drawerEdits[target] as SubField[];
	arr.push({ name: '', type: 'string', required: false });
	subDrawerTarget.value = target;
	subDrawerIndex.value  = arr.length - 1;
	subEdits.name         = '';
	subEdits.type         = 'string';
	subEdits.required     = false;
	subEdits.itemType     = undefined;
	subEdits.valueType    = undefined;
	subEdits.nullable     = false;
	subEdits.description  = '';
	subEdits.example      = '';
	isNewSubField.value   = true;
	subDrawerOpen.value   = true;
}

function onSubTypeChange() {
	if (subEdits.type !== 'array')  subEdits.itemType  = undefined;
	if (subEdits.type !== 'object') subEdits.valueType = undefined;
}

function saveSubField() {
	if (!subEdits.name?.trim() || subDrawerTarget.value === null || subDrawerIndex.value === null) return;
	const arr = ctx.drawerEdits[subDrawerTarget.value] as SubField[] | undefined;
	if (!arr) return;
	arr[subDrawerIndex.value] = {
		name:        subEdits.name.trim(),
		type:        subEdits.type,
		required:    subEdits.required             || undefined,
		itemType:    subEdits.type === 'array'  ? subEdits.itemType  : undefined,
		valueType:   subEdits.type === 'object' ? subEdits.valueType : undefined,
		nullable:    subEdits.nullable             || undefined,
		description: subEdits.description?.trim()  || undefined,
		example:     subEdits.example?.trim()      || undefined,
	};
	subDrawerOpen.value = false;
	isNewSubField.value = false;
}

function closeSubDrawer() {
	if (isNewSubField.value && subDrawerTarget.value !== null && subDrawerIndex.value !== null) {
		(ctx.drawerEdits[subDrawerTarget.value] as SubField[])?.splice(subDrawerIndex.value, 1);
	}
	subDrawerOpen.value = false;
	isNewSubField.value = false;
}

function removeSubField(target: 'itemSchema' | 'properties', i: number) {
	ctx.drawerEdits[target]?.splice(i, 1);
}
</script>

<style scoped>
/* ── Detail header ───────────────────────────────────────────── */
.detail-header {
	display:               grid;
	grid-template-columns: 1fr 1fr;
	gap:                   20px 24px;
	margin-bottom:         28px;
}

.field-row { display: flex; flex-direction: column; gap: 6px; }
.field-row.full { grid-column: 1 / -1; }
.field-row.half { grid-column: span 1; }

.key-input { width: 100%; }
.key-input--error {
	--v-input-border-color:       var(--theme--danger);
	--v-input-border-color-focus: var(--theme--danger);
}

.key-error { color: var(--theme--danger); }

.type-note {
	margin-top: 6px;
	font-size:  12px;
	font-style: italic;
	color:      var(--foreground-subdued);
}

.type-label {
	margin-bottom: var(--theme--form--field--label--margin-bottom, 8px);
}

/* ── Method chip ─────────────────────────────────────────────── */
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

/* ── Tags ────────────────────────────────────────────────────── */
.tags {
	display:     flex;
	flex-wrap:   wrap;
	gap:         6px;
	padding-top: 6px;
}

.tag-chip {
	--v-chip-background-color:       var(--theme--primary);
	--v-chip-color:                  var(--foreground-inverted);
	--v-chip-background-color-hover: var(--theme--danger);
	--v-chip-border-color-hover:     var(--theme--danger);
	--v-chip-color-hover:            var(--foreground-inverted);
	transition: background-color var(--fast) var(--transition), border-color var(--fast) var(--transition);
}

/* ── Two-column body ─────────────────────────────────────────── */
.body {
	display:               grid;
	grid-template-columns: 1fr 1fr;
	border:                var(--border-width) solid var(--border-subdued);
	border-top:            none;
	border-radius:         0 0 var(--border-radius) var(--border-radius);
	min-height:            320px;
}

.body__schema {
	padding:      20px;
	padding-left: 0;
	border-right: var(--border-width) solid var(--border-subdued);
}

.body__export {
	padding:    20px;
	background: var(--background-subdued);
}

/* ── Tabs ────────────────────────────────────────────────────── */
.tabs-bar {
	border-bottom: var(--border-width) solid var(--border-subdued);
	margin-bottom: 14px;
}

.schema-tabs { border-bottom: none; white-space: nowrap; }

.schema-tabs :deep(.v-tab.horizontal) {
	padding-bottom: 10px;
	border-bottom:  2px solid transparent;
	transition:     color var(--fast) var(--transition), border-color var(--fast) var(--transition);
}
.schema-tabs :deep(.v-tab.horizontal.active) {
	color:         var(--theme--primary, var(--primary));
	border-bottom: 2px solid var(--theme--primary, var(--primary));
}

.tab-count {
	display:         inline-flex;
	align-items:     center;
	justify-content: center;
	min-width:       18px;
	height:          18px;
	padding:         0 5px;
	margin-left:     6px;
	border-radius:   var(--border-radius-full);
	background:      var(--background-subdued);
	font-size:       11px;
	font-weight:     600;
	color:           var(--foreground-subdued);
}
.schema-tabs :deep(.v-tab.horizontal.active) .tab-count {
	background: var(--theme--primary-background, var(--primary-10));
	color:      var(--theme--primary, var(--primary));
}

/* ── Repeater ────────────────────────────────────────────────── */
.drag-handle {
	cursor:     grab;
	color:      var(--foreground-subdued);
	transition: color var(--fast) var(--transition);
}
.drag-handle:hover { color: var(--foreground-normal); }

.field-row__name {
	font-family:   var(--family-monospace);
	font-size:     13px;
	color:         var(--foreground-normal);
	white-space:   nowrap;
	overflow:      hidden;
	text-overflow: ellipsis;
}

.spacer { flex: 1; }

.field-row__type   { flex-shrink: 0; margin-right: 10px; }

.field-row__remove {
	color:      var(--foreground-subdued);
	cursor:     pointer;
	transition: color var(--fast) var(--transition);
}
.field-row__remove:hover { color: var(--danger); }

.repeater-actions { padding-top: 12px; }

/* ── Export panel ────────────────────────────────────────────── */
.export-title {
	font-size:      11px;
	font-weight:    600;
	text-transform: uppercase;
	letter-spacing: 0.07em;
	color:          var(--foreground-subdued);
	margin:         0 0 12px;
}

.export-dropdowns {
	display:         flex;
	align-items:     center;
	justify-content: space-between;
	gap:             12px;
	margin-bottom:   16px;
}

.export-lang-select,
.export-variant-select { flex: 1; }

.input-code {
	position:      relative;
	width:         100%;
	font-size:     0.8125rem;
	border:        var(--theme--border-width, var(--border-width)) solid var(--theme--form--field--input--border-color, var(--border-subdued));
	border-radius: var(--theme--border-radius, var(--border-radius));
	background:    var(--theme--form--field--input--background, var(--background-page));
	overflow:      hidden;
}

.copy-button {
	position:           absolute;
	inset-block-start:  0.5625rem;
	inset-inline-end:   0.5625rem;
	z-index:            4;
	color:              var(--theme--primary, var(--primary));
	transition:         color var(--fast) var(--transition-out);
}
.copy-button:hover { color: var(--theme--primary-accent, var(--primary-dark)); }

.code-pre {
	padding:     12px 14px;
	font-family: var(--theme--fonts--monospace--font-family, var(--family-monospace));
	font-size:   0.8125rem;
	line-height: 1.65;
	color:       var(--theme--form--field--input--foreground, var(--foreground-normal));
	overflow-x:  auto;
	overflow-y:  auto;
	white-space: pre-wrap;
	word-break:  break-all;
	max-height:  420px;
	margin:      0;
}

/* ── Field drawer ────────────────────────────────────────────── */
.drawer-content {
	padding:        var(--content-padding);
	padding-bottom: var(--content-padding-bottom);
}

.form-grid {
	display:               grid;
	grid-template-columns: 1fr 1fr;
	gap:                   var(--theme--form--row-gap, 24px) var(--theme--form--column-gap, 12px);
}

.grid-element.full { grid-column: span 2; }
.grid-element.half { grid-column: span 1; }

/* ── Sub-schema tabs + property list ─────────────────────────── */
.sub-drag-handle {
	cursor:     grab;
	color:      var(--foreground-subdued);
	transition: color var(--fast) var(--transition);
}
.sub-drag-handle:hover { color: var(--foreground-normal); }

.sub-schema-tabs { margin-bottom: 10px; }

.sub-schema-tabs :deep(.v-tab.horizontal) {
	padding-bottom: 8px;
	border-bottom:  2px solid transparent;
	transition:     color var(--fast) var(--transition), border-color var(--fast) var(--transition);
  white-space:    nowrap;
}
.sub-schema-tabs :deep(.v-tab.horizontal.active) {
	color:         var(--theme--primary, var(--primary));
	border-bottom: 2px solid var(--theme--primary, var(--primary));
}

.sub-prop-type { flex-shrink: 0; margin-right: 10px; }

.sub-prop-name {
	font-family:   var(--family-monospace);
	font-size:     13px;
	color:         var(--foreground-normal);
	white-space:   nowrap;
	overflow:      hidden;
	text-overflow: ellipsis;
}

.sub-prop-remove {
	color:      var(--foreground-subdued);
	cursor:     pointer;
	transition: color var(--fast) var(--transition);
}
.sub-prop-remove:hover { color: var(--danger); }

.sub-prop-actions { padding-top: 10px; }
</style>
