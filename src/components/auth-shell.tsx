import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_32%),linear-gradient(135deg,#0b0b0c,#151517_48%,#080809)] px-5 py-8 text-stone-100">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 md:grid-cols-[1fr_420px] md:items-center">
          <div className="hidden md:block">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
              Tasky
            </p>
            <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.03em] text-stone-100">
              Registro interno de erros com contexto, dono e historico.
            </h1>
            <div className="mt-10 grid max-w-xl grid-cols-3 border border-white/10 bg-white/[0.025]">
              {["Database", "Tags", "RLS"].map((item) => (
                <div key={item} className="border-r border-white/10 px-4 py-4 last:border-r-0">
                  <p className="text-sm text-stone-200">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel w-full px-6 py-7">
            <p className="mb-8 text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
              Tasky
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-stone-100">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
