"use client";

import type { KeyboardEvent } from "react";
import { useMemo, useRef, useState } from "react";
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

function getSelectionText() {
  return window.getSelection()?.toString() || "codigo";
}

export function RichTextArea({ name, defaultValue, initiallyEditing = false }: RichTextAreaProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const draftHtmlRef = useRef("");
  const startingHtml = useMemo(() => initialHtml(defaultValue ?? ""), [defaultValue]);
  const [html, setHtml] = useState(startingHtml);
  const [isEditing, setIsEditing] = useState(initiallyEditing);

  function editorContains(node: Node) {
    return Boolean(editorRef.current && (node === editorRef.current || editorRef.current.contains(node)));
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

  function runCommand(command: Command) {
    saveSelection();
    focusEditor();

    if (command === "bold") {
      document.execCommand("bold");
    }

    if (command === "italic") {
      document.execCommand("italic");
    }

    if (command === "bullet") {
      document.execCommand("insertUnorderedList");
    }

    if (command === "numbered") {
      document.execCommand("insertOrderedList");
    }

    if (command === "paragraph") {
      document.execCommand("formatBlock", false, "p");
    }

    if (command === "code") {
      document.execCommand("insertHTML", false, `<code>${escapeHtml(getSelectionText())}</code>`);
    }

    if (command === "codeblock") {
      document.execCommand(
        "insertHTML",
        false,
        `<pre><code>${escapeHtml(getSelectionText())}</code></pre><p><br></p>`,
      );
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
      document.execCommand("insertText", false, "  ");
      requestAnimationFrame(syncDraft);
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
          dangerouslySetInnerHTML={{ __html: html }}
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
