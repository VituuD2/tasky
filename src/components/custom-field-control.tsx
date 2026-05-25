"use client";

import { CheckSquare, Hash, LinkIcon, Mail, Type, User, CalendarDays, ListChecks, CircleDot } from "lucide-react";
import { useMemo } from "react";
import { getReadableOptionTone } from "@/lib/color";
import type { CustomField, CustomFieldOption, CustomFieldType, Profile } from "@/types/tasky";
import { DateInput } from "@/components/date-input";
import { DarkSelect } from "@/components/dark-select";
import { inputClass } from "@/components/ui";

export const customFieldTypes: Array<{ value: CustomFieldType; label: string; icon: typeof Type }> = [
  { value: "text", label: "Text", icon: Type },
  { value: "number", label: "Number", icon: Hash },
  { value: "select", label: "Select", icon: ListChecks },
  { value: "status", label: "Status", icon: CircleDot },
  { value: "date", label: "Date", icon: CalendarDays },
  { value: "person", label: "Person", icon: User },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "url", label: "URL", icon: LinkIcon },
  { value: "email", label: "Email", icon: Mail },
];

type CustomFieldControlProps = {
  field: CustomField;
  options: CustomFieldOption[];
  profiles: Profile[];
  value?: string | null;
};

export function CustomFieldControl({
  field,
  options,
  profiles,
  value,
}: CustomFieldControlProps) {
  const fieldOptions = useMemo(
    () => options.filter((option) => option.field_id === field.id && option.is_active),
    [field.id, options],
  );

  if (field.field_type === "date") {
    return <DateInput name={`custom_field_${field.id}`} defaultValue={value} required={field.is_required} />;
  }

  if (field.field_type === "person") {
    return (
      <DarkSelect
        name={`custom_field_${field.id}`}
        defaultValue={value ?? ""}
        options={profiles.map((profile) => ({ value: profile.id, label: profile.full_name || profile.email }))}
        placeholder="Sem pessoa"
        required={field.is_required}
      />
    );
  }

  if (field.field_type === "checkbox") {
    return (
      <label className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3 text-sm text-zinc-300">
        <input
          name={`custom_field_${field.id}`}
          type="checkbox"
          value="true"
          defaultChecked={value === "true"}
          required={field.is_required}
        />
        Marcado
      </label>
    );
  }

  if (field.field_type === "select" || field.field_type === "status") {
    const selected = fieldOptions.find((option) => option.value === value);

    return (
      <div className="space-y-2">
        <DarkSelect
          name={`custom_field_${field.id}`}
          defaultValue={value ?? ""}
          options={fieldOptions.map((option) => ({ value: option.value, label: option.label }))}
          placeholder="Selecione"
          required={field.is_required}
        />
        {selected ? (
          <span className="inline-flex rounded border px-2 py-0.5 text-xs font-medium" style={getReadableOptionTone(selected.color)}>
            {selected.label}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <input
      className={inputClass}
      defaultValue={value ?? ""}
      name={`custom_field_${field.id}`}
      required={field.is_required}
      type={field.field_type === "number" ? "number" : field.field_type}
    />
  );
}
