import { AppShell } from "@/components/app-shell";
import { ExportView } from "@/components/export-view";
import { EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listProfiles, listSelectOptions } from "@/lib/supabase/data";

export default async function ExportPage() {
  const { profile } = await requireUser();

  const data = await Promise.all([listSelectOptions(), listProfiles()])
    .then(([options, profiles]) => ({ options, profiles, error: null as string | null }))
    .catch((error: unknown) => ({
      options: [],
      profiles: [],
      error: error instanceof Error ? error.message : "Erro inesperado.",
    }));

  if (data.error) {
    return (
      <AppShell profile={profile} active="export">
        <EmptyState title="Não foi possível carregar os filtros" description={data.error} />
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile} active="export">
      <ExportView options={data.options} profiles={data.profiles} />
    </AppShell>
  );
}
