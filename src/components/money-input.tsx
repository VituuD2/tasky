"use client";

type MoneyInputProps = {
  name: string;
  defaultValue?: number | null;
};

function formatCents(cents: number) {
  const value = cents / 100;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function MoneyInput({ name, defaultValue }: MoneyInputProps) {
  const initialCents = defaultValue ? Math.round(defaultValue * 100) : 0;

  return (
    <input
      className="h-10 w-full cursor-text rounded-md border border-white/10 bg-white/[0.035] px-3 text-sm text-stone-100 outline-none transition placeholder:text-zinc-600 hover:border-white/15 focus:border-stone-300/40 focus:bg-white/[0.06]"
      name={name}
      defaultValue={formatCents(initialCents)}
      inputMode="numeric"
      onChange={(event) => {
        const digits = event.currentTarget.value.replace(/\D/g, "");
        const cents = Number(digits || "0");
        event.currentTarget.value = formatCents(cents);
      }}
    />
  );
}
