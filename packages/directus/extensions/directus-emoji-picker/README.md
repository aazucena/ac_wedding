# directus-extension-emoji-picker

A Directus **bundle extension** that adds an emoji picker interface and display to any `string` field. Powered by [emoji-mart](https://github.com/missive/emoji-mart) v5 and [emojilib](https://github.com/nicusor-beg/emojilib) for rich keyword search.

## Background

Directus ships an internal `v-emoji-picker` component (visible in the [components.directus.io](https://components.directus.io) library) but does not expose it as part of the official extension API. Attempting to use it directly inside an extension causes the entire Directus admin to crash — likely because the component depends on internal providers and lifecycle hooks that are not present in the extension context.

This extension is a **standalone replacement**: it bundles emoji-mart directly so it has no dependency on Directus internals, works reliably in any extension context, and adds capabilities the built-in component lacks (keyword search via emojilib, copy-to-clipboard, clear, text + emoji mode).

## Features

- **Inline keyword search** — type in the input to search emojis by keyword; results appear in the same popover as the full browser
- **Full emoji browser** — click the 😊 button to browse all emojis by category
- **Emoji-only mode** — ideal for icon fields; picker selection replaces the whole value
- **Text + emoji mode** — picker selection prepends the chosen emoji to existing text (e.g. `🚀 Launch`)
- **Copy to clipboard** — with visual confirmation (icon swaps to ✓ for 2 s)
- **Clear** — removes the current value in one click
- **Theme-aware** — uses Directus `--theme--*` CSS custom properties; works with light and dark themes

## Requirements

- Directus `^11.0.0`
- Node.js `>=18.0.0`

## Installation

### From npm

```bash
# npm
npm install directus-extension-emoji-picker

# pnpm
pnpm add directus-extension-emoji-picker
```

Place (or symlink) the installed package inside your Directus extensions folder, or use Directus's built-in marketplace if available.

### Manual / self-hosted

1. Clone or copy this package into your Directus extensions directory (e.g. `/directus/extensions/directus-extension-emoji-picker`)
2. Run `pnpm install && pnpm build` inside the package directory
3. Restart Directus — the extension is auto-discovered

## Setup in Directus

1. Go to **Settings → Data Model** and open the collection + field you want to use
2. Set the **Interface** to `Emoji Picker`
3. Set the **Display** to `Emoji`
4. Configure options (see below) and save

## Interface Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `placeholder` | `string` | `Enter text…` | Placeholder shown when the field is empty (text + emoji mode only) |
| `emojiOnly` | `boolean` | `false` | When enabled, picker selection replaces the whole value instead of prepending |

## Display Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `emojiOnly` | `boolean` | `false` | Enlarges the glyph for fields that store only a single emoji |

## Usage

### Emoji-only field (e.g. an icon field)

1. Set **Interface → Emoji Picker** and enable **Emoji only**
2. Set **Display → Emoji** and enable **Emoji only**
3. Type a keyword (e.g. `fire`, `star`, `check`) to search, or click the 😊 button to browse

### Text + emoji field (e.g. a section label)

1. Set **Interface → Emoji Picker** (leave Emoji only off)
2. Set **Display → Emoji**
3. Type your label (e.g. `Launch`); matching emojis appear in a popover. Click one to prepend it (`🚀 Launch`). Or click the 😊 button to browse and pick freely.

## Development

```bash
# Install dependencies
pnpm install

# Build once
pnpm build

# Watch mode (no minification)
pnpm dev

# Lint
pnpm lint

# Format
pnpm format
```

The extension is a **bundle** with two entry points:

| Entry | Source | ID |
|-------|--------|----|
| Interface | `src/interface/index.ts` | `emoji-picker-interface` |
| Display | `src/display/index.ts` | `emoji-picker-display` |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/)
4. Open a pull request

Please update `CHANGELOG.md` under `[Unreleased]` with a summary of your changes.

## License

[MIT](./LICENSE) © Aldrin Aazucena
