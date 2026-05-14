"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import { toOptionValue } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, OptionType } from "@/types/tasky";

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
    return { ok: false, message: "Label obrigatorio." };
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
    return { ok: false, message: "Role invalida." };
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
      return { ok: false, message: "Nao e possivel remover o ultimo admin." };
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

export async function updateColumnWidth(columnId: string, width: number): Promise<ActionResult> {
  const { user } = await requireAdmin();
  const supabase = await createClient();
  const normalizedWidth = Math.min(Math.max(Math.round(width), 80), 640);

  const { error } = await supabase
    .from("table_layout_settings")
    .update({ width: normalizedWidth, updated_by: user.id })
    .eq("id", columnId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  return { ok: true, message: "Largura atualizada." };
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
