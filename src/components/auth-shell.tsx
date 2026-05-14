import type { ReactNode } from "react";
import { ChartNoAxesColumnIncreasing, FileSearch, Wrench } from "lucide-react";
import { RotatingWord } from "@/components/rotating-word";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

const signals = [
  {
    label: "Evidências",
    Icon: FileSearch,
  },
  {
    label: "Impacto",
    Icon: ChartNoAxesColumnIncreasing,
  },
  {
    label: "Correção",
    Icon: Wrench,
  },
];

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_32%),linear-gradient(135deg,#0b0b0c,#151517_48%,#080809)] px-5 py-8 text-stone-100">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-12 md:grid-cols-[1fr_420px] md:items-center lg:gap-20">
          <div className="hidden md:block">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
              TASKY
            </p>
            <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.03em] text-stone-100">
              Uma base única para erros, <RotatingWord words={["evidências", "impactos", "correções"]}/>
            </h1>
            <div className="mt-10 grid max-w-xl grid-cols-3 rounded-md border border-white/10 bg-white/[0.025]">
              {signals.map(({ Icon, label }) => (
                <div key={label} className="border-r border-white/10 px-4 py-4 last:border-r-0">
                  <p className="flex items-center gap-2 text-sm text-stone-200">
                    <Icon aria-hidden className="h-4 w-4 text-zinc-500" strokeWidth={1.8} />
                    {label}
                  </p>
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
