<template>
  <div ref="wrapperEl" class="emoji-picker-interface">
    <v-input
      :model-value="inputValue"
      :placeholder="emojiOnly ? 'Pick an emoji…' : placeholder"
      :disabled="disabled"
      @update:model-value="onInput"
    >
      <template #prepend>
        <v-icon
          name="mood"
          class="action-icon"
          :class="{ disabled }"
          @click.stop="togglePicker"
        />
      </template>
      <template #append>
        <v-icon
          v-if="inputValue"
          :name="copied ? 'check' : 'content_copy'"
          class="action-icon"
          :class="{ disabled, copied }"
          @click.stop="copyValue"
        />
        <v-icon
          v-if="inputValue"
          name="close"
          class="action-icon"
          :class="{ disabled }"
          @click.stop="clearValue"
        />
      </template>
    </v-input>

    <!-- Single popover: shows filtered results when typing, full picker when browsing -->
    <div v-show="popoverOpen" class="picker-popover" @click.stop>
      <div v-if="searchResults.length > 0" class="search-results">
        <button
          v-for="emoji in searchResults"
          :key="emoji.id"
          class="suggestion-btn"
          type="button"
          @click="selectSuggestion(emoji)"
        >{{ emoji.skins[0].native }}</button>
      </div>
      <div v-show="searchResults.length === 0" ref="pickerContainer" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { Picker, SearchIndex, init } from 'emoji-mart';
import data from '@emoji-mart/data';
import emojilib from 'emojilib';

function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export default defineComponent({
  props: {
    value: { type: String, default: null },
    disabled: { type: Boolean, default: false },
    placeholder: { type: String, default: 'Enter text…' },
    emojiOnly: { type: Boolean, default: false },
  },
  emits: ['input'],
  setup(props, { emit }) {
    const inputValue = ref<string>(props.value ?? '');
    const browseOpen = ref(false);
    const pickerContainer = ref<HTMLElement | null>(null);
    const wrapperEl = ref<HTMLElement | null>(null);
    const searchResults = ref<any[]>([]);
    const copied = ref(false);

    // Popover is visible when browsing OR when there are search results to show
    const popoverOpen = computed(() => browseOpen.value || searchResults.value.length > 0);

    watch(() => props.value, (v) => {
      inputValue.value = v ?? '';
    });

    const debouncedSearch = debounce(async (val: string) => {
      const query = val.replace(/^\p{Emoji_Presentation}\s*/u, '').trim();
      if (!query) { searchResults.value = []; return; }
      const results = await SearchIndex.search(query);
      searchResults.value = results?.slice(0, 10) ?? [];
    }, 200);

    watch(inputValue, (val) => {
      if (!val?.trim()) {
        searchResults.value = [];
        return;
      }
      debouncedSearch(val);
    });

    onMounted(async () => {
      await init({ data, emojilib });

      const picker = new (Picker as any)({
        data,
        emojilib,
        searchPosition: 'none',
        onEmojiSelect(emoji: { native: string }) {
          applyEmoji(emoji.native);
          browseOpen.value = false;
        },
      });

      pickerContainer.value?.appendChild(picker as unknown as Node);
      document.addEventListener('click', onClickOutside);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('click', onClickOutside);
    });

    function applyEmoji(char: string): void {
      if (props.emojiOnly) {
        inputValue.value = char;
      } else {
        inputValue.value = char + ' ' + inputValue.value.replace(/^\p{Emoji_Presentation}\s*/u, '');
      }
      emit('input', inputValue.value);
    }

    function selectSuggestion(emoji: any): void {
      applyEmoji(emoji.skins[0].native);
      searchResults.value = [];
    }

    function togglePicker(): void {
      if (!props.disabled) browseOpen.value = !browseOpen.value;
    }

    function onClickOutside(e: MouseEvent): void {
      if (!wrapperEl.value?.contains(e.target as Node)) {
        browseOpen.value = false;
        searchResults.value = [];
      }
    }

    function clearValue(): void {
      if (!props.disabled) {
        inputValue.value = '';
        searchResults.value = [];
        emit('input', null);
      }
    }

    async function copyValue(): Promise<void> {
      if (!inputValue.value || copied.value) return;
      await navigator.clipboard.writeText(inputValue.value);
      copied.value = true;
      setTimeout(() => { copied.value = false; }, 2000);
    }

    function onInput(val: string): void {
      inputValue.value = val;
      emit('input', val);
    }

    return {
      inputValue, browseOpen, pickerContainer, wrapperEl,
      searchResults, popoverOpen,
      togglePicker, clearValue, copyValue, selectSuggestion, onInput, copied,
    };
  },
});
</script>

<style scoped>
.emoji-picker-interface {
  position: relative;
}

.action-icon {
  cursor: pointer;
  color: var(--theme--foreground-subdued);
  transition: color 0.15s;
}

.action-icon:hover {
  color: var(--theme--foreground);
}

.action-icon.copied {
  color: var(--theme--success);
}

.action-icon.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.picker-popover {
  position: absolute;
  left: 0;
  top: calc(100% + 4px);
  z-index: 600;
}

.search-results {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 4px;
  background: var(--theme--background-normal);
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
}

.suggestion-btn {
  font-size: 1.25rem;
  line-height: 1;
  padding: 4px 6px;
  background: transparent;
  border: none;
  border-radius: var(--theme--border-radius);
  cursor: pointer;
  transition: background 0.1s;
}

.suggestion-btn:hover {
  background: var(--theme--background-accent);
}
</style>
