"use client";

import { Clipboard, Download, ExternalLink, LinkIcon, Paperclip, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { addAttachment, getAttachmentUrl, removeAttachment } from "@/app/actions/attachments";
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  formatAttachmentSize,
  isAllowedAttachmentFile,
  MAX_ATTACHMENT_SIZE,
} from "@/lib/attachments";
import { isAdmin } from "@/lib/permissions";
import type { Attachment, Profile } from "@/types/tasky";
import { FieldLabel, StatusMessage, inputClass } from "@/components/ui";

type AttachmentsPanelProps = {
  reportId?: string;
  attachments: Attachment[];
  profile: Profile | null;
  onDataChange?: () => void;
};

function attachmentLabel(attachment: Attachment) {
  if (attachment.file_name) {
    return attachment.file_name;
  }

  if (attachment.external_url) {
    return attachment.external_url;
  }

  return "Anexo";
}

function acceptedTypesText() {
  return Array.from(ALLOWED_ATTACHMENT_MIME_TYPES)
    .map((type) => type.replace("image/", ".").replace("application/pdf", ".pdf"))
    .join(", ");
}

export function AttachmentsPanel({ reportId, attachments, profile, onDataChange }: AttachmentsPanelProps) {
  const [currentAttachments, setCurrentAttachments] = useState(() =>
    attachments.filter((attachment) => !attachment.deleted_at),
  );
  const [externalUrl, setExternalUrl] = useState("");
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const visibleAttachments = useMemo(
    () => currentAttachments.filter((attachment) => !attachment.deleted_at),
    [currentAttachments],
  );
  const canRemove = (attachment: Attachment) => isAdmin(profile) || attachment.created_by === profile?.id;

  useEffect(() => {
    let isMounted = true;
    const imageAttachments = visibleAttachments.filter(
      (attachment) => attachment.kind === "image" && !previewUrls[attachment.id],
    );

    if (!imageAttachments.length) {
      return;
    }

    imageAttachments.forEach((attachment) => {
      getAttachmentUrl(attachment.id).then((result) => {
        if (isMounted && result.ok && result.url) {
          setPreviewUrls((current) => ({ ...current, [attachment.id]: result.url ?? "" }));
        }
      });
    });

    return () => {
      isMounted = false;
    };
  }, [previewUrls, visibleAttachments]);

  function applyAttachment(attachment: Attachment) {
    setCurrentAttachments((current) => [attachment, ...current.filter((item) => item.id !== attachment.id)]);
    onDataChange?.();
  }

  function validateFile(file: File) {
    if (!isAllowedAttachmentFile(file)) {
      setMessage({
        text: `Arquivo bloqueado. Use PNG, JPG, WEBP ou PDF ate ${Math.round(MAX_ATTACHMENT_SIZE / 1024 / 1024)}MB.`,
        ok: false,
      });
      return false;
    }

    return true;
  }

  function uploadFile(file: File) {
    if (!reportId) {
      setMessage({ text: "Salve o erro antes de anexar arquivos.", ok: false });
      return;
    }

    if (!validateFile(file)) {
      return;
    }

    const formData = new FormData();
    formData.set("error_report_id", reportId);
    formData.set("attachment_file", file);
    setMessage(null);

    startTransition(async () => {
      const result = await addAttachment(formData);
      setMessage({ text: result.message, ok: result.ok });

      if (result.ok && result.attachment) {
        applyAttachment(result.attachment);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  }

  function addLink() {
    if (!reportId) {
      setMessage({ text: "Salve o erro para anexar links.", ok: false });
      return;
    }

    const formData = new FormData();
    formData.set("error_report_id", reportId);
    formData.set("external_url", externalUrl);
    setMessage(null);

    startTransition(async () => {
      const result = await addAttachment(formData);
      setMessage({ text: result.message, ok: result.ok });

      if (result.ok && result.attachment) {
        setExternalUrl("");
        applyAttachment(result.attachment);
      }
    });
  }

  function openAttachment(id: string, download = false) {
    const target = window.open("about:blank", "_blank", "noopener,noreferrer");

    startTransition(async () => {
      const result = await getAttachmentUrl(id, download);

      if (!result.ok || !result.url) {
        target?.close();
        setMessage({ text: result.message, ok: false });
        return;
      }

      if (target) {
        target.location.href = result.url;
      } else {
        window.location.href = result.url;
      }
    });
  }

  function deleteAttachment(id: string) {
    setMessage(null);

    startTransition(async () => {
      const result = await removeAttachment(id);
      setMessage({ text: result.message, ok: result.ok });

      if (result.ok) {
        setCurrentAttachments((current) => current.filter((attachment) => attachment.id !== id));
        onDataChange?.();
      }
    });
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));

    if (!imageItem) {
      return;
    }

    event.preventDefault();
    const file = imageItem.getAsFile();

    if (!file) {
      setMessage({ text: "Nao foi possivel ler a imagem colada.", ok: false });
      return;
    }

    const extension = file.type === "image/jpeg" ? "jpg" : file.type.replace("image/", "");
    const namedFile = new File([file], `print-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`, {
      type: file.type,
    });
    uploadFile(namedFile);
  }

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.025] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <FieldLabel>Evidencias</FieldLabel>
          <p className="text-xs text-zinc-500">Arquivos privados e links externos do erro.</p>
        </div>
        <span className="inline-flex w-fit items-center rounded border border-white/10 px-2 py-1 text-xs text-zinc-500">
          {visibleAttachments.length} anexos
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              className={inputClass}
              name={reportId ? undefined : "initial_attachment_url"}
              placeholder="https://..."
              value={reportId ? externalUrl : undefined}
              onChange={reportId ? (event) => setExternalUrl(event.target.value) : undefined}
            />
            {reportId ? (
              <button
                aria-label="Anexar link"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/10 text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                title="Anexar link"
                type="button"
                onClick={addLink}
              >
                <LinkIcon className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {!reportId ? <p className="text-xs text-zinc-500">O link sera anexado ao salvar.</p> : null}
        </div>

        <div
          className="rounded-md border border-dashed border-white/10 bg-black/10 px-3 py-3 text-sm text-zinc-400"
          onPaste={handlePaste}
          tabIndex={0}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="min-w-0 flex-1 text-sm text-zinc-400 file:mr-3 file:h-9 file:cursor-pointer file:rounded file:border file:border-white/10 file:bg-white/[0.04] file:px-3 file:text-sm file:text-zinc-200 hover:file:bg-white/[0.06]"
              name={reportId ? undefined : "initial_attachment_file"}
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (reportId && file) {
                  uploadFile(file);
                }

                if (!reportId && file) {
                  validateFile(file);
                }
              }}
            />
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <Upload className="h-3.5 w-3.5" />
              {acceptedTypesText()}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
            <Clipboard className="h-3.5 w-3.5" />
            {reportId ? "Cole um print aqui para anexar." : "Prints colados ficam disponiveis depois de salvar."}
          </p>
        </div>
      </div>

      {message ? <div className="mt-3"><StatusMessage message={message.text} tone={message.ok ? "success" : "error"} /></div> : null}

      {visibleAttachments.length ? (
        <div className="mt-4 space-y-3">
          {visibleAttachments.map((attachment) => (
            <div key={attachment.id} className="rounded-md border border-white/10 bg-black/10">
              {attachment.kind === "image" && previewUrls[attachment.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={attachmentLabel(attachment)}
                  className="max-h-72 w-full rounded-t-md border-b border-white/10 object-contain"
                  src={previewUrls[attachment.id]}
                />
              ) : null}

              <div className="grid gap-3 px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-stone-200">
                    {attachment.kind === "link" ? <LinkIcon className="h-4 w-4 shrink-0 text-zinc-500" /> : <Paperclip className="h-4 w-4 shrink-0 text-zinc-500" />}
                    <span className="truncate">{attachmentLabel(attachment)}</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {attachment.kind}
                    {attachment.mime_type ? ` - ${attachment.mime_type}` : ""}
                    {attachment.file_size ? ` - ${formatAttachmentSize(attachment.file_size)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    className="flex h-9 cursor-pointer items-center gap-1 rounded border border-white/10 px-2 text-xs text-zinc-300 hover:bg-white/[0.05]"
                    disabled={isPending}
                    type="button"
                    onClick={() => openAttachment(attachment.id)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Abrir
                  </button>
                  {attachment.kind !== "link" ? (
                    <button
                      className="flex h-9 cursor-pointer items-center gap-1 rounded border border-white/10 px-2 text-xs text-zinc-300 hover:bg-white/[0.05]"
                      disabled={isPending}
                      type="button"
                      onClick={() => openAttachment(attachment.id, true)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Baixar
                    </button>
                  ) : null}
                  {canRemove(attachment) ? (
                    <button
                      className="flex h-9 cursor-pointer items-center gap-1 rounded border border-red-400/15 px-2 text-xs text-red-100 hover:bg-red-500/10"
                      disabled={isPending}
                      type="button"
                      onClick={() => deleteAttachment(attachment.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-white/10 px-3 py-4 text-sm text-zinc-500">
          Nenhuma evidencia anexada.
        </div>
      )}
    </div>
  );
}
