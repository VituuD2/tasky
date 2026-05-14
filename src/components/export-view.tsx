"use client";

import { useMemo, useState, useTransition } from "react";
import { exportReports } from "@/app/actions/export";
import { formatPersonName } from "@/lib/format";
import type { Profile, SelectOption } from "@/types/tasky";
import { FieldLabel, SectionPanel, StatusMessage, buttonClass, ghostButtonClass } from "@/components/ui";
import { DarkSelect } from "@/components/dark-select";
import { DateInput } from "@/components/date-input";

type ExportViewProps = {
  options: SelectOption[];
  profiles: Profile[];
};

function optionGroup(options: SelectOption[], type: string) {
  return options.filter((option) => option.type === type && option.is_active);
}

function downloadFile(fileName: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportView({ options, profiles }: ExportViewProps) {
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const grouped = useMemo(
    () => ({
      status: optionGroup(options, "status"),
      affectedArea: optionGroup(options, "affected_area"),
      severity: optionGroup(options, "severity"),
      errorType: optionGroup(options, "error_type"),
    }),
    [options],
  );
  const profileOptions = useMemo(
    () => profiles.map((profile) => ({ value: profile.id, label: formatPersonName(profile.full_name, profile.email) })),
    [profiles],
  );
  const statusOptions = useMemo(() => grouped.status.map((option) => ({ value: option.value, label: option.label })), [grouped.status]);
  const areaOptions = useMemo(
    () => grouped.affectedArea.map((option) => ({ value: option.value, label: option.label })),
    [grouped.affectedArea],
  );
  const severityOptions = useMemo(
    () => grouped.severity.map((option) => ({ value: option.value, label: option.label })),
    [grouped.severity],
  );
  const errorTypeOptions = useMemo(
    () => grouped.errorType.map((option) => ({ value: option.value, label: option.label })),
    [grouped.errorType],
  );

  function handleExport(formData: FormData) {
    setMessage(null);

    startTransition(async () => {
      const result = await exportReports(formData);

      if (result.ok && result.content && result.fileName && result.mimeType) {
        downloadFile(result.fileName, result.mimeType, result.content);
      }

      setMessage({ text: result.message, ok: result.ok });
    });
  }

  return (
    <div className="max-w-5xl">
      <header className="mb-6 border-b border-white/10 pb-5">
        <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Exportar</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">CSV / JSON</h1>
      </header>

      <SectionPanel>
        <form action={handleExport} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <FieldLabel>Data do erro inicio</FieldLabel>
              <DateInput name="error_date_from" />
            </label>
            <label>
              <FieldLabel>Data do erro fim</FieldLabel>
              <DateInput name="error_date_to" />
            </label>
            <label>
              <FieldLabel>Responsavel</FieldLabel>
              <DarkSelect name="responsible_profile_id" options={profileOptions} placeholder="Todos" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label>
              <FieldLabel>Status</FieldLabel>
              <DarkSelect name="status" options={statusOptions} placeholder="Todos" />
            </label>
            <label>
              <FieldLabel>Area afetada</FieldLabel>
              <DarkSelect name="affected_area" options={areaOptions} placeholder="Todas" />
            </label>
            <label>
              <FieldLabel>Severidade</FieldLabel>
              <DarkSelect name="severity" options={severityOptions} placeholder="Todas" />
            </label>
            <label>
              <FieldLabel>Tipo de erro</FieldLabel>
              <DarkSelect name="error_type" options={errorTypeOptions} placeholder="Todos" />
            </label>
          </div>

          {message ? <StatusMessage message={message.text} tone={message.ok ? "success" : "error"} /> : null}

          <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row">
            <button className={buttonClass} disabled={isPending} name="format" value="csv" type="submit">
              {isPending ? "Exportando" : "Exportar CSV"}
            </button>
            <button className={ghostButtonClass} disabled={isPending} name="format" value="json" type="submit">
              {isPending ? "Exportando" : "Exportar JSON"}
            </button>
          </div>
        </form>
      </SectionPanel>
    </div>
  );
}
