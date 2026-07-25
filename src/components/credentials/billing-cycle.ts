import { BillingCycle } from "@prisma/client";

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  MENSAL: "Mensal",
  TRIMESTRAL: "Trimestral",
  SEMESTRAL: "Semestral",
  ANUAL: "Anual",
};

export const BILLING_CYCLE_SUFFIX: Record<BillingCycle, string> = {
  MENSAL: "/mês",
  TRIMESTRAL: "/trimestre",
  SEMESTRAL: "/semestre",
  ANUAL: "/ano",
};

export function formatCredentialCost(
  cost: number | null,
  billingCycle: BillingCycle | null,
): string | null {
  if (cost == null) return null;
  const formatted = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(
    cost,
  );
  return billingCycle ? `${formatted}${BILLING_CYCLE_SUFFIX[billingCycle]}` : formatted;
}
