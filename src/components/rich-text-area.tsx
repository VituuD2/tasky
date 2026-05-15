"use client";

type RichTextAreaProps = {
  name: string;
  defaultValue?: string | null;
};

function textFromHtml(value: string) {
  if (!/<\/?[a-z][\s\S]*>/i.test(value)) {
    return value;
  }

  if (typeof document === "undefined") {
    return value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "");
  }

  const template = document.createElement("template");
  template.innerHTML = value.replace(/<br\s*\/?>/gi, "\n");
  return template.content.textContent ?? "";
}

export function RichTextArea({ name, defaultValue }: RichTextAreaProps) {
  return (
    <textarea
      className="min-h-60 w-full cursor-text resize-y rounded-md border border-white/10 bg-white/[0.035] px-3 py-3 text-sm leading-6 text-stone-100 outline-none transition placeholder:text-zinc-600 hover:border-white/15 focus:border-stone-300/40 focus:bg-white/[0.06]"
      defaultValue={textFromHtml(defaultValue ?? "")}
      name={name}
    />
  );
}
