"use client";

import type { KeyboardEvent } from "react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Bold, Check, Code, Italic, List, ListOrdered, Pencil, Pilcrow, SquareCode } from "lucide-react";

type RichTextAreaProps = {
  name: string;
  defaultValue?: string | null;
  initiallyEditing?: boolean;
};

type Command = "bold" | "italic" | "code" | "codeblock" | "bullet" | "numbered" | "paragraph";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initialHtml(value: string) {
  if (/<\/?[a-z][\s\S]*>/i.test(value)) {
    return value;
  }

  return escapeHtml(value).replace(/\n/g, "<br>");
}

function isEmptyHtml(value: string) {
  return value.replace(/<br\s*\/?>/gi, "").replace(/<[^>]*>/g, "").trim().length === 0;
}

export function RichTextArea({ name, defaultValue, initiallyEditing = false }: RichTextAreaProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const draftHtmlRef = useRef("");
  const startingHtml = useMemo(() => initialHtml(defaultValue ?? ""), [defaultValue]);
  const [html, setHtml] = useState(startingHtml);
  const [isEditing, setIsEditing] = useState(initiallyEditing);

  useLayoutEffect(() => {
    if (!isEditing || !editorRef.current) {
      return;
    }

    editorRef.current.innerHTML = html;
    draftHtmlRef.current = html;
    setHiddenValue(html);
  }, [html, isEditing]);

  function editorContains(node: Node) {
    return Boolean(editorRef.current && (node === editorRef.current || editorRef.current.contains(node)));
  }

  function nodeElement(node: Node | null) {
    if (!node) {
      return null;
    }

    return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  }

  function closestInsideEditor(node: Node | null, selector: string) {
    const element = nodeElement(node);
    const match = element?.closest(selector);

    return match && editorRef.current?.contains(match) ? match : null;
  }

  function saveSelection() {
    const selection = window.getSelection();

    if (!selection?.rangeCount) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (editorContains(range.commonAncestorContainer)) {
      selectionRef.current = range.cloneRange();
    }
  }

  function restoreSelection() {
    const selection = window.getSelection();
    const range = selectionRef.current;

    if (!selection || !range) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }

  function getSelectedRange() {
    const selection = window.getSelection();

    if (selection?.rangeCount) {
      const currentRange = selection.getRangeAt(0);

      if (editorContains(currentRange.commonAncestorContainer)) {
        selectionRef.current = currentRange.cloneRange();
        return currentRange;
      }
    }

    restoreSelection();

    const restoredSelection = window.getSelection();

    if (!restoredSelection?.rangeCount) {
      return null;
    }

    const restoredRange = restoredSelection.getRangeAt(0);

    return editorContains(restoredRange.commonAncestorContainer) ? restoredRange : null;
  }

  function selectNodeContents(node: Node) {
    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
    selectionRef.current = range.cloneRange();
  }

  function placeCaretAfter(node: Node) {
    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    selectionRef.current = range.cloneRange();
  }

  function unwrapElement(element: Element) {
    const parent = element.parentNode;

    if (!parent) {
      return;
    }

    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }

    parent.removeChild(element);
    parent.normalize();
  }

  function setHiddenValue(value: string) {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = value;
    }
  }

  function syncDraft() {
    const nextHtml = editorRef.current?.innerHTML ?? "";
    draftHtmlRef.current = nextHtml;
    setHiddenValue(nextHtml);
  }

  function focusEditor() {
    editorRef.current?.focus({ preventScroll: true });
    restoreSelection();
  }

  function startEditing() {
    draftHtmlRef.current = html;
    setHiddenValue(html);
    setIsEditing(true);
    requestAnimationFrame(() => {
      editorRef.current?.focus({ preventScroll: true });
    });
  }

  function finishEditing() {
    const nextHtml = editorRef.current?.innerHTML ?? draftHtmlRef.current;
    draftHtmlRef.current = nextHtml;
    setHiddenValue(nextHtml);
    setHtml(nextHtml);
    setIsEditing(false);
  }

  function wrapSelection(tagName: "strong" | "em") {
    const range = getSelectedRange();

    if (!range || range.collapsed) {
      return;
    }

    const wrapper = document.createElement(tagName);
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    selectNodeContents(wrapper);
  }

  function toggleInlineFormat(command: "bold" | "italic") {
    const tagName = command === "bold" ? "strong" : "em";
    const selector = command === "bold" ? "strong,b" : "em,i";
    const range = getSelectedRange();

    if (!range || range.collapsed) {
      return;
    }

    const formattedAncestor = closestInsideEditor(range.commonAncestorContainer, selector);

    if (formattedAncestor) {
      unwrapElement(formattedAncestor);
      syncDraft();
      return;
    }

    wrapSelection(tagName);
    syncDraft();
  }

  function insertInlineCode() {
    const range = getSelectedRange();

    if (!range || range.collapsed) {
      return;
    }

    const code = document.createElement("code");
    const formattedAncestor = closestInsideEditor(range.commonAncestorContainer, "code");

    if (formattedAncestor) {
      unwrapElement(formattedAncestor);
      syncDraft();
      return;
    }

    code.textContent = range.toString() || "codigo";
    range.deleteContents();
    range.insertNode(code);
    selectNodeContents(code);
    syncDraft();
  }

  function insertCodeBlock() {
    const range = getSelectedRange();

    if (!range) {
      return;
    }

    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = range.toString() || "codigo";
    pre.appendChild(code);

    range.deleteContents();
    range.insertNode(pre);
    placeCaretAfter(pre);
    syncDraft();
  }

  function insertList(ordered: boolean) {
    const range = getSelectedRange();

    if (!range) {
      return;
    }

    const text = range.toString() || "Item";
    const list = document.createElement(ordered ? "ol" : "ul");
    const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);

    for (const line of lines.length ? lines : ["Item"]) {
      const item = document.createElement("li");
      item.textContent = line;
      list.appendChild(item);
    }

    range.deleteContents();
    range.insertNode(list);
    placeCaretAfter(list);
    syncDraft();
  }

  function wrapParagraph() {
    const range = getSelectedRange();

    if (!range || range.collapsed) {
      return;
    }

    const paragraph = document.createElement("p");
    paragraph.appendChild(range.extractContents());
    range.insertNode(paragraph);
    selectNodeContents(paragraph);
    syncDraft();
  }

  function insertPlainText(text: string) {
    const range = getSelectedRange();

    if (!range) {
      return;
    }

    const node = document.createTextNode(text);
    range.deleteContents();
    range.insertNode(node);
    placeCaretAfter(node);
    syncDraft();
  }

  function runCommand(command: Command) {
    focusEditor();

    if (command === "bold") {
      toggleInlineFormat("bold");
    }

    if (command === "italic") {
      toggleInlineFormat("italic");
    }

    if (command === "bullet") {
      insertList(false);
    }

    if (command === "numbered") {
      insertList(true);
    }

    if (command === "paragraph") {
      wrapParagraph();
    }

    if (command === "code") {
      insertInlineCode();
    }

    if (command === "codeblock") {
      insertCodeBlock();
    }

    requestAnimationFrame(syncDraft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      runCommand("bold");
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "i") {
      event.preventDefault();
      runCommand("italic");
    }

    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "8") {
      event.preventDefault();
      runCommand("bullet");
    }

    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "7") {
      event.preventDefault();
      runCommand("numbered");
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "`") {
      event.preventDefault();
      runCommand("code");
    }

    if (event.key === "Tab") {
      event.preventDefault();
      insertPlainText("  ");
    }
  }

  const toolbarButtonClass =
    "flex h-7 w-7 cursor-pointer items-center justify-center rounded text-zinc-300 transition hover:bg-white/[0.07] hover:text-stone-100";

  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-white/[0.025] transition focus-within:border-stone-300/40">
      <input ref={hiddenInputRef} name={name} type="hidden" defaultValue={html} />

      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.025] px-2 py-2">
        {isEditing ? (
          <>
            <div className="flex flex-wrap items-center gap-1">
              <button
                aria-label="Negrito"
                className={toolbarButtonClass}
                title="Negrito"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => runCommand("bold")}
              >
                <Bold aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                aria-label="Italico"
                className={toolbarButtonClass}
                title="Italico"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => runCommand("italic")}
              >
                <Italic aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                aria-label="Codigo"
                className={toolbarButtonClass}
                title="Codigo"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => runCommand("code")}
              >
                <Code aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                aria-label="Bloco de codigo"
                className={toolbarButtonClass}
                title="Bloco de codigo"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => runCommand("codeblock")}
              >
                <SquareCode aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
              <span className="mx-1 h-5 w-px bg-white/10" />
              <button
                aria-label="Lista"
                className={toolbarButtonClass}
                title="Lista"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => runCommand("bullet")}
              >
                <List aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                aria-label="Lista numerada"
                className={toolbarButtonClass}
                title="Lista numerada"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => runCommand("numbered")}
              >
                <ListOrdered aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                aria-label="Paragrafo"
                className={toolbarButtonClass}
                title="Paragrafo"
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => runCommand("paragraph")}
              >
                <Pilcrow aria-hidden className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <button
              className="inline-flex h-8 cursor-pointer items-center gap-2 rounded border border-white/10 px-3 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-stone-100"
              type="button"
              onClick={finishEditing}
            >
              <Check aria-hidden className="h-4 w-4" strokeWidth={2} />
              Concluir
            </button>
          </>
        ) : (
          <button
            className="ml-auto inline-flex h-8 cursor-pointer items-center gap-2 rounded border border-white/10 px-3 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-stone-100"
            type="button"
            onClick={startEditing}
          >
            <Pencil aria-hidden className="h-4 w-4" strokeWidth={2} />
            Editar
          </button>
        )}
      </div>

      {isEditing ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="tasky-rich-editor min-h-60 w-full cursor-text overflow-y-auto px-3 py-3 text-sm leading-6 text-stone-100 outline-none"
          onBlur={syncDraft}
          onDoubleClick={() => requestAnimationFrame(saveSelection)}
          onInput={syncDraft}
          onKeyDown={handleKeyDown}
          onKeyUp={() => {
            syncDraft();
            saveSelection();
          }}
          onMouseUp={saveSelection}
          onSelect={saveSelection}
        />
      ) : isEmptyHtml(html) ? (
        <div className="min-h-24 px-3 py-3 text-sm leading-6 text-zinc-500">Sem conteudo.</div>
      ) : (
        <div
          className="tasky-rich-editor min-h-24 px-3 py-3 text-sm leading-6 text-stone-100"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
