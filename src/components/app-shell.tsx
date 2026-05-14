import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { isAdmin } from "@/lib/permissions";
import type { Profile } from "@/types/tasky";

type AppShellProps = {
  profile: Profile | null;
  active: "database" | "export" | "admin";
  children: ReactNode;
};

export function AppShell({ profile, active, children }: AppShellProps) {
  const hasAdminAccess = isAdmin(profile);

  const links = [
    { key: "database", href: "/", label: "Database", show: true },
    { key: "export", href: "/export", label: "Exportar", show: true },
    { key: "admin", href: "/admin", label: "Configurações", show: hasAdminAccess },
  ] as const;

  return (
    <main className="min-h-screen bg-[#0b0b0c] text-stone-100">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[248px_1fr]">
        <aside className="border-b border-white/10 bg-[#111113]/95 px-4 py-5 backdrop-blur md:border-b-0 md:border-r">
          <div className="mb-8 flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-[-0.03em]">
              Tasky
            </Link>
            <span className="rounded border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              {profile?.role ?? "user"}
            </span>
          </div>

          <nav className="flex gap-1 overflow-x-auto text-sm md:block md:space-y-1 md:overflow-visible">
            {links
              .filter((link) => link.show)
              .map((link) => (
                <Link
                  key={link.key}
                  className={
                    active === link.key
                      ? "block min-w-fit rounded-md bg-white/[0.06] px-3 py-2 text-stone-100"
                      : "block min-w-fit rounded-md px-3 py-2 text-zinc-400 transition hover:bg-white/[0.04] hover:text-stone-200"
                  }
                  href={link.href}
                >
                  {link.label}
                </Link>
              ))}
          </nav>

          <form action={signOut} className="mt-6 md:mt-10">
            <button className="w-full cursor-pointer rounded-md border border-white/10 px-3 py-2 text-left text-sm text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.03] hover:text-stone-200">
              Sair
            </button>
          </form>
        </aside>

        <section className="min-w-0 px-4 py-5 md:px-8">{children}</section>
      </div>
    </main>
  );
}
