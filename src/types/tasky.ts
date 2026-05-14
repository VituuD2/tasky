import type { Database } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ErrorReport = Database["public"]["Tables"]["error_reports"]["Row"];
export type ErrorReportInsert = Database["public"]["Tables"]["error_reports"]["Insert"];
export type ErrorReportUpdate = Database["public"]["Tables"]["error_reports"]["Update"];
export type Attachment = Database["public"]["Tables"]["attachments"]["Row"];
export type SelectOption = Database["public"]["Tables"]["select_options"]["Row"];
export type TableLayoutSetting = Database["public"]["Tables"]["table_layout_settings"]["Row"];
export type ReportedPerson = Database["public"]["Tables"]["reported_people"]["Row"];

export type OptionType = "affected_area" | "error_type" | "severity" | "status" | "happened_before";

export type ErrorReportWithRelations = ErrorReport & {
  responsible_profile: Pick<Profile, "id" | "email" | "full_name"> | null;
  reported_by_profile: Pick<Profile, "id" | "email" | "full_name"> | null;
  created_by_profile: Pick<Profile, "id" | "email" | "full_name"> | null;
  attachments: Attachment[];
};

export type ExportFilters = {
  errorDateFrom?: string;
  errorDateTo?: string;
  status?: string;
  affectedArea?: string;
  severity?: string;
  responsibleProfileId?: string;
  errorType?: string;
};

export type ActionResult = {
  ok: boolean;
  message: string;
};

export const OPTION_TYPE_LABELS: Record<OptionType, string> = {
  affected_area: "Area afetada",
  error_type: "Tipo de erro",
  severity: "Severidade/Impacto",
  status: "Status",
  happened_before: "Ja aconteceu",
};

export const MANAGED_OPTION_TYPES: OptionType[] = [
  "affected_area",
  "error_type",
  "severity",
  "status",
];
