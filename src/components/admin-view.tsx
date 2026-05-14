"use client";

import { updateProfileRole } from "@/app/actions/admin";
import { formatPersonName } from "@/lib/format";
import type { Profile } from "@/types/tasky";
import { AdminActionForm } from "@/components/admin-action-form";
import { FieldLabel, SectionPanel, ghostButtonClass } from "@/components/ui";
import { DarkSelect } from "@/components/dark-select";

type AdminViewProps = {
  profiles: Profile[];
};

export function AdminView({ profiles }: AdminViewProps) {
  return (
    <div className="space-y-6">
      <header className="border-b border-white/10 pb-5">
        <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Configuracoes</h1>
        <p className="mt-2 text-sm text-zinc-400">Usuarios e roles.</p>
      </header>

      <SectionPanel>
        <h2 className="text-lg font-semibold tracking-[-0.02em]">Usuarios e roles</h2>
        <div className="mt-5 overflow-x-auto rounded-md border border-white/10">
          <div className="min-w-[720px] divide-y divide-white/10">
            {profiles.map((profile) => (
              <AdminActionForm
                key={profile.id}
                action={updateProfileRole}
                className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_160px_110px] md:items-end"
              >
                <input name="profile_id" type="hidden" value={profile.id} />
                <div>
                  <p className="text-sm font-medium text-stone-200">
                    {formatPersonName(profile.full_name, profile.email)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{profile.email}</p>
                </div>
                <label>
                  <FieldLabel>Role</FieldLabel>
                  <DarkSelect
                    name="role"
                    defaultValue={profile.role}
                    options={[
                      { value: "user", label: "user" },
                      { value: "admin", label: "admin" },
                    ]}
                    placeholder="Role"
                    required
                  />
                </label>
                <button className={ghostButtonClass} type="submit">
                  Atualizar
                </button>
              </AdminActionForm>
            ))}
          </div>
        </div>
      </SectionPanel>
    </div>
  );
}
