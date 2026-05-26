"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  updateColumnLabel,
  updateCustomField,
  deleteCustomField,
  saveCustomFieldOption,
  deleteCustomFieldOption,
  saveOption,
} from "@/app/actions/admin";
import { customFieldTypes } from "@/components/custom-field-control";
import { ColorInput } from "@/components/color-input";
import { toOptionValue } from "@/lib/format";
import type { CustomField, CustomFieldOption, VisibilityRule, SelectOption, Profile } from "@/types/tasky";
import { Trash2, AlertCircle } from "lucide-react";

export type DisplayColumn =
  | { kind: "standard"; id: string; key: string; label: string; width: number; position: number }
  | { kind: "custom"; id: string; key: string; label: string; width: number; position: number; field: CustomField };

type ColumnSettingsMenuProps = {
  column: DisplayColumn;
  anchorElement: HTMLElement;
  customFieldOptions: CustomFieldOption[];
  selectOptions: SelectOption[];
  profiles: Profile[];
  onClose: () => void;
  onChanged: () => void;
};

export function ColumnSettingsMenu({
  column,
  anchorElement,
  customFieldOptions,
  selectOptions,
  profiles,
  onClose,
  onChanged,
}: ColumnSettingsMenuProps) {
  const [menuRect, setMenuRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const [label, setLabel] = useState(column.label);
  const [fieldType, setFieldType] = useState<string>(column.kind === "custom" ? column.field.field_type : "");
  const [isRequired, setIsRequired] = useState(column.kind === "custom" ? column.field.is_required : false);
  const [conditionalEnabled, setConditionalEnabled] = useState(
    column.kind === "custom" && column.field.visibility_rules
      ? (typeof column.field.visibility_rules === "string"
          ? JSON.parse(column.field.visibility_rules)
          : column.field.visibility_rules
        ).length > 0
      : false
  );
  const [rules, setRules] = useState<VisibilityRule[]>(() => {
    if (column.kind !== "custom" || !column.field.visibility_rules) return [];
    try {
      const parsed =
        typeof column.field.visibility_rules === "string"
          ? JSON.parse(column.field.visibility_rules)
          : column.field.visibility_rules;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [newOptionColor, setNewOptionColor] = useState("#8f949b");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  const isStandardSelect =
    column.kind === "standard" &&
    (column.key === "affected_area" ||
      column.key === "error_type" ||
      column.key === "severity" ||
      column.key === "status");

  // Options filtering for standard select fields
  const stdOptions = selectOptions
    .filter((opt) => opt.type === column.key && opt.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Position recalculation anchored to the header element
  useEffect(() => {
    function updatePosition() {
      const rect = anchorElement.getBoundingClientRect();
      if (!rect) return;

      const width = Math.min(320, window.innerWidth - 24);
      let left = rect.left;
      if (left + width > window.innerWidth - 12) {
        left = window.innerWidth - width - 12;
      }
      if (left < 12) {
        left = 12;
      }
      setMenuRect({
        left,
        top: rect.bottom + 8,
        width,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorElement]);

  // Click outside to close
  useEffect(() => {
    function closeOnOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target) && !anchorElement.contains(target)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("touchstart", closeOnOutside);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
    };
  }, [anchorElement, onClose]);

  // Add rule for conditional visibility
  const addRule = () => {
    setRules((current) => [...current, { field: "affected_area", operator: "equals", value: "" }]);
  };

  const removeRule = (index: number) => {
    setRules((current) => current.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, key: "field" | "value", val: string) => {
    setRules((current) => current.map((rule, i) => (i === index ? { ...rule, [key]: val } : rule)));
  };

  // Options filtering for dynamic select/status columns
  const options = customFieldOptions.filter((opt) => column.kind === "custom" && opt.field_id === column.id);

  // Submit main field configurations
  function handleSaveField() {
    if (!label.trim()) {
      setMessage("O nome é obrigatório.");
      return;
    }

    startTransition(async () => {
      let result;

      if (column.kind === "standard") {
        result = await updateColumnLabel("standard", column.id, label);
      } else {
        const formData = new FormData();
        formData.set("id", column.id);
        formData.set("label", label);
        formData.set("field_type", fieldType);
        if (isRequired) {
          formData.set("is_required", "on");
        }

        if (conditionalEnabled) {
          const activeRules = rules.filter((r) => r.value.trim() !== "");
          if (activeRules.length > 0) {
            formData.set("visibility_rules", JSON.stringify(activeRules));
          }
        } else {
          formData.set("visibility_rules", "[]");
        }

        result = await updateCustomField(formData);
      }

      if (result.ok) {
        onChanged();
        onClose();
      } else {
        setMessage(result.message);
      }
    });
  }

  // Delete dynamic field
  function handleDeleteField() {
    startTransition(async () => {
      const result = await deleteCustomField(column.id);
      if (result.ok) {
        onChanged();
        onClose();
      } else {
        setMessage(result.message);
        setConfirmingDelete(false);
      }
    });
  }

  // Create option inline for custom field
  function handleAddOption() {
    const trimmed = newOptionLabel.trim();
    if (!trimmed) return;

    const formData = new FormData();
    formData.set("field_id", column.id);
    formData.set("label", trimmed);
    formData.set("color", newOptionColor);

    startTransition(async () => {
      const result = await saveCustomFieldOption(formData);
      if (result.ok) {
        setNewOptionLabel("");
        onChanged();
      } else {
        setMessage(result.message);
      }
    });
  }

  // Update option inline for custom field
  function handleUpdateOption(optionId: string, patch: { label?: string; color?: string; is_active?: boolean }) {
    const formData = new FormData();
    formData.set("id", optionId);
    formData.set("field_id", column.id);
    if (patch.label !== undefined) formData.set("label", patch.label);
    if (patch.color !== undefined) formData.set("color", patch.color);
    if (patch.is_active !== undefined) {
      formData.set("is_active", patch.is_active ? "on" : "off");
    }

    startTransition(async () => {
      const result = await saveCustomFieldOption(formData);
      if (result.ok) {
        onChanged();
      } else {
        setMessage(result.message);
      }
    });
  }

  // Delete option inline for custom field
  function handleDeleteOption(optionId: string) {
    startTransition(async () => {
      const result = await deleteCustomFieldOption(optionId);
      if (result.ok) {
        onChanged();
      } else {
        setMessage(result.message);
      }
    });
  }

  // Create option inline for standard field
  function handleAddStandardOption() {
    const trimmed = newOptionLabel.trim();
    if (!trimmed) return;

    const valueForOption = toOptionValue(trimmed);
    const nextSortOrder =
      Math.max(0, ...selectOptions.filter((option) => option.type === column.key).map((option) => option.sort_order)) + 10;

    const formData = new FormData();
    formData.set("type", column.key);
    formData.set("label", trimmed);
    formData.set("value", valueForOption);
    formData.set("color", newOptionColor);
    formData.set("sort_order", String(nextSortOrder));
    formData.set("is_active", "on");

    startTransition(async () => {
      const result = await saveOption(formData);
      if (result.ok) {
        setNewOptionLabel("");
        onChanged();
      } else {
        setMessage(result.message);
      }
    });
  }

  // Update option inline for standard field
  function handleUpdateStandardOption(optionId: string, patch: { label?: string; color?: string; is_active?: boolean }) {
    const option = selectOptions.find((opt) => opt.id === optionId);
    if (!option) return;

    const formData = new FormData();
    formData.set("id", optionId);
    formData.set("type", option.type);
    formData.set("value", option.value);
    formData.set("label", patch.label !== undefined ? patch.label : option.label);
    formData.set("color", patch.color !== undefined ? patch.color : option.color);
    formData.set("sort_order", String(option.sort_order));

    if (patch.is_active !== undefined) {
      if (patch.is_active) {
        formData.set("is_active", "on");
      }
    } else if (option.is_active) {
      formData.set("is_active", "on");
    }

    startTransition(async () => {
      const result = await saveOption(formData);
      if (result.ok) {
        onChanged();
      } else {
        setMessage(result.message);
      }
    });
  }

  if (!menuRect) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[120] flex flex-col rounded-md border border-white/10 bg-[#161618] p-3 shadow-2xl space-y-3"
      style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width }}
    >
      <div className="border-b border-white/5 pb-2">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Configurar coluna
        </h4>
      </div>

      {confirmingDelete ? (
        <div className="rounded border border-red-500/15 bg-red-500/5 p-2.5 space-y-3">
          <div className="flex gap-2 text-red-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-5">
              Excluir permanentemente <strong>&ldquo;{column.label}&rdquo;</strong>? Isso removerá a coluna e todos os valores salvos nos erros.
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded bg-white/5 py-1.5 text-xs text-zinc-300 hover:bg-white/10 transition"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="flex-1 rounded bg-red-600/80 border border-red-500/20 py-1.5 text-xs text-stone-100 hover:bg-red-600 transition"
              onClick={handleDeleteField}
            >
              Confirmar
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Label Field */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500">Nome</label>
            <input
              type="text"
              className="h-8 w-full rounded border border-white/10 bg-white/[0.03] px-2.5 text-sm text-stone-100 outline-none focus:border-stone-300/40"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Nome da coluna"
            />
          </div>

          {column.kind === "custom" && (
            <>
              {/* Field Type Selector */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500">Tipo</label>
                <select
                  className="h-8 w-full rounded border border-white/10 bg-[#1e1e20] px-2 text-xs text-stone-200 outline-none focus:border-stone-300/40"
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value)}
                >
                  {customFieldTypes.map((type) => (
                    <option key={type.value} value={type.value} className="bg-[#161618]">
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Requirement Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 py-1">
                <input
                  type="checkbox"
                  className="rounded border-white/10 bg-white/[0.04]"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                />
                Campo obrigatório
              </label>

              {/* Conditional Visibility Rules */}
              <div className="space-y-1.5 border-t border-white/5 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    className="rounded border-white/10 bg-white/[0.04]"
                    checked={conditionalEnabled}
                    onChange={(e) => {
                      setConditionalEnabled(e.target.checked);
                      if (e.target.checked && rules.length === 0) {
                        setRules([{ field: "affected_area", operator: "equals", value: "" }]);
                      }
                    }}
                  />
                  Visibilidade condicional (OU)
                </label>

                {conditionalEnabled && (
                  <div className="space-y-2 max-h-40 overflow-y-auto pt-1.5">
                    {rules.map((rule, index) => (
                      <div key={index} className="flex gap-1.5 items-center">
                        <select
                          className="h-7 rounded border border-white/10 bg-[#1e1e20] px-1 text-xs text-stone-200 outline-none focus:border-stone-300/40 min-w-0 flex-1"
                          value={rule.field}
                          onChange={(e) => {
                            updateRule(index, "field", e.target.value);
                            updateRule(index, "value", ""); // reset value
                          }}
                        >
                          <option value="affected_area" className="bg-[#161618]">Área afetada</option>
                          <option value="error_type" className="bg-[#161618]">Tipo de erro</option>
                          <option value="status" className="bg-[#161618]">Status</option>
                          <option value="severity" className="bg-[#161618]">Severidade</option>
                          <option value="responsible_profile_id" className="bg-[#161618]">Responsável</option>
                        </select>
                        <span className="text-xs text-zinc-500">=</span>
                        {rule.field === "affected_area" ||
                        rule.field === "error_type" ||
                        rule.field === "status" ||
                        rule.field === "severity" ? (
                          <select
                            className="h-7 rounded border border-white/10 bg-[#1e1e20] px-1 text-xs text-stone-200 outline-none focus:border-stone-300/40 min-w-0 w-24"
                            value={rule.value}
                            onChange={(e) => updateRule(index, "value", e.target.value)}
                          >
                            <option value="">Selecione</option>
                            {selectOptions
                              .filter((opt) => opt.type === rule.field && opt.is_active)
                              .map((opt) => (
                                <option key={opt.id} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                          </select>
                        ) : rule.field === "responsible_profile_id" ? (
                          <select
                            className="h-7 rounded border border-white/10 bg-[#1e1e20] px-1 text-xs text-stone-200 outline-none focus:border-stone-300/40 min-w-0 w-24"
                            value={rule.value}
                            onChange={(e) => updateRule(index, "value", e.target.value)}
                          >
                            <option value="">Selecione</option>
                            {profiles.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.full_name || p.email}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="h-7 min-w-0 w-20 rounded border border-white/10 bg-white/[0.03] px-2 text-xs text-stone-100 outline-none focus:border-stone-300/40"
                            value={rule.value}
                            onChange={(e) => updateRule(index, "value", e.target.value)}
                            placeholder="valor"
                          />
                        )}
                        <button
                          type="button"
                          className="text-zinc-500 hover:text-red-400 p-1"
                          onClick={() => removeRule(index)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="text-xs text-zinc-400 hover:text-stone-100 hover:bg-white/[0.03] border border-dashed border-white/10 rounded py-1 w-full text-center transition"
                      onClick={addRule}
                    >
                      + Adicionar regra
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Options Settings (for standard select fields or custom select/status fields) */}
          {((column.kind === "custom" && (fieldType === "select" || fieldType === "status")) || isStandardSelect) && (
            <div className="border-t border-white/5 pt-2.5 space-y-2">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 block">Opções</span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {(isStandardSelect ? stdOptions : options).map((option) => (
                  <div key={option.id} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      className="h-7 min-w-0 flex-1 rounded border border-white/10 bg-white/[0.03] px-2 text-xs text-stone-100 outline-none focus:border-stone-300/40"
                      defaultValue={option.label}
                      onBlur={(e) => {
                        const next = e.target.value.trim();
                        if (next && next !== option.label) {
                          if (isStandardSelect) {
                            handleUpdateStandardOption(option.id, { label: next });
                          } else {
                            handleUpdateOption(option.id, { label: next });
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                    />
                    <ColorInput
                      label={`Cor de ${option.label}`}
                      value={option.color}
                      onChange={(nextColor) => {
                        if (isStandardSelect) {
                          handleUpdateStandardOption(option.id, { color: nextColor });
                        } else {
                          handleUpdateOption(option.id, { color: nextColor });
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="text-zinc-500 hover:text-red-400 p-1 transition"
                      onClick={() => {
                        if (isStandardSelect) {
                          handleUpdateStandardOption(option.id, { is_active: false });
                        } else {
                          handleDeleteOption(option.id);
                        }
                      }}
                      title="Desativar/Excluir opção"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Add option inline form */}
              <div className="flex gap-1.5 pt-1">
                <input
                  className="h-7 min-w-0 flex-1 rounded border border-white/10 bg-white/[0.03] px-2 text-xs text-stone-100 outline-none focus:border-stone-300/40"
                  value={newOptionLabel}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  placeholder="+ Criar opção"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (isStandardSelect) {
                        handleAddStandardOption();
                      } else {
                        handleAddOption();
                      }
                    }
                  }}
                />
                <ColorInput label="Cor da nova opção" value={newOptionColor} onChange={setNewOptionColor} />
                <button
                  className="cursor-pointer rounded border border-white/10 px-2.5 text-xs text-zinc-300 hover:bg-white/[0.05] hover:text-stone-100 transition"
                  type="button"
                  onClick={() => {
                    if (isStandardSelect) {
                      handleAddStandardOption();
                    } else {
                      handleAddOption();
                    }
                  }}
                >
                  Criar
                </button>
              </div>
            </div>
          )}

          {message && <p className="text-xs text-red-400">{message}</p>}

          <div className="flex items-center gap-2 border-t border-white/5 pt-2.5">
            {column.kind === "custom" && (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded border border-red-500/15 bg-red-500/10 text-red-300 transition hover:bg-red-500/20"
                onClick={() => setConfirmingDelete(true)}
                title="Excluir coluna"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              className="flex-1 h-8 rounded bg-white/5 py-1.5 text-xs text-zinc-300 hover:bg-white/10 transition"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="flex-1 h-8 rounded bg-stone-200 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-stone-100 transition disabled:opacity-60"
              disabled={isPending}
              onClick={handleSaveField}
            >
              Salvar
            </button>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
