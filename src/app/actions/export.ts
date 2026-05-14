"use server";

import { requireUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { formatCurrency, formatDate, formatPersonName, parseBrazilianDate } from "@/lib/format";
import { buildOptionMap, getOptionLabel } from "@/lib/options";
import { listErrorReports, listSelectOptions } from "@/lib/supabase/data";
import type { ExportFilters } from "@/types/tasky";

type ExportFormat = "csv" | "json";

export type ExportResult = {
  ok: boolean;
  fileName?: string;
  mimeType?: string;
  content?: string;
  message: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseFilters(formData: FormData): ExportFilters | { error: string } {
  const fromRaw = getString(formData, "error_date_from");
  const toRaw = getString(formData, "error_date_to");
  const errorDateFrom = fromRaw ? parseBrazilianDate(fromRaw) : undefined;
  const errorDateTo = toRaw ? parseBrazilianDate(toRaw) : undefined;

  if (fromRaw && !errorDateFrom) {
    return { error: "Período inicial inválido. Use dd/mm/aaaa." };
  }

  if (toRaw && !errorDateTo) {
    return { error: "Período final inválido. Use dd/mm/aaaa." };
  }

  if (errorDateFrom && errorDateTo && errorDateTo < errorDateFrom) {
    return { error: "O período final não pode ser anterior ao inicial." };
  }

  return {
    errorDateFrom: errorDateFrom ?? undefined,
    errorDateTo: errorDateTo ?? undefined,
    status: getString(formData, "status") || undefined,
    affectedArea: getString(formData, "affected_area") || undefined,
    severity: getString(formData, "severity") || undefined,
    responsibleProfileId: getString(formData, "responsible_profile_id") || undefined,
    errorType: getString(formData, "error_type") || undefined,
  };
}

export async function exportReports(formData: FormData): Promise<ExportResult> {
  await requireUser();

  const format = getString(formData, "format") as ExportFormat;
  if (format !== "csv" && format !== "json") {
    return { ok: false, message: "Formato de exportação inválido." };
  }

  const filters = parseFilters(formData);
  if ("error" in filters) {
    return { ok: false, message: filters.error };
  }

  try {
    const [reports, options] = await Promise.all([listErrorReports(filters), listSelectOptions()]);
    const optionMap = buildOptionMap(options);

    const rows = reports.map((report) => {
      const responsibleName = formatPersonName(
        report.responsible_profile?.full_name,
        report.responsible_profile?.email,
      );
      const reportedByName =
        formatPersonName(report.reported_by_profile?.full_name, report.reported_by_profile?.email) ||
        report.reported_by_name ||
        "";

      return {
        id: report.human_id,
        uuid: report.id,
        titulo: report.title,
        descricao: report.description ?? "",
        data_do_erro: formatDate(report.error_date),
        area_afetada: getOptionLabel(optionMap, "affected_area", report.affected_area),
        tipo_de_erro: getOptionLabel(optionMap, "error_type", report.error_type),
        severidade: getOptionLabel(optionMap, "severity", report.severity),
        impacto_financeiro_numero: report.financial_impact,
        impacto_financeiro_formatado: formatCurrency(report.financial_impact),
        status: getOptionLabel(optionMap, "status", report.status),
        responsavel: responsibleName,
        aberto_em: formatDate(report.opened_at),
        resolvido_em: formatDate(report.resolved_at),
        ja_aconteceu: report.happened_before === null ? "" : report.happened_before ? "Sim" : "Nao",
        acao_corretiva: report.corrective_action ?? "",
        reportado_por: reportedByName,
        criado_por: formatPersonName(report.created_by_profile?.full_name, report.created_by_profile?.email),
        criado_em: report.created_at,
        atualizado_em: report.updated_at,
        anexos: report.attachments.map((attachment) => ({
          nome: attachment.file_name,
          url: attachment.file_url ?? attachment.external_url,
          tipo: attachment.mime_type,
        })),
      };
    });

    if (format === "json") {
      return {
        ok: true,
        fileName: "tasky-error-reports.json",
        mimeType: "application/json",
        content: JSON.stringify({ exported_at: new Date().toISOString(), total: rows.length, data: rows }, null, 2),
        message: `${rows.length} registros exportados.`,
      };
    }

    const headers = [
      "ID",
      "UUID",
      "Titulo",
      "Descrição",
      "Data do erro",
      "Area afetada",
      "Tipo de erro",
      "Severidade",
      "Impacto financeiro",
      "Impacto financeiro formatado",
      "Status",
      "Responsavel",
      "Aberto em",
      "Resolvido em",
      "Já aconteceu",
      "Ação corretiva",
      "Reportado por",
      "Criado por",
      "Criado em",
      "Atualizado em",
      "Anexos",
    ];

    const csvRows = rows.map((row) => [
      row.id,
      row.uuid,
      row.titulo,
      row.descricao,
      row.data_do_erro,
      row.area_afetada,
      row.tipo_de_erro,
      row.severidade,
      row.impacto_financeiro_numero,
      row.impacto_financeiro_formatado,
      row.status,
      row.responsavel,
      row.aberto_em,
      row.resolvido_em,
      row.ja_aconteceu,
      row.acao_corretiva,
      row.reportado_por,
      row.criado_por,
      row.criado_em,
      row.atualizado_em,
      row.anexos.map((attachment) => attachment.url).filter(Boolean).join(" | "),
    ]);

    return {
      ok: true,
      fileName: "tasky-error-reports.csv",
      mimeType: "text/csv;charset=utf-8",
      content: toCsv(headers, csvRows),
      message: `${rows.length} registros exportados.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao exportar.",
    };
  }
}
