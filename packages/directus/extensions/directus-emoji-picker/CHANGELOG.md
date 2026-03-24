# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-03-16

### Added
- **Interface** (`emoji-picker-interface`) — emoji picker field interface for Directus string fields
- **Display** (`emoji-picker-display`) — display component that renders the stored emoji with correct sizing
- Emoji search powered by [emoji-mart](https://github.com/missive/emoji-mart) v5 and [emojilib](https://github.com/nicusor-beg/emojilib) v4
  - Typing in the input debounces and searches via `SearchIndex` — results appear in the same popover as the full browser
  - Full emoji browser available via the picker button (left side of input)
- **Emoji-only mode** — `emojiOnly` option stores a single emoji character; picker selection replaces the whole value
- **Text + emoji mode** — picker selection prepends the chosen emoji to existing text
- **Copy to clipboard** — `content_copy` button in the append area; icon swaps to `check` for 2 s as confirmation
- **Clear** — `close` button removes the current value
- Inline keyword search: strips leading emoji from the query so `"🚀 Launch"` searches `"Launch"`
- Configurable `placeholder` text for text + emoji mode
- `--theme--*` CSS custom properties used throughout for full Directus light/dark theme support

[Unreleased]: https://github.com/aazucena/directus-extension-emoji-picker/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/aazucena/directus-extension-emoji-picker/releases/tag/v1.0.0
