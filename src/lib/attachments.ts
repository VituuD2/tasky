import type { AttachmentKind } from "@/types/tasky";

export const ATTACHMENT_BUCKET = "tasky-attachments";
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);

export function getAttachmentKind(mimeType: string | null | undefined, externalUrl?: string | null): AttachmentKind {
  if (externalUrl) {
    return "link";
  }

  return mimeType?.startsWith("image/") ? "image" : "file";
}

export function isAllowedAttachmentFile(file: File) {
  return file.size > 0 && file.size <= MAX_ATTACHMENT_SIZE && ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type);
}

export function formatAttachmentSize(size: number | null | undefined) {
  if (!size) {
    return "";
  }

  if (size < 1024 * 1024) {
    return `${Math.ceil(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function safeAttachmentFileName(name: string) {
  const fallback = "anexo";
  const sanitized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return sanitized || fallback;
}
