<template>
  <span
    v-if="value"
    :class="['emoji-display', { 'emoji-only': emojiOnly }]"
  >{{ value }}</span>
  <span v-else class="empty">—</span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    value: { type: String, default: null },
    emojiOnly: { type: Boolean, default: false },
  },
});
</script>

<style scoped>
.emoji-display {
  font-size: 1em;
}

.emoji-display.emoji-only {
  font-size: 1.4em;
  line-height: 1;
}

.empty {
  color: var(--theme--foreground-subdued);
}
</style>
