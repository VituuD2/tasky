"use client";

import { GripVertical, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { formatCurrency, formatDate, formatPersonName } from "@/lib/format";
import { buildOptionMap } from "@/lib/options";
import type {
  CustomField,
  CustomFieldOption,
  ErrorReportWithRelations,
  Profile,
  SelectOption,
  TableLayoutSetting,
} from "@/types/tasky";
import { EmptyState, buttonClass } from "@/components/ui";
import { ErrorReportModal } from "@/components/error-report-modal";
import { OptionTag } from "@/components/option-tag";
import { reorderColumns, updateColumnWidth } from "@/app/actions/admin";
import { getDatabaseSnapshot } from "@/app/actions/error-reports";
import { isAdmin } from "@/lib/permissions";
import { CustomFieldMenu } from "@/components/custom-field-menu";
import { ColumnSettingsMenu, type DisplayColumn } from "@/components/column-settings-menu";

type DatabaseViewProps = {
  reports: ErrorReportWithRelations[];
  options: SelectOption[];
  profiles: Profile[];
  layout: TableLayoutSetting[];
  customFields: CustomField[];
  customFieldOptions: CustomFieldOption[];
  profile: Profile | null;
};



function cellValue(report: ErrorReportWithRelations, key: string, optionMap: Map<string, SelectOption>) {
  switch (key) {
    case "human_id":
      return `#${report.human_id}`;
    case "title":
      return report.title;
    case "affected_area":
      return <OptionTag optionMap={optionMap} type="affected_area" value={report.affected_area} />;
    case "error_type":
      return <OptionTag optionMap={optionMap} type="error_type" value={report.error_type} />;
    case "severity":
      return <OptionTag optionMap={optionMap} type="severity" value={report.severity} />;
    case "financial_impact":
      return formatCurrency(report.financial_impact) || "-";
    case "status":
      return <OptionTag optionMap={optionMap} type="status" value={report.status} />;
    case "responsible_profile_id":
      return formatPersonName(report.responsible_profile?.full_name, report.responsible_profile?.email) || "-";
    case "reported_by":
      return (
        formatPersonName(report.reported_by_profile?.full_name, report.reported_by_profile?.email) ||
        report.reported_by_name ||
        "-"
      );
    case "opened_at":
      return formatDate(report.opened_at) || "-";
    case "resolved_at":
      return formatDate(report.resolved_at) || "-";
    default:
      return "-";
  }
}

function customCellValue(
  report: ErrorReportWithRelations,
  field: CustomField,
  options: CustomFieldOption[],
  profiles: Profile[],
) {
  const value = report.custom_field_values.find((fieldValue) => fieldValue.field_id === field.id)?.value;

  if (!value) {
    return "-";
  }

  if (field.field_type === "checkbox") {
    return value === "true" ? "Sim" : "Nao";
  }

  if (field.field_type === "date") {
    return formatDate(value) || value;
  }

  if (field.field_type === "person") {
    const profile = profiles.find((item) => item.id === value);
    return formatPersonName(profile?.full_name, profile?.email) || "-";
  }

  if (field.field_type === "select" || field.field_type === "status") {
    return options.find((option) => option.field_id === field.id && option.value === value)?.label ?? value;
  }

  return value;
}

export function DatabaseView({
  reports,
  options,
  profiles,
  layout,
  customFields,
  customFieldOptions,
  profile,
}: DatabaseViewProps) {
  const [currentReports, setCurrentReports] = useState(reports);
  const [currentOptions, setCurrentOptions] = useState(options);
  const [currentProfiles, setCurrentProfiles] = useState(profiles);
  const [currentLayout, setCurrentLayout] = useState(layout);
  const [currentCustomFields, setCurrentCustomFields] = useState(customFields);
  const [currentCustomFieldOptions, setCurrentCustomFieldOptions] = useState(customFieldOptions);
  const [openReport, setOpenReport] = useState<ErrorReportWithRelations | null | "new">(null);
  const [activeSettingsColumn, setActiveSettingsColumn] = useState<DisplayColumn | null>(null);
  const [settingsAnchorElement, setSettingsAnchorElement] = useState<HTMLElement | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const [columnWidths, setColumnWidths] = useState(() => new Map(currentLayout.map((column) => [column.id, column.width])));
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionMap = useMemo(() => buildOptionMap(currentOptions), [currentOptions]);
  const hasAdminAccess = isAdmin(profile);
  const visibleColumns: DisplayColumn[] = [
    ...currentLayout
      .filter((column) => column.visible)
      .map((column) => ({
        kind: "standard" as const,
        id: column.id,
        key: column.column_key,
        label: column.column_label,
        width: column.width,
        position: column.position,
      })),
    ...currentCustomFields.map((field) => ({
      kind: "custom" as const,
      id: field.id,
      key: field.field_key,
      label: field.label,
      width: field.width,
      position: field.position,
      field,
    })),
  ].sort((a, b) => a.position - b.position);
  const gridTemplateColumns = [
    ...visibleColumns.map((column) => `${columnWidths.get(column.id) ?? column.width}px`),
    ...(hasAdminAccess ? ["52px"] : []),
  ].join(" ");

  function startResize(event: ReactPointerEvent<HTMLDivElement>, column: DisplayColumn) {
    if (!hasAdminAccess) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = columnWidths.get(column.id) ?? column.width;

    function handleMove(moveEvent: PointerEvent) {
      const nextWidth = Math.min(Math.max(startWidth + moveEvent.clientX - startX, 80), 640);
      setColumnWidths((current) => new Map(current).set(column.id, nextWidth));
    }

    function handleUp(upEvent: PointerEvent) {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      const nextWidth = Math.min(Math.max(startWidth + upEvent.clientX - startX, 80), 640);
      void updateColumnWidth(column.id, nextWidth, column.kind);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  async function refreshData() {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }

    setIsRefreshing(true);
    setRefreshMessage("");

    const result = await getDatabaseSnapshot();

    if (result.ok) {
      setCurrentReports(result.reports);
      setCurrentOptions(result.options);
      setCurrentProfiles(result.profiles);
      setCurrentLayout(result.layout);
      setCurrentCustomFields(result.customFields);
      setCurrentCustomFieldOptions(result.customFieldOptions);
      setColumnWidths((current) => {
        const next = new Map(current);

        for (const column of result.layout) {
          if (!next.has(column.id)) {
            next.set(column.id, column.width);
          }
        }

        for (const field of result.customFields) {
          if (!next.has(field.id)) {
            next.set(field.id, field.width);
          }
        }

        return next;
      });
    }

    refreshTimeoutRef.current = setTimeout(() => {
      setIsRefreshing(false);
      setRefreshMessage(result.message);

      messageTimeoutRef.current = setTimeout(() => {
        setRefreshMessage("");
      }, 2600);
    }, 350);
  }

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);



  function moveColumn(targetId: string) {
    if (!draggingColumnId || draggingColumnId === targetId) {
      return;
    }

    const from = visibleColumns.findIndex((column) => column.id === draggingColumnId);
    const to = visibleColumns.findIndex((column) => column.id === targetId);

    if (from < 0 || to < 0) {
      return;
    }

    const nextColumns = [...visibleColumns];
    const [moved] = nextColumns.splice(from, 1);
    nextColumns.splice(to, 0, moved);
    const nextPositions = nextColumns.map((column, index) => ({ ...column, position: (index + 1) * 10 }));

    setCurrentLayout((current) =>
      current.map((column) => {
        const next = nextPositions.find((item) => item.kind === "standard" && item.id === column.id);
        return next ? { ...column, position: next.position } : column;
      }),
    );
    setCurrentCustomFields((current) =>
      current.map((field) => {
        const next = nextPositions.find((item) => item.kind === "custom" && item.id === field.id);
        return next ? { ...field, position: next.position } : field;
      }),
    );
    void reorderColumns(nextPositions.map((column) => ({ kind: column.kind, id: column.id, position: column.position })));
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Catálogo de erros</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Database</h1>
          <p className="mt-2 text-sm text-zinc-400">{currentReports.length} registros visíveis</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {refreshMessage ? (
            <span className="rounded border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
              {refreshMessage}
            </span>
          ) : null}
          <button
            aria-label="Atualizar dados"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.035] text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-stone-100 hover:shadow-[0_0_18px_rgba(244,241,234,0.1)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isRefreshing}
            type="button"
            onClick={refreshData}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button className={buttonClass} onClick={() => setOpenReport("new")} type="button">
            Novo erro
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-white/10 bg-[#111113] shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
        {visibleColumns.length ? (
          <div className="min-w-fit">
            <div
              className="grid border-b border-white/10 text-xs uppercase tracking-[0.14em] text-zinc-500"
              style={{ gridTemplateColumns }}
            >
              {visibleColumns.map((column) => (
                <div
                  key={column.id}
                  className={
                    hasAdminAccess
                      ? "relative flex cursor-grab items-center gap-1 border-r border-white/10 px-3 py-3 active:cursor-grabbing last:border-r-0"
                      : "relative flex items-center gap-1 border-r border-white/10 px-3 py-3 last:border-r-0"
                  }
                  draggable={hasAdminAccess}
                  onDragStart={() => setDraggingColumnId(column.id)}
                  onDragEnd={() => setDraggingColumnId(null)}
                  onDragOver={(event) => {
                    if (hasAdminAccess) {
                      event.preventDefault();
                    }
                  }}
                  onDrop={() => moveColumn(column.id)}
                >
                  {hasAdminAccess ? (
                    <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-zinc-600 active:cursor-grabbing" />
                  ) : null}
                  <button
                    className="min-w-0 max-w-full truncate text-left focus:outline-none"
                    disabled={!hasAdminAccess}
                    type="button"
                    onDoubleClick={(event) => {
                      if (!hasAdminAccess) {
                        return;
                      }
                      setActiveSettingsColumn(column);
                      setSettingsAnchorElement(event.currentTarget as HTMLElement);
                    }}
                  >
                    <span className="truncate">{column.label}</span>
                  </button>
                  {hasAdminAccess ? (
                    <div
                      aria-label={`Redimensionar ${column.label}`}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none transition hover:bg-stone-300/30"
                      role="separator"
                      onPointerDown={(event) => startResize(event, column)}
                    />
                  ) : null}
                </div>
              ))}
              {hasAdminAccess ? <CustomFieldMenu onCreated={refreshData} /> : null}
            </div>

            {currentReports.length ? (
              currentReports.map((report) => (
                <button
                  key={report.id}
                  className="grid w-full cursor-pointer border-b border-white/5 text-left text-sm text-zinc-300 transition hover:bg-white/[0.035] last:border-b-0"
                  style={{ gridTemplateColumns }}
                  type="button"
                  onClick={() => setOpenReport(report)}
                >
                  {visibleColumns.map((column) => (
                    <div key={column.id} className="min-w-0 border-r border-white/5 px-3 py-3 last:border-r-0">
                      <div className="truncate">
                        {column.kind === "custom"
                          ? customCellValue(report, column.field, currentCustomFieldOptions, currentProfiles)
                          : cellValue(report, column.key, optionMap)}
                      </div>
                    </div>
                  ))}
                </button>
              ))
            ) : (
              <div className="p-4">
            <EmptyState title="Nenhum erro cadastrado" description="Crie o primeiro registro para iniciar o catálogo." />
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            <EmptyState title="Sem colunas visíveis" description="Um admin pode reativar colunas nas configurações." />
          </div>
        )}
      </div>

      {openReport ? (
        <ErrorReportModal
          report={openReport === "new" ? null : openReport}
          options={currentOptions}
          profiles={currentProfiles}
          customFields={currentCustomFields}
          customFieldOptions={currentCustomFieldOptions}
          layout={currentLayout}
          profile={profile}
          canManageOptions={hasAdminAccess}
          onClose={() => setOpenReport(null)}
          onDataChange={refreshData}
        />
      ) : null}

      {activeSettingsColumn && settingsAnchorElement ? (
        <ColumnSettingsMenu
          column={activeSettingsColumn}
          anchorElement={settingsAnchorElement}
          customFieldOptions={currentCustomFieldOptions}
          selectOptions={currentOptions}
          profiles={currentProfiles}
          onClose={() => {
            setActiveSettingsColumn(null);
            setSettingsAnchorElement(null);
          }}
          onChanged={refreshData}
        />
      ) : null}
    </>
  );
}
