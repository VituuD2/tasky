"use client";

import { useMemo, useRef, useState } from "react";

type RichTextAreaProps = {
  name: string;
  defaultValue?: string | null;
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

function getSelectionText() {
  return window.getSelection()?.toString() || "texto";
}

export function RichTextArea({ name, defaultValue }: RichTextAreaProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const startingHtml = useMemo(() => initialHtml(defaultValue ?? ""), [defaultValue]);
  const [html, setHtml] = useState(startingHtml);

  function syncValue() {
    setHtml(editorRef.current?.innerHTML ?? "");
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  function runCommand(command: Command) {
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

    requestAnimationFrame(syncValue);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
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
      requestAnimationFrame(syncValue);
    }
  }

  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-white/[0.025] transition focus-within:border-stone-300/40">
      <input name={name} type="hidden" value={html} />
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-white/[0.025] px-2 py-2">
        <button className="h-7 min-w-7 cursor-pointer rounded px-2 text-sm font-semibold text-zinc-300 hover:bg-white/[0.07] hover:text-stone-100" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("bold")}>
          B
        </button>
        <button className="h-7 min-w-7 cursor-pointer rounded px-2 text-sm italic text-zinc-300 hover:bg-white/[0.07] hover:text-stone-100" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("italic")}>
          I
        </button>
        <button className="h-7 min-w-7 cursor-pointer rounded px-2 font-mono text-xs text-zinc-300 hover:bg-white/[0.07] hover:text-stone-100" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("code")}>
          code
        </button>
        <button className="h-7 min-w-7 cursor-pointer rounded px-2 font-mono text-xs text-zinc-300 hover:bg-white/[0.07] hover:text-stone-100" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("codeblock")}>
          block
        </button>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <button className="h-7 min-w-7 cursor-pointer rounded px-2 text-xs text-zinc-300 hover:bg-white/[0.07] hover:text-stone-100" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("bullet")}>
          list
        </button>
        <button className="h-7 min-w-7 cursor-pointer rounded px-2 text-xs text-zinc-300 hover:bg-white/[0.07] hover:text-stone-100" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("numbered")}>
          1.
        </button>
        <button className="h-7 min-w-7 cursor-pointer rounded px-2 text-xs text-zinc-300 hover:bg-white/[0.07] hover:text-stone-100" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand("paragraph")}>
          P
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="tasky-rich-editor min-h-60 w-full cursor-text overflow-y-auto px-3 py-3 text-sm leading-6 text-stone-100 outline-none"
        onInput={syncValue}
        onKeyDown={handleKeyDown}
        dangerouslySetInnerHTML={{ __html: startingHtml }}
      />
    </div>
  );
}
