"use client";

import { memo, useLayoutEffect, useRef, useState } from "react";

type RichTextAreaProps = {
  name: string;
  defaultValue?: string | null;
};

type EditorHistory = {
  entries: string[];
  index: number;
  isApplying: boolean;
};

const editorClassName =
  "rich-text-editor min-h-60 w-full cursor-text overflow-y-auto rounded-md border border-white/10 bg-white/[0.035] px-3 py-3 text-sm leading-6 text-stone-100 outline-none transition empty:before:text-zinc-600 hover:border-white/15 focus:border-stone-300/40 focus:bg-white/[0.06]";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function plainTextToHtml(value: string) {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, "<br>");
}

function sanitizeRichHtmlOnServer(value: string) {
  const allowedTags = new Set(["b", "br", "div", "em", "i", "li", "ol", "p", "span", "strong", "u", "ul"]);

  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style|iframe|object|embed|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\/?([a-z][a-z0-9-]*)([^>]*)>/gi, (tag, rawName: string, rawAttributes: string) => {
      const name = rawName.toLowerCase();
      const isClosing = /^<\s*\//.test(tag);

      if (name === "img" && !isClosing) {
        const sourceMatch = rawAttributes.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
        const source = sourceMatch?.[1] ?? sourceMatch?.[2] ?? sourceMatch?.[3] ?? "";

        if (!/^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(source)) {
          return "";
        }

        return `<img src="${escapeHtml(source)}" alt="Print colado" loading="lazy" data-tasky-image="true" contenteditable="false">`;
      }

      if (!allowedTags.has(name)) {
        return "";
      }

      if (name === "br") {
        return "<br>";
      }

      return isClosing ? `</${name}>` : `<${name}>`;
    })
    .trim();
}

function sanitizeRichHtml(value: string) {
  if (typeof document === "undefined") {
    return sanitizeRichHtmlOnServer(value);
  }

  const template = document.createElement("template");
  template.innerHTML = value;

  const allowedTags = new Set(["B", "BR", "DIV", "EM", "I", "IMG", "LI", "OL", "P", "SPAN", "STRONG", "U", "UL"]);
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
  const elements: Element[] = [];

  while (walker.nextNode()) {
    elements.push(walker.currentNode as Element);
  }

  for (const element of elements) {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    if (element instanceof HTMLImageElement) {
      const source = element.getAttribute("src") ?? "";

      if (!/^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(source)) {
        element.remove();
        continue;
      }

      for (const attribute of Array.from(element.attributes)) {
        element.removeAttribute(attribute.name);
      }

      element.src = source;
      element.alt = "Print colado";
      element.loading = "lazy";
      element.dataset.taskyImage = "true";
      element.contentEditable = "false";
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      element.removeAttribute(attribute.name);
    }
  }

  return template.innerHTML.trim();
}

function initialHtml(value: string) {
  if (!/<\/?[a-z][\s\S]*>/i.test(value)) {
    return plainTextToHtml(value);
  }

  return sanitizeRichHtml(value);
}

function insertNodeAtSelection(node: Node) {
  const selection = window.getSelection();

  if (!selection?.rangeCount) {
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function restoreSelection(range: Range) {
  const selection = window.getSelection();

  if (!selection) {
    return;
  }

  selection.removeAllRanges();
  selection.addRange(range);
}

function placeCaretAtEnd(element: HTMLElement) {
  const selection = window.getSelection();

  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertPlainTextAtSelection(value: string) {
  const lines = value.replace(/\r\n|\r/g, "\n").split("\n");

  lines.forEach((line, index) => {
    if (index > 0) {
      insertNodeAtSelection(document.createElement("br"));
    }

    if (line) {
      insertNodeAtSelection(document.createTextNode(line));
    }
  });
}

function RichTextAreaComponent({ name, defaultValue }: RichTextAreaProps) {
  const [initialHtmlValue] = useState(() => initialHtml(defaultValue ?? ""));
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<EditorHistory>({
    entries: [initialHtmlValue],
    index: 0,
    isApplying: false,
  });
  const initializedRef = useRef(false);

  useLayoutEffect(() => {
    if (initializedRef.current || !editorRef.current || !inputRef.current) {
      return;
    }

    initializedRef.current = true;
    editorRef.current.innerHTML = initialHtmlValue;
    inputRef.current.value = initialHtmlValue;
  }, [initialHtmlValue]);

  function syncValue() {
    if (!editorRef.current || !inputRef.current) {
      return "";
    }

    const nextHtml = sanitizeRichHtml(editorRef.current.innerHTML);
    inputRef.current.value = nextHtml;
    return nextHtml;
  }

  function pushHistory(nextHtml: string) {
    const history = historyRef.current;

    if (history.isApplying || history.entries[history.index] === nextHtml) {
      return;
    }

    history.entries = [...history.entries.slice(0, history.index + 1), nextHtml].slice(-80);
    history.index = history.entries.length - 1;
  }

  function applyHistory(delta: -1 | 1) {
    const editor = editorRef.current;
    const input = inputRef.current;
    const history = historyRef.current;
    const nextIndex = history.index + delta;

    if (!editor || !input || nextIndex < 0 || nextIndex >= history.entries.length) {
      return;
    }

    history.isApplying = true;
    history.index = nextIndex;
    editor.innerHTML = history.entries[nextIndex];
    input.value = history.entries[nextIndex];
    placeCaretAtEnd(editor);
    window.requestAnimationFrame(() => {
      history.isApplying = false;
    });
  }

  function handleInput() {
    pushHistory(syncValue());
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const key = event.key.toLowerCase();
    const isUndo = (event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey;
    const isRedo =
      (event.ctrlKey || event.metaKey) && (key === "y" || (key === "z" && event.shiftKey));

    if (!isUndo && !isRedo) {
      return;
    }

    event.preventDefault();
    applyHistory(isUndo ? -1 : 1);
  }

  async function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const imageItems = Array.from(event.clipboardData.items).filter((item) => item.type.startsWith("image/"));
    const selection = window.getSelection();
    const pasteRange = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;

    if (!imageItems.length) {
      const text = event.clipboardData.getData("text/plain");

      if (text) {
        event.preventDefault();

        if (pasteRange) {
          restoreSelection(pasteRange);
        }

        insertPlainTextAtSelection(text);
        pushHistory(syncValue());
      }

      return;
    }

    event.preventDefault();

    const imageSources: string[] = [];

    for (const item of imageItems) {
      const file = item.getAsFile();

      if (!file) {
        continue;
      }

      const source = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      imageSources.push(source);
    }

    if (pasteRange) {
      restoreSelection(pasteRange);
    }

    for (const source of imageSources) {
      const image = document.createElement("img");
      image.src = source;
      image.alt = "Print colado";
      image.loading = "lazy";
      image.dataset.taskyImage = "true";
      image.contentEditable = "false";
      insertNodeAtSelection(image);
      insertNodeAtSelection(document.createElement("br"));
    }

    pushHistory(syncValue());
  }

  return (
    <>
      <input ref={inputRef} name={name} type="hidden" defaultValue={initialHtmlValue} />
      <div
        ref={editorRef}
        aria-multiline="true"
        className={editorClassName}
        contentEditable
        role="textbox"
        suppressContentEditableWarning
        onBlur={() => {
          syncValue();
        }}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
    </>
  );
}

export const RichTextArea = memo(RichTextAreaComponent, (previous, next) => {
  return previous.name === next.name && (previous.defaultValue ?? "") === (next.defaultValue ?? "");
});
