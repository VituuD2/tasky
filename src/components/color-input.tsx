"use client";

type ColorInputProps = {
  value: string;
  label: string;
  onChange: (value: string) => void;
};

export function ColorInput({ value, label, onChange }: ColorInputProps) {
  return (
    <input
      aria-label={label}
      type="color"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 w-8 cursor-pointer rounded border border-white/10 bg-transparent p-0 focus:outline-none focus:border-stone-300/40 hover:border-white/20 transition-all [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-[2px] [&::-moz-color-swatch]:border-none [&::-moz-color-swatch]:rounded-[2px]"
    />
  );
}
