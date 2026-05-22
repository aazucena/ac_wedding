import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
//@ts-ignore
import type { Node } from "@tiptap/pm/model";

// ── Markdown serialiser ────────────────────────────────
function serializeInline(node: Node): string {
  let text = "";
  node.forEach(
    (child: { type: { name: string }; text: string; marks: any[] }) => {
      if (child.type.name === "hardBreak") {
        text += "  \n";
        return;
      }
      let t = child.text ?? "";
      const bold = child.marks.some(
        (m: { type: { name: string } }) => m.type.name === "bold",
      );
      const italic = child.marks.some(
        (m: { type: { name: string } }) => m.type.name === "italic",
      );
      const underline = child.marks.some(
        (m: { type: { name: string } }) => m.type.name === "underline",
      );
      const highlight = child.marks.some(
        (m: { type: { name: string } }) => m.type.name === "highlight",
      );
      if (bold && italic) t = `***${t}***`;
      else if (bold) t = `**${t}**`;
      else if (italic) t = `_${t}_`;
      if (underline) t = `<u>${t}</u>`;
      if (highlight) t = `<mark>${t}</mark>`;
      text += t;
    },
  );
  return text;
}

function toMarkdown(doc: Node): string {
  const parts: string[] = [];
  doc.forEach(
    (node: {
      type: { name: string };
      forEach: (arg0: (child: any) => void) => void;
    }) => {
      if (node.type.name === "paragraph") {
        parts.push(serializeInline(node));
      } else if (node.type.name === "blockquote") {
        const inner: string[] = [];
        node.forEach((child: { type: { name: string } }) => {
          if (child.type.name === "paragraph")
            inner.push(serializeInline(child));
        });
        parts.push(inner.map((l) => `> ${l}`).join("\n"));
      }
    },
  );
  return parts.join("\n\n").trim();
}

// ── Init each editor ───────────────────────────────────
document.querySelectorAll<HTMLElement>(".tiptap-wrap").forEach((wrap) => {
  const id = wrap.dataset.id!;
  const placeholder = wrap.dataset.placeholder ?? "";
  const mountEl = document.getElementById(`${id}-editor`);
  const textarea = document.getElementById(id) as HTMLTextAreaElement | null;
  if (!mountEl || !textarea) return;

  const editor = new Editor({
    element: mountEl,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        underline: false,
      }),
      Placeholder.configure({ placeholder }),
      Underline,
      Highlight,
    ],
    onUpdate({ editor }) {
      textarea.value = toMarkdown(editor.state.doc);
    },
  });

  // ── Toolbar buttons ─────────────────────────────────
  const COMMANDS: Record<string, () => void> = {
    bold: () => editor.chain().focus().toggleBold().run(),
    italic: () => editor.chain().focus().toggleItalic().run(),
    underline: () => editor.chain().focus().toggleUnderline().run(),
    highlight: () => editor.chain().focus().toggleHighlight().run(),
    blockquote: () => editor.chain().focus().toggleBlockquote().run(),
  };

  wrap
    .querySelectorAll<HTMLButtonElement>(".tiptap-btn[data-cmd]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        COMMANDS[btn.dataset.cmd!]?.();
        syncActive();
      });
    });

  function syncActive() {
    wrap
      .querySelectorAll<HTMLButtonElement>(".tiptap-btn[data-cmd]")
      .forEach((btn) => {
        btn.classList.toggle("active", editor.isActive(btn.dataset.cmd!));
      });
  }

  editor.on("selectionUpdate", syncActive);
  editor.on("transaction", syncActive);

  // ── Emoji picker ────────────────────────────────────
  const trigger = wrap.querySelector<HTMLButtonElement>(
    ".tiptap-emoji-trigger",
  );
  const picker = wrap.querySelector<HTMLElement>(".tiptap-emoji-picker");

  trigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = picker!.classList.toggle("open");
    trigger.setAttribute("aria-expanded", String(open));
  });

  picker
    ?.querySelectorAll<HTMLButtonElement>(".tiptap-emoji-btn")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        editor.chain().focus().insertContent(btn.dataset.emoji!).run();
        picker.classList.remove("open");
        trigger?.setAttribute("aria-expanded", "false");
      });
    });

  document.addEventListener("click", () => {
    picker?.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
  });
});
