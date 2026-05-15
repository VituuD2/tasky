"use client";

import { Plus } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { createCustomField } from "@/app/actions/admin";
import type { CustomFieldType } from "@/types/tasky";
import { customFieldTypes } from "@/components/custom-field-control";

type CustomFieldMenuProps = {
  onCreated: () => void;
};

export function CustomFieldMenu({ onCreated }: CustomFieldMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<CustomFieldType | null>(null);
  const [label, setLabel] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [message, setMessage] = useState("");
  const [menuRect, setMenuRect] = useState<{ left: number; top: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function updateMenuRect() {
    const rect = rootRef.current?.getBoundingClientRect();

    if (!rect) {
      return false;
    }

    setMenuRect({ left: rect.left, top: rect.bottom + 8 });
    return true;
  }

  function toggleMenu() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    if (updateMenuRect()) {
      setIsOpen(true);
    }
  }

  useLayoutEffect(() => {
    if (isOpen) {
      updateMenuRect();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;

      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("touchstart", closeOnOutside);
    window.addEventListener("scroll", updateMenuRect, true);
    window.addEventListener("resize", updateMenuRect);

    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
      window.removeEventListener("scroll", updateMenuRect, true);
      window.removeEventListener("resize", updateMenuRect);
    };
  }, [isOpen]);

  function submit() {
    if (!selectedType || !label.trim()) {
      setMessage("Informe tipo e nome.");
      return;
    }

    const formData = new FormData();
    formData.set("field_type", selectedType);
    formData.set("label", label);

    if (isRequired) {
      formData.set("is_required", "on");
    }

    startTransition(async () => {
      const result = await createCustomField(formData);
      setMessage(result.ok ? "" : result.message);

      if (result.ok) {
        setIsOpen(false);
        setSelectedType(null);
        setLabel("");
        setIsRequired(false);
        onCreated();
      }
    });
  }

  return (
    <div ref={rootRef} className="relative flex items-center border-r border-white/10 px-2 py-2">
      <button
        aria-label="Criar coluna"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-white/10 text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-stone-100"
        type="button"
        onClick={toggleMenu}
      >
        <Plus className="h-4 w-4" />
      </button>

      {isOpen && menuRect
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[110] w-96 rounded-md border border-white/10 bg-[#202022] p-3 shadow-2xl"
              style={{ left: menuRect.left, top: menuRect.top }}
            >
              <div className="grid grid-cols-2 gap-1 border-b border-white/10 pb-3">
                {customFieldTypes.map((type) => {
                  const Icon = type.icon;

                  return (
                    <button
                      key={type.value}
                      className={
                        selectedType === type.value
                          ? "flex items-center gap-2 rounded bg-white/[0.1] px-2 py-2 text-left text-sm text-stone-100"
                          : "flex items-center gap-2 rounded px-2 py-2 text-left text-sm text-zinc-300 hover:bg-white/[0.06] hover:text-stone-100"
                      }
                      type="button"
                      onClick={() => setSelectedType(type.value)}
                    >
                      <Icon className="h-4 w-4 text-zinc-400" />
                      {type.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 space-y-3">
                <input
                  className="h-9 w-full rounded border border-white/10 bg-white/[0.04] px-3 text-sm text-stone-100 outline-none focus:border-stone-300/40"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Nome da coluna"
                />
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input checked={isRequired} type="checkbox" onChange={(event) => setIsRequired(event.target.checked)} />
                  Campo obrigatorio
                </label>
                {message ? <p className="text-xs text-red-200">{message}</p> : null}
                <button
                  className="h-9 w-full cursor-pointer rounded-md border border-white/10 bg-stone-100 px-3 text-sm font-medium text-zinc-950 transition hover:bg-white hover:shadow-[0_0_18px_rgba(244,241,234,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPending}
                  type="button"
                  onClick={submit}
                >
                  Criar coluna
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
