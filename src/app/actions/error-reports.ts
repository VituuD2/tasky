"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import { parseBrazilianCurrency, parseBrazilianDate } from "@/lib/format";
import {
  createExternalAttachmentForReport,
  createFileAttachmentForReport,
} from "@/lib/supabase/attachments";
import {
  listCustomFieldOptions,
  listCustomFields,
  listErrorReports,
  listLayoutSettings,
  listProfiles,
  listSelectOptions,
} from "@/lib/supabase/data";
import { createClient } from "@/lib/supabase/server";
import type {
  ActionResult,
  ErrorReportInsert,
  ErrorReportUpdate,
  ErrorReportWithRelations,
  CustomField,
  CustomFieldOption,
  Profile,
  SelectOption,
  TableLayoutSetting,
} from "@/types/tasky";
import { parseVisibilityRules, evaluateVisibility } from "@/lib/visibility";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableString(value: string) {
  return value.length ? value : null;
}

function getOptionalFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
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
    return "Título obrigatório.";
  }

  if (!payload.affectedArea) {
    return "Área afetada obrigatória.";
  }

  if (!payload.errorType) {
    return "Tipo de erro obrigatório.";
  }

  if (!payload.severity) {
    return "Severidade obrigatória.";
  }

  if (!payload.status) {
    return "Status obrigatório.";
  }

  if (!payload.openedAt) {
    return "Data de abertura obrigatória.";
  }

  return null;
}

async function saveCustomFieldValues(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reportId: string,
  userId: string,
  formData: FormData,
  customFields: CustomField[],
  formValuesForVisibility: Record<string, string>,
) {
  for (const field of customFields) {
    const rules = parseVisibilityRules(field.visibility_rules);
    const isVisible = evaluateVisibility(rules, formValuesForVisibility);

    const value = isVisible ? nullableString(getString(formData, `custom_field_${field.id}`)) : null;

    const { error } = await supabase.from("custom_field_values").upsert(
      {
        error_report_id: reportId,
        field_id: field.id,
        value,
        updated_by: userId,
      },
      { onConflict: "error_report_id,field_id" },
    );

    if (error) {
      return error.message;
    }
  }

  return null;
}

export async function saveErrorReport(formData: FormData): Promise<ActionResult> {
  const { user, profile } = await requireUser();
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
  const customFields = await listCustomFields();

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
    return { ok: false, message: "Data de abertura inválida. Use dd/mm/aaaa." };
  }

  if (getString(formData, "error_date") && !errorDate) {
    return { ok: false, message: "Data do erro inválida. Use dd/mm/aaaa." };
  }

  if (getString(formData, "resolved_at") && !resolvedAt) {
    return { ok: false, message: "Data de resolução inválida. Use dd/mm/aaaa." };
  }

  if (financialImpactRaw && financialImpact === null) {
    return { ok: false, message: "Impacto financeiro inválido." };
  }

  if (openedAt && resolvedAt && resolvedAt < openedAt) {
    return { ok: false, message: "A data de resolução não pode ser anterior à abertura." };
  }

  const formValuesForVisibility = {
    affected_area: affectedArea,
    error_type: errorType,
    status: status,
  };

  for (const field of customFields) {
    const rules = parseVisibilityRules(field.visibility_rules);
    const isVisible = evaluateVisibility(rules, formValuesForVisibility);

    if (!isVisible) {
      continue;
    }

    const value = getString(formData, `custom_field_${field.id}`);

    if (field.is_required && !value) {
      return { ok: false, message: `${field.label} obrigatorio.` };
    }

    if (value && field.field_type === "number" && !Number.isFinite(Number(value.replace(",", ".")))) {
      return { ok: false, message: `${field.label} deve ser numero.` };
    }

    if (value && field.field_type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { ok: false, message: `${field.label} deve ser email valido.` };
    }

    if (value && field.field_type === "url") {
      try {
        new URL(value);
      } catch {
        return { ok: false, message: `${field.label} deve ser URL valida.` };
      }
    }
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

    const valuesError = await saveCustomFieldValues(
      supabase,
      id,
      user.id,
      formData,
      customFields,
      formValuesForVisibility,
    );

    if (valuesError) {
      return { ok: false, message: valuesError };
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

  const { data: inserted, error } = await supabase.from("error_reports").insert(payload).select("id").single();

  if (error) {
    return { ok: false, message: error.message };
  }

  const initialAttachmentLink = getString(formData, "initial_attachment_url");

  if (initialAttachmentLink) {
    const attachmentResult = await createExternalAttachmentForReport(
      supabase,
      inserted.id,
      user.id,
      profile,
      initialAttachmentLink,
    );

    if (!attachmentResult.ok) {
      return { ok: false, message: `Erro criado, mas o link nao foi anexado: ${attachmentResult.message}` };
    }
  }

  const failedFiles: string[] = [];

  for (let i = 0; ; i++) {
    const file = getOptionalFile(formData, `initial_attachment_file_${i}`);

    if (!file) {
      break;
    }

    const attachmentResult = await createFileAttachmentForReport(
      supabase,
      inserted.id,
      user.id,
      profile,
      file,
    );

    if (!attachmentResult.ok) {
      failedFiles.push(file.name);
    }
  }

  if (failedFiles.length) {
    return {
      ok: false,
      message: `Erro criado, mas ${failedFiles.length} arquivo(s) nao foram anexados: ${failedFiles.join(", ")}`,
    };
  }

  const valuesError = await saveCustomFieldValues(
    supabase,
    inserted.id,
    user.id,
    formData,
    customFields,
    formValuesForVisibility,
  );

  if (valuesError) {
    return { ok: false, message: valuesError };
  }

  revalidatePath("/");
  return { ok: true, message: "Erro criado." };
}

export async function deleteErrorReport(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  if (!id) {
    return { ok: false, message: "Erro nao encontrado." };
  }

  const { error } = await supabase.from("error_reports").delete().eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  return { ok: true, message: "Erro excluido." };
}

export async function getDatabaseSnapshot(): Promise<{
  ok: boolean;
  message: string;
  reports: ErrorReportWithRelations[];
  options: SelectOption[];
  profiles: Profile[];
  layout: TableLayoutSetting[];
  customFields: CustomField[];
  customFieldOptions: CustomFieldOption[];
}> {
  await requireUser();

  try {
    const [reports, options, profiles, layout, customFields, customFieldOptions] = await Promise.all([
      listErrorReports(),
      listSelectOptions(),
      listProfiles(),
      listLayoutSettings(),
      listCustomFields(),
      listCustomFieldOptions(),
    ]);

    return {
      ok: true,
      message: "Dados atualizados.",
      reports,
      options,
      profiles,
      layout,
      customFields,
      customFieldOptions,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao atualizar dados.",
      reports: [],
      options: [],
      profiles: [],
      layout: [],
      customFields: [],
      customFieldOptions: [],
    };
  }
}
