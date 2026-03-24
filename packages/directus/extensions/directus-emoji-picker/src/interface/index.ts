import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
  id: 'emoji-picker-interface',
  name: 'Emoji Picker',
  icon: 'mood',
  description: 'Pick an emoji using emoji-mart — stores as a plain string',
  component: InterfaceComponent,
  types: ['string'],
  options: [
    {
      field: 'placeholder',
      name: 'Placeholder',
      type: 'string',
      meta: { interface: 'input', note: 'Shown when the field is empty' },
    },
    {
      field: 'emojiOnly',
      name: 'Emoji only (no text input)',
      type: 'boolean',
      meta: {
        interface: 'boolean',
        note: 'Selecting from the picker replaces the whole value instead of prepending',
      },
      schema: { default_value: false },
    },
  ],
});
