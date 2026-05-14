"use client";

import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { formatCurrency, formatDate, formatPersonName } from "@/lib/format";
import { buildOptionMap } from "@/lib/options";
import type { ErrorReportWithRelations, Profile, SelectOption, TableLayoutSetting } from "@/types/tasky";
import { EmptyState, buttonClass } from "@/components/ui";
import { ErrorReportModal } from "@/components/error-report-modal";
import { OptionTag } from "@/components/option-tag";
import { updateColumnWidth } from "@/app/actions/admin";
import { isAdmin } from "@/lib/permissions";

type DatabaseViewProps = {
  reports: ErrorReportWithRelations[];
  options: SelectOption[];
  profiles: Profile[];
  layout: TableLayoutSetting[];
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

export function DatabaseView({ reports, options, profiles, layout, profile }: DatabaseViewProps) {
  const [openReport, setOpenReport] = useState<ErrorReportWithRelations | null | "new">(null);
  const [columnWidths, setColumnWidths] = useState(() => new Map(layout.map((column) => [column.id, column.width])));
  const optionMap = useMemo(() => buildOptionMap(options), [options]);
  const hasAdminAccess = isAdmin(profile);
  const visibleColumns = layout.filter((column) => column.visible).sort((a, b) => a.position - b.position);
  const gridTemplateColumns = visibleColumns.map((column) => `${columnWidths.get(column.id) ?? column.width}px`).join(" ");

  function startResize(event: ReactPointerEvent<HTMLDivElement>, column: TableLayoutSetting) {
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
      void updateColumnWidth(column.id, nextWidth);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Catálogo de erros</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Database</h1>
          <p className="mt-2 text-sm text-zinc-400">{reports.length} registros visíveis</p>
        </div>
        <button className={buttonClass} onClick={() => setOpenReport("new")} type="button">
          Novo erro
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-white/10 bg-[#111113] shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
        {visibleColumns.length ? (
          <div className="min-w-fit">
            <div
              className="grid border-b border-white/10 text-xs uppercase tracking-[0.14em] text-zinc-500"
              style={{ gridTemplateColumns }}
            >
              {visibleColumns.map((column) => (
                <div key={column.id} className="relative border-r border-white/10 px-3 py-3 last:border-r-0">
                  {column.column_label}
                  {hasAdminAccess ? (
                    <div
                      aria-label={`Redimensionar ${column.column_label}`}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none transition hover:bg-stone-300/30"
                      role="separator"
                      onPointerDown={(event) => startResize(event, column)}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            {reports.length ? (
              reports.map((report) => (
                <button
                  key={report.id}
                  className="grid w-full cursor-pointer border-b border-white/5 text-left text-sm text-zinc-300 transition hover:bg-white/[0.035] last:border-b-0"
                  style={{ gridTemplateColumns }}
                  type="button"
                  onClick={() => setOpenReport(report)}
                >
                  {visibleColumns.map((column) => (
                    <div key={column.id} className="min-w-0 border-r border-white/5 px-3 py-3 last:border-r-0">
                      <div className="truncate">{cellValue(report, column.column_key, optionMap)}</div>
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
          options={options}
          profiles={profiles}
          canManageOptions={hasAdminAccess}
          onClose={() => setOpenReport(null)}
        />
      ) : null}
    </>
  );
}
