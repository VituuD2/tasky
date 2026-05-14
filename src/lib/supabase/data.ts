import { createClient } from "@/lib/supabase/server";
import type {
  ErrorReportWithRelations,
  ExportFilters,
  OptionType,
  Profile,
  SelectOption,
  TableLayoutSetting,
} from "@/types/tasky";

const ERROR_REPORT_SELECT = `
  *,
  responsible_profile:profiles!error_reports_responsible_profile_id_fkey(id,email,full_name),
  reported_by_profile:profiles!error_reports_reported_by_profile_id_fkey(id,email,full_name),
  created_by_profile:profiles!error_reports_created_by_fkey(id,email,full_name),
  attachments(*)
`;

export async function listSelectOptions(types?: OptionType[]) {
  const supabase = await createClient();
  let query = supabase
    .from("select_options")
    .select("*")
    .order("type", { ascending: true })
    .order("sort_order", { ascending: true });

  if (types?.length) {
    query = query.in("type", types);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data as SelectOption[];
}

export async function listProfiles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true })
    .order("email", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile[];
}

export async function listLayoutSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("table_layout_settings")
    .select("*")
    .eq("table_name", "error_reports")
    .order("position", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as TableLayoutSetting[];
}

export async function listErrorReports(filters: ExportFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("error_reports")
    .select(ERROR_REPORT_SELECT)
    .order("created_at", { ascending: false });

  if (filters.errorDateFrom) {
    query = query.gte("error_date", filters.errorDateFrom);
  }

  if (filters.errorDateTo) {
    query = query.lte("error_date", filters.errorDateTo);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.affectedArea) {
    query = query.eq("affected_area", filters.affectedArea);
  }

  if (filters.severity) {
    query = query.eq("severity", filters.severity);
  }

  if (filters.responsibleProfileId) {
    query = query.eq("responsible_profile_id", filters.responsibleProfileId);
  }

  if (filters.errorType) {
    query = query.eq("error_type", filters.errorType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data as unknown as ErrorReportWithRelations[];
}
