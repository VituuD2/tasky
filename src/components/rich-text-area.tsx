"use client";

import { useRef } from "react";

type RichTextAreaProps = {
  name: string;
  defaultValue?: string | null;
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

    for (const attribute of Array.from(element.attributes)) {
      element.removeAttribute(attribute.name);
    }

    if (element instanceof HTMLImageElement) {
      if (!/^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(element.src)) {
        element.remove();
        continue;
      }

      element.alt = "Print colado";
      element.loading = "lazy";
      element.dataset.taskyImage = "true";
      element.contentEditable = "false";
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

export function RichTextArea({ name, defaultValue }: RichTextAreaProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function syncValue() {
    if (!editorRef.current || !inputRef.current) {
      return;
    }

    inputRef.current.value = sanitizeRichHtml(editorRef.current.innerHTML);
  }

  async function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const imageItems = Array.from(event.clipboardData.items).filter((item) => item.type.startsWith("image/"));

    if (!imageItems.length) {
      const text = event.clipboardData.getData("text/plain");

      if (text) {
        event.preventDefault();
        insertPlainTextAtSelection(text);
        syncValue();
      }

      return;
    }

    event.preventDefault();

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

      const image = document.createElement("img");
      image.src = source;
      image.alt = "Print colado";
      image.loading = "lazy";
      image.dataset.taskyImage = "true";
      image.contentEditable = "false";
      insertNodeAtSelection(image);
      insertNodeAtSelection(document.createElement("br"));
    }

    syncValue();
  }

  const html = initialHtml(defaultValue ?? "");

  return (
    <>
      <input ref={inputRef} name={name} type="hidden" defaultValue={html} />
      <div
        ref={editorRef}
        aria-multiline="true"
        className={editorClassName}
        contentEditable
        dangerouslySetInnerHTML={{ __html: html }}
        role="textbox"
        suppressContentEditableWarning
        onInput={syncValue}
        onPaste={handlePaste}
      />
    </>
  );
}
