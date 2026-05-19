import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { TaskyLogo } from "@/components/tasky-logo";
import { isAdmin } from "@/lib/permissions";
import type { Profile } from "@/types/tasky";
import { Database, Download, Settings, LogOut } from "lucide-react";

type AppShellProps = {
  profile: Profile | null;
  active: "database" | "export" | "admin";
  children: ReactNode;
};

export function AppShell({ profile, active, children }: AppShellProps) {
  const hasAdminAccess = isAdmin(profile);

  const links = [
    { key: "database", href: "/", label: "Database", icon: Database, show: true },
    { key: "export", href: "/export", label: "Exportar", icon: Download, show: true },
    { key: "admin", href: "/admin", label: "Configurações", icon: Settings, show: hasAdminAccess },
  ] as const;

  return (
    <main className="min-h-screen bg-[#0b0b0c] text-stone-100">
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Spacer matching collapsed sidebar width */}
        <div className="hidden md:block w-[72px] shrink-0" />

        <aside className="border-b border-white/10 bg-[#111113]/95 px-4 py-5 backdrop-blur md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-[72px] md:hover:w-[240px] md:px-4 md:py-5 md:border-b-0 md:border-r md:flex md:flex-col md:justify-between transition-[width] duration-300 ease-in-out group overflow-hidden">
          <div className="flex flex-col gap-8">
            {/* Logo row — always left-aligned, no justify changes */}
            <div className="flex items-center h-8 overflow-hidden">
              <Link href="/" className="relative flex items-center text-stone-100 transition-colors hover:text-white shrink-0 h-8" aria-label="Tasky">
                {/* Icon logo — always rendered, fades out on hover */}
                <TaskyLogo
                  variant="icon"
                  className="h-8 w-8 hidden md:block md:group-hover:opacity-0 transition-opacity duration-300 absolute left-0"
                />
                {/* Full logo — always rendered, fades in on hover */}
                <TaskyLogo
                  variant="full"
                  className="h-8 w-auto block md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300"
                />
              </Link>
              <span className="ml-auto rounded border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500 whitespace-nowrap md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                {profile?.role ?? "user"}
              </span>
            </div>

            <nav className="flex gap-1 overflow-x-auto text-sm md:flex md:flex-col md:gap-1 md:overflow-visible">
              {links
                .filter((link) => link.show)
                .map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.key}
                      className={
                        active === link.key
                          ? "flex items-center gap-3 rounded-md bg-white/[0.06] px-3 py-2 text-stone-100"
                          : "flex items-center gap-3 rounded-md px-3 py-2 text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-stone-200"
                      }
                      href={link.href}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="whitespace-nowrap overflow-hidden md:w-0 md:opacity-0 md:group-hover:w-auto md:group-hover:opacity-100 transition-opacity duration-300">
                        {link.label}
                      </span>
                    </Link>
                  );
                })}
            </nav>
          </div>

          <form action={signOut} className="mt-6 md:mt-0">
            <button className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-white/10 px-3 py-2 text-left text-sm text-zinc-400 transition-colors hover:border-white/20 hover:bg-white/[0.03] hover:text-stone-200">
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap overflow-hidden md:w-0 md:opacity-0 md:group-hover:w-auto md:group-hover:opacity-100 transition-opacity duration-300">
                Sair
              </span>
            </button>
          </form>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-5 md:px-8">{children}</section>
      </div>
    </main>
  );
}


