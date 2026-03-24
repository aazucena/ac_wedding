import { defineDisplay } from '@directus/extensions-sdk';
import DisplayComponent from './display.vue';

export default defineDisplay({
  id: 'emoji-picker-display',
  name: 'Emoji',
  icon: 'mood',
  description: 'Renders an emoji string field with correct sizing',
  component: DisplayComponent,
  types: ['string'],
  options: [
    {
      field: 'emojiOnly',
      name: 'Emoji only mode',
      type: 'boolean',
      meta: {
        interface: 'boolean',
        note: 'Enlarges the glyph for fields that store only a single emoji',
      },
      schema: { default_value: false },
    },
  ],
});
