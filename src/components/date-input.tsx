"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDate, parseBrazilianDate } from "@/lib/format";

type DateInputProps = {
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
};

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const weekDays = ["S", "T", "Q", "Q", "S", "S", "D"];

function dateFromDisplay(value: string) {
  const iso = parseBrazilianDate(value);

  if (!iso) {
    return null;
  }

  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function displayFromDate(date: Date) {
  return formatDate(
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
  );
}

function sameDay(a: Date | null, b: Date) {
  return Boolean(
    a &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate(),
  );
}

function CalendarIcon() {
  return (
    <span className="relative block h-4 w-4 rounded-sm border border-current">
      <span className="absolute left-0 top-1 h-px w-full bg-current" />
      <span className="absolute left-1 top-[-2px] h-1.5 w-px bg-current" />
      <span className="absolute right-1 top-[-2px] h-1.5 w-px bg-current" />
    </span>
  );
}

export function DateInput({ name, defaultValue, required, placeholder = "dd/mm/aaaa" }: DateInputProps) {
  const initialDisplay = defaultValue?.includes("-") ? formatDate(defaultValue) : defaultValue ?? "";
  const [value, setValue] = useState(initialDisplay);
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ left: number; top: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedDate = dateFromDisplay(value);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = selectedDate ?? new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const today = useMemo(() => new Date(), []);

  const days = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = Array.from({ length: startOffset }, () => null);

    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(year, month, day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [visibleMonth]);

  function updateMenuRect() {
    const rect = rootRef.current?.getBoundingClientRect();

    if (!rect) {
      return false;
    }

    setMenuRect({ left: rect.left, top: rect.bottom + 8 });
    return true;
  }

  function openMenu() {
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

  function shiftMonth(delta: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function chooseDate(date: Date) {
    setValue(displayFromDate(date));
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setIsOpen(false);
  }

  function chooseToday() {
    chooseDate(today);
  }

  return (
    <div className="relative" ref={rootRef}>
      <input
        autoComplete="off"
        className="h-10 w-full cursor-pointer rounded-md border border-white/10 bg-white/[0.035] px-3 pr-10 text-sm text-stone-100 outline-none transition placeholder:text-zinc-600 hover:border-white/15 focus:border-stone-300/40 focus:bg-white/[0.06]"
        data-lpignore="true"
        data-form-type="other"
        name={name}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={openMenu}
      />
      <button
        aria-label="Abrir calendario"
        className="absolute right-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-white/10 text-zinc-400 transition hover:bg-white/[0.06] hover:text-stone-100"
        type="button"
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            return;
          }

          openMenu();
        }}
      >
        <CalendarIcon />
      </button>

      {isOpen && menuRect
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[100] w-72 rounded-md border border-white/10 bg-[#202022] p-3 opacity-100 shadow-2xl transition-opacity duration-100"
              style={{ left: menuRect.left, top: menuRect.top }}
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  className="h-8 w-8 cursor-pointer rounded text-zinc-400 hover:bg-white/[0.06] hover:text-stone-100"
                  type="button"
                  onClick={() => shiftMonth(-1)}
                >
                  {"<"}
                </button>
                <p className="text-sm font-medium text-stone-100">
                  {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
                </p>
                <button
                  className="h-8 w-8 cursor-pointer rounded text-zinc-400 hover:bg-white/[0.06] hover:text-stone-100"
                  type="button"
                  onClick={() => shiftMonth(1)}
                >
                  {">"}
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                {weekDays.map((day, index) => (
                  <div key={`${day}-${index}`} className="py-1">
                    {day}
                  </div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {days.map((date, index) =>
                  date ? (
                    <button
                      key={date.toISOString()}
                      className={
                        sameDay(selectedDate, date)
                          ? "h-8 cursor-pointer rounded bg-stone-200 text-sm font-medium text-zinc-950"
                          : sameDay(today, date)
                            ? "h-8 cursor-pointer rounded border border-stone-300/60 bg-white/[0.04] text-sm font-medium text-stone-100 transition hover:bg-white/[0.09]"
                          : "h-8 cursor-pointer rounded text-sm text-zinc-300 transition hover:bg-white/[0.07] hover:text-stone-100"
                      }
                      type="button"
                      onClick={() => chooseDate(date)}
                    >
                      {date.getDate()}
                    </button>
                  ) : (
                    <div key={`blank-${index}`} />
                  ),
                )}
              </div>

              <div className="mt-3 border-t border-white/10 pt-3">
                <button
                  className="h-8 w-full cursor-pointer rounded border border-white/10 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-stone-100"
                  type="button"
                  onClick={chooseToday}
                >
                  Hoje
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
