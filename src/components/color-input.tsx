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
    <button
      type="button"
      aria-label={label}
      className="group relative flex h-7 w-8 cursor-pointer items-center justify-center rounded border border-white/10 bg-white/[0.035] transition hover:border-white/20 hover:bg-white/[0.06] focus:outline-none focus:border-stone-300/40"
      onClick={() => inputRef.current?.click()}
    >
      <span className="pointer-events-none flex h-full w-full items-center justify-center">
        <span className="block h-4 w-4 rounded-sm border border-black/20" style={{ backgroundColor: value }} />
      </span>
      <input
        ref={inputRef}
        className="absolute pointer-events-none opacity-0"
        style={{ width: "1px", height: "1px", overflow: "hidden", left: "0", top: "0" }}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </button>
  );
}
