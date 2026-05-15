"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type DarkSelectOption = {
  value: string;
  label: string;
};

type DarkSelectProps = {
  name?: string;
  value?: string;
  defaultValue?: string;
  options: DarkSelectOption[];
  placeholder?: string;
  required?: boolean;
  onChange?: (value: string) => void;
};

export function DarkSelect({
  name,
  value,
  defaultValue = "",
  options,
  placeholder = "Selecione",
  required,
  onChange,
}: DarkSelectProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentValue = controlled ? value : internalValue;
  const currentOption = useMemo(
    () => options.find((option) => option.value === currentValue),
    [currentValue, options],
  );

  function updateMenuRect() {
    const rect = rootRef.current?.getBoundingClientRect();

    if (!rect) {
      return false;
    }

    setMenuRect({
      left: rect.left,
      top: rect.bottom + 8,
      width: rect.width,
    });
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

  function choose(nextValue: string) {
    if (!controlled) {
      setInternalValue(nextValue);
    }

    onChange?.(nextValue);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={rootRef}>
      {name ? <input name={name} required={required} type="hidden" value={currentValue} /> : null}
      <button
        className="flex h-10 w-full cursor-pointer items-center justify-between rounded-md border border-white/10 bg-white/[0.035] px-3 text-left text-sm text-stone-100 outline-none transition hover:border-white/15 hover:bg-white/[0.055] focus:border-stone-300/40"
        type="button"
        onClick={toggleMenu}
      >
        <span className={currentOption ? "truncate" : "truncate text-zinc-500"}>
          {currentOption?.label ?? placeholder}
        </span>
        <span className="ml-3 h-2 w-2 rotate-45 border-b border-r border-zinc-500" />
      </button>

      {isOpen && menuRect
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[100] max-h-72 overflow-y-auto rounded-md border border-white/10 bg-[#202022] p-1 opacity-100 shadow-2xl transition-opacity duration-100"
              style={{ left: menuRect.left, top: menuRect.top, width: menuRect.width }}
            >
              {placeholder ? (
                <button
                  className="block w-full cursor-pointer rounded px-2 py-2 text-left text-sm text-zinc-500 transition hover:bg-white/[0.06] hover:text-stone-200"
                  type="button"
                  onClick={() => choose("")}
                >
                  {placeholder}
                </button>
              ) : null}
              {options.map((option) => (
                <button
                  key={option.value}
                  className={
                    option.value === currentValue
                      ? "block w-full cursor-pointer rounded bg-white/[0.09] px-2 py-2 text-left text-sm text-stone-100"
                      : "block w-full cursor-pointer rounded px-2 py-2 text-left text-sm text-zinc-300 transition hover:bg-white/[0.06] hover:text-stone-100"
                  }
                  type="button"
                  onClick={() => choose(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
