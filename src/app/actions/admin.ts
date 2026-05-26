"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import { toOptionValue } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, CustomFieldType, OptionType } from "@/types/tasky";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string, fallback: number) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

export async function saveOption(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const id = getString(formData, "id");
  const type = getString(formData, "type") as OptionType;
  const label = getString(formData, "label");
  const color = getString(formData, "color") || "#8f949b";
  const sortOrder = getNumber(formData, "sort_order", 0);
  const isActive = formData.get("is_active") === "on";

  if (!label) {
    return { ok: false, message: "Nome obrigatório." };
  }

  const payload = {
    type,
    label,
    value: getString(formData, "value") || toOptionValue(label),
    color,
    sort_order: sortOrder,
    is_active: isActive,
  };

  const result = id
    ? await supabase.from("select_options").update(payload).eq("id", id)
    : await supabase.from("select_options").insert(payload);

  if (result.error) {
    return { ok: false, message: result.error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "Opcao salva." };
}

export async function updateProfileRole(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const profileId = getString(formData, "profile_id");
  const role = getString(formData, "role");

  if (role !== "admin" && role !== "user") {
    return { ok: false, message: "Permissão inválida." };
  }

  if (profileId === user.id && role === "user") {
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (countError) {
      return { ok: false, message: countError.message };
    }

    if ((count ?? 0) <= 1) {
      return { ok: false, message: "Não é possível remover o último admin." };
    }
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin");
  return { ok: true, message: "Role atualizada." };
}

export async function updateLayoutSetting(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const id = getString(formData, "id");

  const { error } = await supabase
    .from("table_layout_settings")
    .update({
      column_label: getString(formData, "column_label"),
      visible: formData.get("visible") === "on",
      width: getNumber(formData, "width", 160),
      position: getNumber(formData, "position", 0),
      updated_by: user.id,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "Layout atualizado." };
}

export async function updateColumnWidth(
  columnId: string,
  width: number,
  kind: "standard" | "custom" = "standard",
): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const normalizedWidth = Math.min(Math.max(Math.round(width), 80), 640);

  const result =
    kind === "standard"
      ? await supabase
          .from("table_layout_settings")
          .update({ width: normalizedWidth, updated_by: user.id })
          .eq("id", columnId)
      : await supabase.from("custom_fields").update({ width: normalizedWidth, updated_by: user.id }).eq("id", columnId);

  if (result.error) {
    return { ok: false, message: result.error.message };
  }

  revalidatePath("/");
  return { ok: true, message: "Largura atualizada." };
}

const CUSTOM_FIELD_TYPES = new Set(["text", "number", "select", "status", "date", "person", "checkbox", "url", "email"]);

export async function createCustomField(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const label = getString(formData, "label");
  const fieldType = getString(formData, "field_type") as CustomFieldType;
  const isRequired = formData.get("is_required") === "on";
  const visibilityRulesRaw = getString(formData, "visibility_rules");

  let visibilityRules = null;
  if (visibilityRulesRaw) {
    try {
      visibilityRules = JSON.parse(visibilityRulesRaw);
    } catch {
      return { ok: false, message: "Regras de visibilidade invalidas." };
    }
  }

  if (!label) {
    return { ok: false, message: "Nome obrigatorio." };
  }

  if (!CUSTOM_FIELD_TYPES.has(fieldType)) {
    return { ok: false, message: "Tipo de campo invalido." };
  }

  const { data: existingFields, error: fieldsError } = await supabase
    .from("custom_fields")
    .select("field_key,position")
    .eq("table_name", "error_reports");

  if (fieldsError) {
    return { ok: false, message: fieldsError.message };
  }

  const existingKeys = new Set((existingFields ?? []).map((field) => field.field_key));
  const baseKey = toOptionValue(label) || "campo";
  let fieldKey = baseKey;
  let suffix = 2;

  while (existingKeys.has(fieldKey)) {
    fieldKey = `${baseKey}_${suffix}`;
    suffix += 1;
  }

  const nextPosition = Math.max(1000, ...(existingFields ?? []).map((field) => field.position)) + 10;
  const { error } = await supabase.from("custom_fields").insert({
    table_name: "error_reports",
    label,
    field_key: fieldKey,
    field_type: fieldType,
    is_required: isRequired,
    position: nextPosition,
    visibility_rules: visibilityRules,
    created_by: user.id,
    updated_by: user.id,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  return { ok: true, message: "Campo criado." };
}

export async function updateColumnLabel(kind: "standard" | "custom", id: string, label: string): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const nextLabel = label.trim();

  if (!nextLabel) {
    return { ok: false, message: "Nome obrigatorio." };
  }

  const result =
    kind === "standard"
      ? await supabase
          .from("table_layout_settings")
          .update({ column_label: nextLabel, updated_by: user.id })
          .eq("id", id)
      : await supabase.from("custom_fields").update({ label: nextLabel, updated_by: user.id }).eq("id", id);

  if (result.error) {
    return { ok: false, message: result.error.message };
  }

  revalidatePath("/");
  return { ok: true, message: "Coluna renomeada." };
}

export async function reorderColumns(
  columns: Array<{ kind: "standard" | "custom"; id: string; position: number }>,
): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const supabase = await createClient();

  for (const column of columns) {
    const result =
      column.kind === "standard"
        ? await supabase
            .from("table_layout_settings")
            .update({ position: column.position, updated_by: user.id })
            .eq("id", column.id)
        : await supabase.from("custom_fields").update({ position: column.position, updated_by: user.id }).eq("id", column.id);

    if (result.error) {
      return { ok: false, message: result.error.message };
    }
  }

  revalidatePath("/");
  return { ok: true, message: "Ordem atualizada." };
}

export async function saveCustomFieldOption(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const id = getString(formData, "id");
  const fieldId = getString(formData, "field_id");
  const label = getString(formData, "label");
  const color = getString(formData, "color") || "#8f949b";
  const isActive = formData.get("is_active") === null ? true : formData.get("is_active") === "on";

  if (id) {
    const payload: {
      color: string;
      is_active: boolean;
      label?: string;
      value?: string;
    } = {
      color,
      is_active: isActive,
    };
    if (label) {
      payload.label = label;
      payload.value = getString(formData, "value") || toOptionValue(label);
    }
    const { error } = await supabase.from("custom_field_options").update(payload).eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }
    revalidatePath("/");
    return { ok: true, message: "Opcao atualizada." };
  } else {
    if (!fieldId || !label) {
      return { ok: false, message: "Opcao invalida." };
    }

    const { data: options, error: optionsError } = await supabase
      .from("custom_field_options")
      .select("sort_order")
      .eq("field_id", fieldId);

    if (optionsError) {
      return { ok: false, message: optionsError.message };
    }

    const { error } = await supabase.from("custom_field_options").insert({
      field_id: fieldId,
      label,
      value: getString(formData, "value") || toOptionValue(label),
      color,
      sort_order: Math.max(0, ...(options ?? []).map((option) => option.sort_order)) + 10,
      is_active: true,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath("/");
    return { ok: true, message: "Opcao criada." };
  }
}

export async function deleteCustomFieldOption(optionId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  if (!optionId) {
    return { ok: false, message: "Opção inválida." };
  }

  const { error } = await supabase.from("custom_field_options").delete().eq("id", optionId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  return { ok: true, message: "Opção excluída." };
}

export async function updateCustomField(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const id = getString(formData, "id");
  const label = getString(formData, "label");
  const fieldType = getString(formData, "field_type") as CustomFieldType;
  const isRequired = formData.get("is_required") === "on";
  const visibilityRulesRaw = getString(formData, "visibility_rules");

  if (!id) {
    return { ok: false, message: "ID do campo inválido." };
  }

  if (!label) {
    return { ok: false, message: "Nome obrigatorio." };
  }

  if (!CUSTOM_FIELD_TYPES.has(fieldType)) {
    return { ok: false, message: "Tipo de campo invalido." };
  }

  let visibilityRules = null;
  if (visibilityRulesRaw) {
    try {
      visibilityRules = JSON.parse(visibilityRulesRaw);
    } catch {
      return { ok: false, message: "Regras de visibilidade invalidas." };
    }
  }

  const { error } = await supabase
    .from("custom_fields")
    .update({
      label,
      field_type: fieldType,
      is_required: isRequired,
      visibility_rules: visibilityRules,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  return { ok: true, message: "Campo atualizado." };
}

export async function deleteCustomField(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  if (!id) {
    return { ok: false, message: "ID do campo inválido." };
  }

  const { error } = await supabase.from("custom_fields").delete().eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  return { ok: true, message: "Campo excluído." };
}

export async function resetLayoutSettings(): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const supabase = await createClient();

  const defaults = [
    ["human_id", "ID", 96, 10],
    ["title", "Titulo", 280, 20],
    ["affected_area", "Area afetada", 160, 30],
    ["error_type", "Tipo de erro", 160, 40],
    ["severity", "Severidade", 140, 50],
    ["financial_impact", "Impacto financeiro", 160, 60],
    ["status", "Status", 180, 70],
    ["responsible_profile_id", "Responsavel", 180, 80],
    ["reported_by", "Reportado por", 180, 90],
    ["opened_at", "Aberto em", 130, 100],
    ["resolved_at", "Resolvido em", 130, 110],
  ] as const;

  const { error } = await supabase.from("table_layout_settings").upsert(
    defaults.map(([columnKey, columnLabel, width, position]) => ({
      table_name: "error_reports",
      column_key: columnKey,
      column_label: columnLabel,
      visible: true,
      width,
      position,
      updated_by: user.id,
    })),
    { onConflict: "table_name,column_key" },
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "Layout resetado." };
}

export async function assertAdminAccess(): Promise<ActionResult> {
  await requireUser();
  return { ok: true, message: "ok" };
}
