import type { SelectOption } from "@/types/tasky";

export function buildOptionMap(options: SelectOption[]) {
  return new Map(options.map((option) => [`${option.type}:${option.value}`, option]));
}

export function getOptionLabel(
  optionMap: Map<string, SelectOption>,
  type: string,
  value: string | null | undefined,
) {
  if (!value) {
    return "";
  }

  return optionMap.get(`${type}:${value}`)?.label ?? value;
}

export function getOptionColor(
  optionMap: Map<string, SelectOption>,
  type: string,
  value: string | null | undefined,
) {
  if (!value) {
    return "#8f949b";
  }

  return optionMap.get(`${type}:${value}`)?.color ?? "#8f949b";
}
