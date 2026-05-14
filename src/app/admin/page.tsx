import { AppShell } from "@/components/app-shell";
import { AdminView } from "@/components/admin-view";
import { EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { listProfiles } from "@/lib/supabase/data";

export default async function AdminPage() {
  const { profile } = await requireUser();

  if (!isAdmin(profile)) {
    return (
      <AppShell profile={profile} active="database">
        <EmptyState
          title="Acesso restrito"
          description="Configuracoes administrativas estao disponiveis apenas para usuarios admin."
        />
      </AppShell>
    );
  }

  const data = await listProfiles()
    .then((profiles) => ({
      profiles,
      error: null as string | null,
    }))
    .catch((error: unknown) => ({
      profiles: [],
      error: error instanceof Error ? error.message : "Erro inesperado.",
    }));

  if (data.error) {
    return (
      <AppShell profile={profile} active="admin">
        <EmptyState title="Nao foi possivel carregar configuracoes" description={data.error} />
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile} active="admin">
      <AdminView profiles={data.profiles} />
    </AppShell>
  );
}
