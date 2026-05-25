import type { VisibilityRule } from "@/types/tasky";
import type { Json } from "@/types/database";

export function parseVisibilityRules(raw: Json | null): VisibilityRule[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
      return parsed.filter((rule: unknown): rule is VisibilityRule => {
        if (!rule || typeof rule !== "object") return false;
        const r = rule as Record<string, unknown>;
        return (
          typeof r.field === "string" &&
          r.operator === "equals" &&
          typeof r.value === "string"
        );
      });
    }
  } catch (error) {
    console.error("Erro ao fazer parse das regras de visibilidade:", error);
  }
  return [];
}

export function evaluateVisibility(
  rules: VisibilityRule[],
  formValues: Record<string, string | boolean | null | undefined>
): boolean {
  if (rules.length === 0) return true;

  // Lógica OR: Qualquer uma das regras satisfeitas mostra o campo
  return rules.some((rule) => {
    const value = formValues[rule.field];
    if (value === undefined || value === null) return false;
    
    // Tratando booleano para string se necessário, mas geralmente são selects/strings
    const stringValue = String(value).trim().toLowerCase();
    const targetValue = rule.value.trim().toLowerCase();
    
    return stringValue === targetValue;
  });
}
