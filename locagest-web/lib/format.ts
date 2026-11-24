// Formats français (§7) : « 45 000 FCFA », dates JJ/MM/AAAA.

export function money(n: number | null | undefined): string {
  const v = Math.round(n ?? 0);
  return v.toLocaleString("fr-FR").replace(/ | /g, " ") + " FCFA";
}

export function date(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function currentMonth(): string {
  return today().slice(0, 7);
}

export const PAYMENT_METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "transfer", label: "Virement" },
] as const;

export const UNIT_TYPES = [
  { value: "room", label: "Chambre" },
  { value: "apartment", label: "Appartement" },
  { value: "house", label: "Maison" },
  { value: "shop", label: "Boutique" },
] as const;

export const INVOICE_STATUSES = [
  { value: "pending", label: "En attente" },
  { value: "partial", label: "Partiellement payée" },
  { value: "paid", label: "Payée" },
  { value: "late", label: "En retard" },
] as const;

export const ITEM_TYPES = [
  { value: "water", label: "Eau" },
  { value: "electricity", label: "Électricité" },
  { value: "waste", label: "Ordures" },
  { value: "shared_charge", label: "Charges communes" },
  { value: "damage", label: "Retenue pour dégâts" },
  { value: "penalty", label: "Pénalité de retard" },
  { value: "correction", label: "Correction (montant négatif)" },
  { value: "other", label: "Autre" },
] as const;
