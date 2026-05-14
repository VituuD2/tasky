"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { parseBrazilianCurrency, parseBrazilianDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ErrorReportInsert, ErrorReportUpdate } from "@/types/tasky";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: string) {
  return value.length ? value : null;
}

function parseOptionalDate(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value ? parseBrazilianDate(value) : null;
}

function validateRequiredFields(payload: {
  title: string;
  affectedArea: string;
  errorType: string;
  severity: string;
  status: string;
  openedAt: string | null;
}) {
  if (!payload.title) {
    return "Titulo obrigatorio.";
  }

  if (!payload.affectedArea) {
    return "Area afetada obrigatoria.";
  }

  if (!payload.errorType) {
    return "Tipo de erro obrigatorio.";
  }

  if (!payload.severity) {
    return "Severidade obrigatoria.";
  }

  if (!payload.status) {
    return "Status obrigatorio.";
  }

  if (!payload.openedAt) {
    return "Data de abertura obrigatoria.";
  }

  return null;
}

export async function saveErrorReport(formData: FormData): Promise<ActionResult> {
  const { user } = await requireUser();
  const supabase = await createClient();

  const id = getString(formData, "id");
  const title = getString(formData, "title");
  const description = getString(formData, "description");
  const affectedArea = getString(formData, "affected_area");
  const errorType = getString(formData, "error_type");
  const severity = getString(formData, "severity");
  const status = getString(formData, "status");
  const openedAt = parseOptionalDate(formData, "opened_at");
  const errorDate = parseOptionalDate(formData, "error_date");
  const resolvedAt = parseOptionalDate(formData, "resolved_at");
  const financialImpactRaw = getString(formData, "financial_impact");
  const financialImpact = financialImpactRaw ? parseBrazilianCurrency(financialImpactRaw) : null;

  const requiredError = validateRequiredFields({
    title,
    affectedArea,
    errorType,
    severity,
    status,
    openedAt,
  });

  if (requiredError) {
    return { ok: false, message: requiredError };
  }

  if (getString(formData, "opened_at") && !openedAt) {
    return { ok: false, message: "Data de abertura invalida. Use dd/mm/aaaa." };
  }

  if (getString(formData, "error_date") && !errorDate) {
    return { ok: false, message: "Data do erro invalida. Use dd/mm/aaaa." };
  }

  if (getString(formData, "resolved_at") && !resolvedAt) {
    return { ok: false, message: "Data de resolucao invalida. Use dd/mm/aaaa." };
  }

  if (financialImpactRaw && financialImpact === null) {
    return { ok: false, message: "Impacto financeiro invalido." };
  }

  if (openedAt && resolvedAt && resolvedAt < openedAt) {
    return { ok: false, message: "Data de resolucao nao pode ser anterior a abertura." };
  }

  const basePayload = {
    title,
    description: nullableString(description),
    error_date: errorDate,
    affected_area: affectedArea,
    error_type: errorType,
    severity,
    financial_impact: financialImpact,
    status,
    responsible_profile_id: nullableString(getString(formData, "responsible_profile_id")),
    opened_at: openedAt,
    resolved_at: resolvedAt,
    happened_before: getString(formData, "happened_before")
      ? getString(formData, "happened_before") === "true"
      : null,
    corrective_action: nullableString(getString(formData, "corrective_action")),
    reported_by_profile_id: nullableString(getString(formData, "reported_by_profile_id")),
    reported_by_name: nullableString(getString(formData, "reported_by_name")),
  };

  if (!basePayload.reported_by_profile_id && !basePayload.reported_by_name) {
    basePayload.reported_by_profile_id = user.id;
  }

  if (id) {
    const payload: ErrorReportUpdate = basePayload;
    const { error } = await supabase.from("error_reports").update(payload).eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/");
    return { ok: true, message: "Erro atualizado." };
  }

  const payload: ErrorReportInsert = {
    ...basePayload,
    title,
    affected_area: affectedArea,
    error_type: errorType,
    severity,
    status,
    opened_at: openedAt,
    created_by: user.id,
  };

  const { error } = await supabase.from("error_reports").insert(payload);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  return { ok: true, message: "Erro criado." };
}
