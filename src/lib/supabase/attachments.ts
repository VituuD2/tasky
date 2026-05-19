import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ATTACHMENT_BUCKET,
  getAttachmentKind,
  isAllowedAttachmentFile,
  safeAttachmentFileName,
} from "@/lib/attachments";
import { isAdmin } from "@/lib/permissions";
import type { Database } from "@/types/database";
import type { Attachment, AttachmentInsert, Profile } from "@/types/tasky";

type TaskySupabaseClient = SupabaseClient<Database>;

export type AttachmentResult = {
  ok: boolean;
  message: string;
  attachment?: Attachment;
};

export async function canEditErrorReport(
  supabase: TaskySupabaseClient,
  reportId: string,
  userId: string,
  profile: Profile | null,
) {
  if (!reportId) {
    return false;
  }

  if (isAdmin(profile)) {
    return true;
  }

  const { data, error } = await supabase.from("error_reports").select("created_by").eq("id", reportId).maybeSingle();

  if (error || !data) {
    return false;
  }

  return data.created_by === userId;
}

export async function createExternalAttachmentForReport(
  supabase: TaskySupabaseClient,
  reportId: string,
  userId: string,
  profile: Profile | null,
  rawUrl: string,
): Promise<AttachmentResult> {
  const externalUrl = rawUrl.trim();

  if (!externalUrl) {
    return { ok: false, message: "Informe o link." };
  }

  try {
    new URL(externalUrl);
  } catch {
    return { ok: false, message: "Link invalido." };
  }

  const canEdit = await canEditErrorReport(supabase, reportId, userId, profile);

  if (!canEdit) {
    return { ok: false, message: "Sem permissao para anexar neste erro." };
  }

  const payload: AttachmentInsert = {
    error_report_id: reportId,
    external_url: externalUrl,
    file_name: externalUrl,
    kind: "link",
    created_by: userId,
  };
  const { data, error } = await supabase.from("attachments").insert(payload).select("*").single();

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Link anexado.", attachment: data };
}

export async function createFileAttachmentForReport(
  supabase: TaskySupabaseClient,
  reportId: string,
  userId: string,
  profile: Profile | null,
  file: File,
): Promise<AttachmentResult> {
  const canEdit = await canEditErrorReport(supabase, reportId, userId, profile);

  if (!canEdit) {
    return { ok: false, message: "Sem permissao para anexar neste erro." };
  }

  if (!isAllowedAttachmentFile(file)) {
    return { ok: false, message: "Arquivo invalido. Use PNG, JPG, WEBP ou PDF ate 10MB." };
  }

  const attachmentId = crypto.randomUUID();
  const safeName = safeAttachmentFileName(file.name || "print.png");
  const storagePath = `error-reports/${reportId}/${attachmentId}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return { ok: false, message: uploadError.message };
  }

  const payload: AttachmentInsert = {
    id: attachmentId,
    error_report_id: reportId,
    storage_bucket: ATTACHMENT_BUCKET,
    storage_path: storagePath,
    file_name: file.name || safeName,
    file_size: file.size,
    mime_type: file.type,
    kind: getAttachmentKind(file.type),
    created_by: userId,
  };
  const { data, error } = await supabase.from("attachments").insert(payload).select("*").single();

  if (error) {
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([storagePath]);
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Arquivo anexado.", attachment: data };
}
