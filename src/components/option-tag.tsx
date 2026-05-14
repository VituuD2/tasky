import { getOptionColor, getOptionLabel } from "@/lib/options";
import { getReadableOptionTone } from "@/lib/color";
import type { SelectOption } from "@/types/tasky";

type OptionTagProps = {
  optionMap: Map<string, SelectOption>;
  type: string;
  value: string | null | undefined;
};

export function OptionTag({ optionMap, type, value }: OptionTagProps) {
  if (!value) {
    return <span className="text-zinc-600">-</span>;
  }

  const color = getOptionColor(optionMap, type, value);
  const label = getOptionLabel(optionMap, type, value);

  return (
    <span
      className="inline-flex max-w-full items-center rounded border px-2 py-1 text-xs font-medium"
      style={getReadableOptionTone(color)}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
