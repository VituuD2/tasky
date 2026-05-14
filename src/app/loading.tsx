export default function Loading() {
  return (
    <main className="min-h-screen bg-[#0b0b0c] px-6 py-6 text-stone-100">
      <div className="mx-auto max-w-3xl border border-white/10 bg-[#111113] p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Tasky</p>
        <div className="mt-5 h-2 w-40 overflow-hidden bg-white/[0.06]">
          <div className="h-full w-20 animate-pulse bg-stone-300/50" />
        </div>
        <p className="mt-4 text-sm text-zinc-400">Carregando dados.</p>
      </div>
    </main>
  );
}
