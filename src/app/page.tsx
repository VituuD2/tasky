import { AppShell } from "@/components/app-shell";
import { DatabaseView } from "@/components/database-view";
import { EmptyState, StatusMessage } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { listErrorReports, listLayoutSettings, listProfiles, listSelectOptions } from "@/lib/supabase/data";

export default async function HomePage() {
  const { profile } = await requireUser();

  if (!hasSupabaseEnv()) {
    return (
      <AppShell profile={profile} active="database">
        <StatusMessage message="Configure as variaveis do Supabase para carregar o Tasky." tone="error" />
      </AppShell>
    );
  }

  const data = await Promise.all([
      listErrorReports(),
      listSelectOptions(),
      listProfiles(),
      listLayoutSettings(),
    ])
    .then(([reports, options, profiles, layout]) => ({
      reports,
      options,
      profiles,
      layout,
      error: null as string | null,
    }))
    .catch((error: unknown) => ({
      reports: [],
      options: [],
      profiles: [],
      layout: [],
      error: error instanceof Error ? error.message : "Erro inesperado ao buscar dados.",
    }));

  if (data.error) {
    return (
      <AppShell profile={profile} active="database">
        <EmptyState title="Nao foi possivel carregar os registros" description={data.error} />
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile} active="database">
      <DatabaseView
        reports={data.reports}
        options={data.options}
        profiles={data.profiles}
        layout={data.layout}
        profile={profile}
      />
    </AppShell>
  );
}
