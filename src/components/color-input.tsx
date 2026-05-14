"use client";

import { useRef } from "react";

type ColorInputProps = {
  value: string;
  label: string;
  onChange: (value: string) => void;
};

export function ColorInput({ value, label, onChange }: ColorInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <button
        aria-label={label}
        className="flex h-7 w-8 cursor-pointer items-center justify-center rounded border border-white/10 bg-white/[0.035] transition hover:border-white/20 hover:bg-white/[0.06]"
        type="button"
        onClick={() => inputRef.current?.click()}
      >
        <span className="block h-4 w-4 rounded-sm border border-black/20" style={{ backgroundColor: value }} />
      </button>
      <input
        ref={inputRef}
        aria-label={label}
        className="pointer-events-none absolute inset-0 h-7 w-8 opacity-0"
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
