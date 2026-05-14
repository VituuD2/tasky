import type { ReactNode } from "react";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.025] px-4 py-10 text-center shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <h3 className="text-sm font-medium text-stone-200">{title}</h3>
      <p className="mt-2 text-sm text-zinc-500">{description}</p>
    </div>
  );
}

export function StatusMessage({
  message,
  tone = "neutral",
}: {
  message: string;
  tone?: "neutral" | "error" | "success";
}) {
  const className =
    tone === "error"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : tone === "success"
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
        : "border-white/10 bg-white/[0.035] text-zinc-300";

  return <p className={`rounded-md border px-3 py-2 text-sm ${className}`}>{message}</p>;
}

export function SectionPanel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-md border border-white/10 bg-[#111113] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.2)] md:p-5">
      {children}
    </section>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
      {children}
    </span>
  );
}

export const inputClass =
  "h-10 w-full cursor-text rounded-md border border-white/10 bg-white/[0.035] px-3 text-sm text-stone-100 outline-none transition placeholder:text-zinc-600 hover:border-white/15 focus:border-stone-300/40 focus:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60";

export const textareaClass =
  "min-h-24 w-full cursor-text resize-y rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-stone-100 outline-none transition placeholder:text-zinc-600 hover:border-white/15 focus:border-stone-300/40 focus:bg-white/[0.06]";

export const buttonClass =
  "h-10 cursor-pointer rounded-md border border-white/10 bg-stone-100 px-4 text-sm font-medium text-zinc-950 shadow-[0_10px_28px_rgba(255,255,255,0.05)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60";

export const ghostButtonClass =
  "h-10 cursor-pointer rounded-md border border-white/10 px-4 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-stone-100 disabled:cursor-not-allowed disabled:opacity-60";
