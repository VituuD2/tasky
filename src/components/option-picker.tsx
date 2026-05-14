"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { saveOption } from "@/app/actions/admin";
import { toOptionValue } from "@/lib/format";
import { getReadableOptionTone } from "@/lib/color";
import type { OptionType, SelectOption } from "@/types/tasky";
import { OPTION_TYPE_LABELS } from "@/types/tasky";
import { ColorInput } from "@/components/color-input";

type OptionPickerProps = {
  name: string;
  type: OptionType;
  value: string | null | undefined;
  options: SelectOption[];
  required?: boolean;
  canManage?: boolean;
  onOptionsChange?: (options: SelectOption[]) => void;
};

function CrossIcon() {
  return (
    <span className="relative block h-3 w-3">
      <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 rotate-45 bg-current" />
      <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 -rotate-45 bg-current" />
    </span>
  );
}

export function OptionPicker({
  name,
  type,
  value,
  options,
  required,
  canManage,
  onOptionsChange,
}: OptionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value ?? "");
  const [draftLabel, setDraftLabel] = useState("");
  const [draftColor, setDraftColor] = useState("#9a82a8");
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [menuRect, setMenuRect] = useState({ left: 0, top: 0, width: 260 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () =>
      options
        .filter((option) => option.type === type && option.is_active)
        .sort((a, b) => a.sort_order - b.sort_order),
    [options, type],
  );
  const selectedOption = rows.find((option) => option.value === selectedValue);

  function updateMenuRect() {
    const rect = rootRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    setMenuRect({
      left: rect.left,
      top: rect.bottom + 8,
      width: Math.max(rect.width, 260),
    });
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateMenuRect();

    function closeOnOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;

      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function keepAnchored() {
      updateMenuRect();
    }

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("touchstart", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", keepAnchored, true);
    window.addEventListener("resize", keepAnchored);

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", keepAnchored, true);
      window.removeEventListener("resize", keepAnchored);
    };
  }, [isOpen]);

  function updateLocalOption(optionId: string, patch: Partial<SelectOption>) {
    onOptionsChange?.(
      options.map((option) =>
        option.id === optionId ? { ...option, ...patch, updated_at: new Date().toISOString() } : option,
      ),
    );
  }

  function saveOptionPatch(option: SelectOption, patch: Partial<SelectOption>) {
    const formData = new FormData();
    formData.set("id", option.id);
    formData.set("type", option.type);
    formData.set("value", option.value);
    formData.set("label", patch.label ?? option.label);
    formData.set("color", patch.color ?? option.color);
    formData.set("sort_order", String(patch.sort_order ?? option.sort_order));

    if (patch.is_active ?? option.is_active) {
      formData.set("is_active", "on");
    }

    startTransition(async () => {
      const result = await saveOption(formData);
      setMessage(result.ok ? "" : result.message);

      if (result.ok) {
        updateLocalOption(option.id, patch);
      }
    });
  }

  function createOption() {
    const label = draftLabel.trim();

    if (!label) {
      setMessage("Informe o nome da opção.");
      return;
    }

    const valueForOption = toOptionValue(label);
    const nextSortOrder =
      Math.max(0, ...options.filter((option) => option.type === type).map((option) => option.sort_order)) + 10;
    const formData = new FormData();
    formData.set("type", type);
    formData.set("label", label);
    formData.set("value", valueForOption);
    formData.set("color", draftColor);
    formData.set("sort_order", String(nextSortOrder));
    formData.set("is_active", "on");

    startTransition(async () => {
      const result = await saveOption(formData);
      setMessage(result.ok ? "" : result.message);

      if (result.ok) {
        const now = new Date().toISOString();
        onOptionsChange?.([
          ...options,
          {
            id: `local-${type}-${valueForOption}`,
            type,
            label,
            value: valueForOption,
            color: draftColor,
            sort_order: nextSortOrder,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
        setSelectedValue(valueForOption);
        setDraftLabel("");
      }
    });
  }

  return (
    <div className="relative" ref={rootRef}>
      <input name={name} required={required} type="hidden" value={selectedValue} />
      <button
        className="flex h-10 w-full cursor-pointer items-center justify-between rounded-md border border-white/10 bg-white/[0.035] px-3 text-left text-sm text-stone-100 outline-none transition hover:border-white/15 hover:bg-white/[0.055] focus:border-stone-300/40"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        {selectedOption ? (
          <span
            className="inline-flex max-w-[calc(100%-1.5rem)] items-center rounded border px-2 py-0.5 text-xs font-medium"
            style={getReadableOptionTone(selectedOption.color)}
          >
            <span className="truncate">{selectedOption.label}</span>
          </span>
        ) : (
          <span className="text-zinc-500">Selecione</span>
        )}
        <span className="ml-3 h-2 w-2 rotate-45 border-b border-r border-zinc-500" />
      </button>

      {isOpen
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[100] rounded-md border border-white/10 bg-[#202022] p-2 shadow-2xl"
              style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width }}
            >
              <div className="border-b border-white/10 px-2 pb-2 text-xs text-zinc-500">
                <div className="flex items-center justify-between gap-3">
                  <span>{OPTION_TYPE_LABELS[type]}</span>
                  {canManage ? (
                    <button
                      className="cursor-pointer rounded px-2 py-1 text-xs text-zinc-400 transition hover:bg-white/[0.06] hover:text-stone-100"
                      type="button"
                      onClick={() => setIsEditing((current) => !current)}
                    >
                      {isEditing ? "Concluir" : "Editar"}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto py-2">
                {rows.map((option) => (
                  <div key={option.id} className="group flex items-center gap-2 rounded px-2 py-1.5 hover:bg-white/[0.06]">
                    <button
                      className="min-w-0 flex-1 cursor-pointer text-left"
                      type="button"
                      onClick={() => {
                        setSelectedValue(option.value);
                        setIsOpen(false);
                      }}
                    >
                      <span
                        className="inline-flex max-w-full items-center rounded border px-2 py-0.5 text-xs font-medium"
                        style={getReadableOptionTone(option.color)}
                      >
                        <span className="truncate">{option.label}</span>
                      </span>
                    </button>

                    {canManage && isEditing ? (
                      <>
                        <ColorInput
                          label={`Cor de ${option.label}`}
                          value={option.color}
                          onChange={(nextColor) => saveOptionPatch(option, { color: nextColor })}
                        />
                        <button
                          aria-label={`Desativar ${option.label}`}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-zinc-500 transition hover:bg-white/[0.06] hover:text-stone-100"
                          disabled={isPending}
                          type="button"
                          onClick={() => saveOptionPatch(option, { is_active: false })}
                        >
                          <CrossIcon />
                        </button>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>

              {canManage && isEditing ? (
                <div className="mt-2 border-t border-white/10 pt-2">
                  <div className="flex gap-2">
                    <input
                      className="h-8 min-w-0 flex-1 cursor-text rounded border border-white/10 bg-white/[0.04] px-2 text-xs text-stone-100 outline-none focus:border-stone-300/40"
                      value={draftLabel}
                      onChange={(event) => setDraftLabel(event.target.value)}
                      placeholder="+ Criar opção"
                    />
                    <ColorInput label="Cor da nova opção" value={draftColor} onChange={setDraftColor} />
                    <button
                      className="cursor-pointer rounded border border-white/10 px-2 text-xs text-zinc-300 hover:bg-white/[0.06]"
                      disabled={isPending}
                      type="button"
                      onClick={createOption}
                    >
                      Criar
                    </button>
                  </div>
                  {message ? <p className="mt-2 text-xs text-red-200">{message}</p> : null}
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
