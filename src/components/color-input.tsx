"use client";

type ColorInputProps = {
  value: string;
  label: string;
  onChange: (value: string) => void;
};

export function ColorInput({ value, label, onChange }: ColorInputProps) {
  return (
    <div className="group relative h-7 w-8">
      <span
        aria-hidden
        className="pointer-events-none flex h-7 w-8 items-center justify-center rounded border border-white/10 bg-white/[0.035] transition group-hover:border-white/20 group-hover:bg-white/[0.06] group-focus-within:border-stone-300/40"
      >
        <span className="block h-4 w-4 rounded-sm border border-black/20" style={{ backgroundColor: value }} />
      </span>
      <input
        aria-label={label}
        className="absolute inset-0 h-7 w-8 cursor-pointer rounded opacity-0"
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
