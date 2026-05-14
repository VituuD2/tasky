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
          description="Configurações administrativas estão disponíveis apenas para usuários admin."
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
        <EmptyState title="Não foi possível carregar as configurações" description={data.error} />
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile} active="admin">
      <AdminView profiles={data.profiles} />
    </AppShell>
  );
}
