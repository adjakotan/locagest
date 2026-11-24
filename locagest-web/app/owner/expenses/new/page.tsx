"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { money, PAYMENT_METHODS, today } from "@/lib/format";
import { applyServerErrors, errorMessage } from "@/lib/forms";
import { Alert, Button, Card, Field, Input, Loading, PageHeader, Select, Textarea } from "@/components/ui";
import type { ExpenseCategory, MaintenanceRequest, Paginated, Property } from "@/types";

type Form = {
  property_id: string; unit_id: string; category_id: string; amount: number; spent_at: string; method: string;
  supplier: string; description: string; funded_from: "main" | "reserve"; maintenance_request_id: string; resolve_request: boolean; receipt: FileList;
};

// F102–F105 : saisie d'une dépense avec photo du reçu ; refus si le solde est insuffisant (RG21).
function ExpenseForm() {
  const router = useRouter();
  const params = useSearchParams();
  const properties = useApi<Paginated<Property>>("/properties?per_page=200");
  const categories = useApi<{ data: ExpenseCategory[] }>("/expense-categories");
  const [error, setError] = useState("");
  const [newCat, setNewCat] = useState("");
  const { register, handleSubmit, watch, setValue, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Form>({
    defaultValues: { property_id: params.get("property") ?? "", maintenance_request_id: params.get("request") ?? "", spent_at: today(), method: "cash", funded_from: "main", resolve_request: true },
  });
  const propertyId = watch("property_id");
  const fundedFrom = watch("funded_from");
  const property = useApi<{ data: Property }>(propertyId ? `/properties/${propertyId}` : null);
  const cash = useApi<{ balances: { main: number; reserve: number } }>(propertyId ? `/properties/${propertyId}/cash?per_page=1` : null);
  const requests = useApi<Paginated<MaintenanceRequest>>(propertyId ? `/maintenance-requests?property=${propertyId}&per_page=50` : null);

  if (properties.loading || categories.loading) return <Loading />;

  const addCategory = async () => {
    if (!newCat.trim()) return;
    try {
      const res = await api.post<{ data: ExpenseCategory }>("/expense-categories", { name: newCat.trim() });
      await categories.reload();
      setValue("category_id", String(res.data.id));
      setNewCat("");
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onSubmit = async (v: Form) => {
    setError("");
    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => {
      if (k === "receipt") return;
      if (k === "resolve_request") fd.append(k, val ? "1" : "0");
      else if (val !== "" && val !== undefined && val !== null) fd.append(k, String(val));
    });
    if (v.receipt?.[0]) fd.append("receipt", v.receipt[0]);
    try {
      await api.post("/expenses", fd);
      router.push("/owner/expenses");
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  };

  const available = cash.data ? cash.data.balances[fundedFrom] : null;
  const openRequests = requests.data?.data.filter((r) => r.status !== "resolved") ?? [];

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Alert>{error}</Alert>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bien" error={errors.property_id?.message} required>
            <Select {...register("property_id", { required: "Choisissez le bien." })}>
              <option value="">— Choisir —</option>
              {properties.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Logement" error={errors.unit_id?.message} hint="Vide = parties communes ou bien entier">
            <Select {...register("unit_id")} disabled={!property.data}>
              <option value="">Parties communes / bien entier</option>
              {property.data?.data.units?.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Catégorie" error={errors.category_id?.message} required>
          <Select {...register("category_id", { required: "Choisissez une catégorie." })}>
            <option value="">— Choisir —</option>
            {categories.data?.data.map((c) => <option key={c.id} value={c.id}>{c.name}{c.owner_id ? " (perso)" : ""}</option>)}
          </Select>
        </Field>
        <div className="flex gap-2">
          <Input placeholder="Nouvelle catégorie personnalisée…" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <Button type="button" variant="secondary" onClick={addCategory}>Ajouter</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Montant (FCFA)" error={errors.amount?.message} required><Input type="number" min={1} {...register("amount", { required: "Indiquez le montant." })} /></Field>
          <Field label="Date" error={errors.spent_at?.message} required><Input type="date" max={today()} {...register("spent_at")} /></Field>
          <Field label="Moyen de paiement" required><Select {...register("method")}>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
        </div>
        <Field label="Payée par" error={errors.funded_from?.message} hint={available !== null ? `Disponible : ${money(available)}` : undefined} required>
          <Select {...register("funded_from")}>
            <option value="main">Caisse principale</option>
            <option value="reserve">Réserve pour imprévus</option>
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fournisseur / artisan"><Input {...register("supplier")} /></Field>
          <Field label="Photo du reçu" error={errors.receipt?.message as string | undefined}><Input type="file" accept="image/*,application/pdf" capture="environment" {...register("receipt")} /></Field>
        </div>
        <Field label="Description"><Textarea placeholder="Ex. réparation de la fuite de la chambre 3" {...register("description")} /></Field>
        {openRequests.length > 0 && (
          <div className="rounded-lg bg-slate-50 p-3">
            <Field label="Lier à un signalement (facultatif)">
              <Select {...register("maintenance_request_id")}>
                <option value="">— Aucun —</option>
                {openRequests.map((r) => <option key={r.id} value={r.id}>{r.title}{r.unit ? ` — ${r.unit.label}` : ""}</option>)}
              </Select>
            </Field>
            {watch("maintenance_request_id") && (
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" {...register("resolve_request")} /> Marquer le signalement comme résolu</label>
            )}
          </div>
        )}
        <Button type="submit" loading={isSubmitting}>Enregistrer la dépense</Button>
      </form>
    </Card>
  );
}

export default function NewExpensePage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Nouvelle dépense" back="/owner/expenses" />
      <Suspense fallback={<Loading />}><ExpenseForm /></Suspense>
    </div>
  );
}
