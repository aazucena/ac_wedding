// lib/markdown.ts — server-side markdown parser with HTML stripping
// Raw HTML in content (e.g. <script>, onerror=) is dropped; markdown formatting is preserved.

import { Marked } from 'marked';

const md = new Marked();

md.use({
  renderer: {
    html: () => '',
  },
});

export function parseMarkdown(content: string): string {
  return md.parse(content) as string;
}
