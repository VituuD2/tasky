"use client";

import { CheckSquare, Hash, LinkIcon, Mail, Type, User, CalendarDays, ListChecks, CircleDot } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { saveCustomFieldOption } from "@/app/actions/admin";
import { getReadableOptionTone } from "@/lib/color";
import { toOptionValue } from "@/lib/format";
import type { CustomField, CustomFieldOption, CustomFieldType, Profile } from "@/types/tasky";
import { ColorInput } from "@/components/color-input";
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
  canManageOptions?: boolean;
  onOptionsChange?: (options: CustomFieldOption[]) => void;
};

export function CustomFieldControl({
  field,
  options,
  profiles,
  value,
  canManageOptions,
  onOptionsChange,
}: CustomFieldControlProps) {
  const fieldOptions = useMemo(
    () => options.filter((option) => option.field_id === field.id && option.is_active),
    [field.id, options],
  );
  const [draftLabel, setDraftLabel] = useState("");
  const [draftColor, setDraftColor] = useState("#8f949b");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function createOption() {
    const label = draftLabel.trim();

    if (!label) {
      setMessage("Informe o nome da opcao.");
      return;
    }

    const formData = new FormData();
    formData.set("field_id", field.id);
    formData.set("label", label);
    formData.set("value", toOptionValue(label));
    formData.set("color", draftColor);

    startTransition(async () => {
      const result = await saveCustomFieldOption(formData);
      setMessage(result.ok ? "" : result.message);

      if (result.ok) {
        const now = new Date().toISOString();
        onOptionsChange?.([
          ...options,
          {
            id: `local-${field.id}-${toOptionValue(label)}`,
            field_id: field.id,
            label,
            value: toOptionValue(label),
            color: draftColor,
            sort_order: fieldOptions.length * 10 + 10,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
        setDraftLabel("");
      }
    });
  }

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
        {canManageOptions ? (
          <div className="flex gap-2">
            <input
              className="h-8 min-w-0 flex-1 cursor-text rounded border border-white/10 bg-white/[0.04] px-2 text-xs text-stone-100 outline-none focus:border-stone-300/40"
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              placeholder="+ Criar opcao"
            />
            <ColorInput label={`Cor de ${field.label}`} value={draftColor} onChange={setDraftColor} />
            <button
              className="cursor-pointer rounded border border-white/10 px-2 text-xs text-zinc-300 hover:bg-white/[0.06]"
              disabled={isPending}
              type="button"
              onClick={createOption}
            >
              Criar
            </button>
          </div>
        ) : null}
        {message ? <p className="text-xs text-red-200">{message}</p> : null}
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
