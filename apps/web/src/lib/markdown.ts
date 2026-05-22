// lib/markdown.ts — server-side markdown parser with HTML stripping
// Raw HTML in content (e.g. <script>, onerror=) is dropped; markdown formatting is preserved.

import { Marked } from "marked";

const md = new Marked();

md.use({
  renderer: {
    // Strip all raw HTML except safe inline formatting tags (<u>, <mark>)
    html: (token) => {
      return /^<\/?(u|mark)(\s[^>]*)?>$/i.test(token.text.trim())
        ? token.text
        : "";
    },
  },
});

export function parseMarkdown(content: string): string {
  return md.parse(content) as string;
}
