"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { deleteErrorReport, saveErrorReport } from "@/app/actions/error-reports";
import { formatPersonName } from "@/lib/format";
import type { ErrorReportWithRelations, Profile, SelectOption } from "@/types/tasky";
import { FieldLabel, buttonClass, ghostButtonClass, inputClass, StatusMessage } from "@/components/ui";
import { OptionPicker } from "@/components/option-picker";
import { DarkSelect } from "@/components/dark-select";
import { DateInput } from "@/components/date-input";
import { MoneyInput } from "@/components/money-input";
import { RichTextArea } from "@/components/rich-text-area";

type ErrorReportModalProps = {
  report: ErrorReportWithRelations | null;
  options: SelectOption[];
  profiles: Profile[];
  canManageOptions: boolean;
  onClose: () => void;
  onDataChange?: () => void;
};

function optionsByType(options: SelectOption[], type: string) {
  return options.filter((option) => option.type === type && option.is_active);
}

export function ErrorReportModal({
  report,
  options,
  profiles,
  canManageOptions,
  onClose,
  onDataChange,
}: ErrorReportModalProps) {
  const [localOptions, setLocalOptions] = useState(options);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reportedByMode, setReportedByMode] = useState(
    report?.reported_by_name ? "__create" : report?.reported_by_profile_id ?? "",
  );

  const groupedOptions = useMemo(
    () => ({
      happenedBefore: optionsByType(localOptions, "happened_before"),
    }),
    [localOptions],
  );
  const profileOptions = useMemo(
    () =>
      profiles.map((profile) => ({
        value: profile.id,
        label: formatPersonName(profile.full_name, profile.email),
      })),
    [profiles],
  );
  const reportedByOptions = useMemo(
    () => [...profileOptions, { value: "__create", label: "+ Criar usuário/pessoa" }],
    [profileOptions],
  );
  const happenedBeforeOptions = useMemo(
    () => groupedOptions.happenedBefore.map((option) => ({ value: option.value, label: option.label })),
    [groupedOptions.happenedBefore],
  );

  function handleSubmit(formData: FormData) {
    setMessage(null);

    if (reportedByMode !== "__create") {
      formData.set("reported_by_profile_id", reportedByMode);
      formData.set("reported_by_name", "");
    }

    startTransition(async () => {
      const result = await saveErrorReport(formData);
      setMessage({ text: result.message, ok: result.ok });

      if (result.ok) {
        onClose();
        onDataChange?.();
      }
    });
  }

  function handleDelete() {
    if (!report) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await deleteErrorReport(report.id);
      setMessage({ text: result.message, ok: result.ok });

      if (result.ok) {
        onClose();
        onDataChange?.();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 px-4 py-5 backdrop-blur-sm">
      <div className="mx-auto max-h-[calc(100vh-2.5rem)] w-full max-w-4xl overflow-y-auto rounded-md border border-white/10 bg-[#111113] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#111113]/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              {report ? `Erro #${report.human_id}` : "Novo erro"}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
              {report ? "Visualizar / editar erro" : "Reportar erro"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {report && canManageOptions ? (
              <button
                aria-label="Excluir erro"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-red-400/15 bg-red-500/10 text-red-200 transition hover:border-red-300/30 hover:bg-red-500/15 hover:text-red-100 hover:shadow-[0_0_20px_rgba(248,113,113,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                type="button"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="h-4 w-4 fill-red-500/25 stroke-[2.4]" />
              </button>
            ) : null}
            <button className={ghostButtonClass} onClick={onClose} type="button">
              Fechar
            </button>
          </div>
        </div>

        <form action={handleSubmit} className="space-y-5 p-5">
          <input name="id" type="hidden" value={report?.id ?? ""} />

          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <label>
              <FieldLabel>Titulo</FieldLabel>
              <input name="title" required defaultValue={report?.title ?? ""} className={inputClass} />
            </label>
            <label>
              <FieldLabel>Impacto financeiro</FieldLabel>
              <MoneyInput name="financial_impact" defaultValue={report?.financial_impact} />
            </label>
          </div>

          <label>
              <FieldLabel>Descrição</FieldLabel>
            <RichTextArea name="description" defaultValue={report?.description} />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <FieldLabel>Area afetada</FieldLabel>
              <OptionPicker
                name="affected_area"
                type="affected_area"
                value={report?.affected_area}
                options={localOptions}
                required
                canManage={canManageOptions}
                onOptionsChange={setLocalOptions}
              />
            </label>
            <label>
              <FieldLabel>Tipo de erro</FieldLabel>
              <OptionPicker
                name="error_type"
                type="error_type"
                value={report?.error_type}
                options={localOptions}
                required
                canManage={canManageOptions}
                onOptionsChange={setLocalOptions}
              />
            </label>
            <label>
              <FieldLabel>Severidade</FieldLabel>
              <OptionPicker
                name="severity"
                type="severity"
                value={report?.severity}
                options={localOptions}
                required
                canManage={canManageOptions}
                onOptionsChange={setLocalOptions}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label>
              <FieldLabel>Status</FieldLabel>
              <OptionPicker
                name="status"
                type="status"
                value={report?.status}
                options={localOptions}
                required
                canManage={canManageOptions}
                onOptionsChange={setLocalOptions}
              />
            </label>
            <label>
              <FieldLabel>Data do erro</FieldLabel>
              <DateInput name="error_date" defaultValue={report?.error_date} />
            </label>
            <label>
              <FieldLabel>Aberto em</FieldLabel>
              <DateInput name="opened_at" defaultValue={report?.opened_at} required />
            </label>
            <label>
              <FieldLabel>Resolvido em</FieldLabel>
              <DateInput name="resolved_at" defaultValue={report?.resolved_at} />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <FieldLabel>Responsavel</FieldLabel>
              <DarkSelect
                name="responsible_profile_id"
                defaultValue={report?.responsible_profile_id ?? ""}
                options={profileOptions}
                placeholder="Sem responsável"
              />
            </label>
            <label>
              <FieldLabel>Reportado por</FieldLabel>
              <DarkSelect
                value={reportedByMode}
                options={reportedByOptions}
                placeholder="Usuario atual"
                onChange={setReportedByMode}
              />
            </label>
            <label>
              <FieldLabel>Já aconteceu</FieldLabel>
              <DarkSelect
                name="happened_before"
                defaultValue={report?.happened_before === null ? "" : String(report?.happened_before ?? "")}
                options={happenedBeforeOptions}
                placeholder="Não informado"
              />
            </label>
          </div>

          {reportedByMode === "__create" ? (
            <label>
              <FieldLabel>Nome da pessoa sem conta</FieldLabel>
              <input name="reported_by_name" defaultValue={report?.reported_by_name ?? ""} className={inputClass} />
            </label>
          ) : null}

          <label>
            <FieldLabel>Ação corretiva</FieldLabel>
            <RichTextArea name="corrective_action" defaultValue={report?.corrective_action} />
          </label>

          {message ? <StatusMessage message={message.text} tone={message.ok ? "success" : "error"} /> : null}

          <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
            <button className={ghostButtonClass} type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className={buttonClass} disabled={isPending} type="submit">
              {isPending ? "Salvando" : "Salvar"}
            </button>
          </div>
        </form>
      </div>

      {confirmingDelete && report ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-md border border-red-400/20 bg-[#151516] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-red-400/20 bg-red-500/10 text-red-100 shadow-[0_0_22px_rgba(248,113,113,0.14)]">
                <Trash2 className="h-4 w-4 fill-red-500/25 stroke-[2.4]" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-stone-100">Excluir erro #{report.human_id}?</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Essa acao remove o registro do banco. Depois de confirmar, nao da para recuperar por esta tela.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                className={ghostButtonClass}
                disabled={isPending}
                type="button"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancelar
              </button>
              <button
                className="h-10 cursor-pointer rounded-md border border-red-400/20 bg-red-500/15 px-4 text-sm font-medium text-red-100 transition hover:border-red-300/35 hover:bg-red-500/20 hover:shadow-[0_0_22px_rgba(248,113,113,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                type="button"
                onClick={handleDelete}
              >
                {isPending ? "Excluindo" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
