"use server";

import { revalidatePath } from "next/cache";
import { ATTACHMENT_BUCKET } from "@/lib/attachments";
import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import {
  createExternalAttachmentForReport,
  createFileAttachmentForReport,
} from "@/lib/supabase/attachments";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Attachment } from "@/types/tasky";

export type AttachmentMutationResult = ActionResult & {
  attachment?: Attachment;
};

export type AttachmentUrlResult = ActionResult & {
  url?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

export async function addAttachment(formData: FormData): Promise<AttachmentMutationResult> {
  const { user, profile } = await requireUser();
  const supabase = await createClient();
  const reportId = getString(formData, "error_report_id");
  const externalUrl = getString(formData, "external_url");
  const file = getOptionalFile(formData, "attachment_file");

  if (!reportId) {
    return { ok: false, message: "Salve o erro antes de anexar." };
  }

  if (externalUrl) {
    const result = await createExternalAttachmentForReport(supabase, reportId, user.id, profile, externalUrl);
    revalidatePath("/");
    return result;
  }

  if (file) {
    const result = await createFileAttachmentForReport(supabase, reportId, user.id, profile, file);
    revalidatePath("/");
    return result;
  }

  return { ok: false, message: "Selecione um arquivo ou informe um link." };
}

export async function getAttachmentUrl(id: string): Promise<AttachmentUrlResult> {
  await requireUser();
  const supabase = await createClient();
  const { data: attachment, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }

  if (!attachment) {
    return { ok: false, message: "Anexo nao encontrado." };
  }

  if (attachment.external_url) {
    return { ok: true, message: "ok", url: attachment.external_url };
  }

  if (attachment.file_url) {
    return { ok: true, message: "ok", url: attachment.file_url };
  }

  if (!attachment.storage_path) {
    return { ok: false, message: "Arquivo sem caminho de armazenamento." };
  }

  const bucket = attachment.storage_bucket || ATTACHMENT_BUCKET;
  const { data, error: signedError } = await supabase.storage.from(bucket).createSignedUrl(attachment.storage_path, 300);

  if (signedError) {
    return { ok: false, message: signedError.message };
  }

  return { ok: true, message: "ok", url: data.signedUrl };
}

export async function removeAttachment(id: string): Promise<ActionResult> {
  const { user, profile } = await requireUser();
  const supabase = await createClient();
  const { data: attachment, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }

  if (!attachment) {
    return { ok: false, message: "Anexo nao encontrado." };
  }

  if (!isAdmin(profile) && attachment.created_by !== user.id) {
    return { ok: false, message: "Sem permissao para remover este anexo." };
  }

  const { error: updateError } = await supabase
    .from("attachments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  if (attachment.storage_path) {
    await supabase.storage.from(attachment.storage_bucket || ATTACHMENT_BUCKET).remove([attachment.storage_path]);
  }

  revalidatePath("/");
  return { ok: true, message: "Anexo removido." };
}
