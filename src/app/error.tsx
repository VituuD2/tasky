"use client";

import { ghostButtonClass } from "@/components/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[#0b0b0c] px-6 py-6 text-stone-100">
      <div className="mx-auto max-w-3xl border border-white/10 bg-[#111113] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Erro</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Nao foi possivel concluir a acao</h1>
        <p className="mt-3 text-sm text-zinc-400">{error.message || "Erro inesperado."}</p>
        <button className={`${ghostButtonClass} mt-5`} onClick={reset} type="button">
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
