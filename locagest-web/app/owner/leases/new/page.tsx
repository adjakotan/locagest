"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { money, today } from "@/lib/format";
import { applyServerErrors } from "@/lib/forms";
import { Alert, Button, Card, Field, Input, Loading, PageHeader, Select } from "@/components/ui";
import type { Lease, Paginated, Tenant, Unit } from "@/types";

const schema = z.object({
  unit_id: z.coerce.number({ invalid_type_error: "Choisissez un logement." }).positive("Choisissez un logement."),
  tenant_id: z.coerce.number({ invalid_type_error: "Choisissez un locataire." }).positive("Choisissez un locataire."),
  start_date: z.string().min(1, "La date de début est obligatoire."),
  rent_amount: z.coerce.number().int().positive("Le loyer doit être supérieur à 0."),
  deposit_amount: z.coerce.number().int().min(0, "Montant invalide."),
  due_day: z.coerce.number().int().min(1, "Entre 1 et 28.").max(28, "Entre 1 et 28 (pour exister dans tous les mois)."),
  late_fee: z.coerce.number().int().min(0, "Montant invalide."),
});
type Form = z.infer<typeof schema>;

function NewLeaseForm() {
  const router = useRouter();
  const params = useSearchParams();
  const units = useApi<Paginated<Unit>>("/units?status=vacant&per_page=500");
  const tenants = useApi<Paginated<Tenant>>("/tenants?per_page=500");
  const [error, setError] = useState("");
  const { register, handleSubmit, watch, setValue, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { unit_id: Number(params.get("unit")) || undefined, tenant_id: Number(params.get("tenant")) || undefined, start_date: today(), deposit_amount: 0, due_day: 5, late_fee: 0 },
  });

  // F31 : loyer prérempli avec le loyer par défaut du logement.
  const unitId = watch("unit_id");
  useEffect(() => {
    const u = units.data?.data.find((x) => x.id === Number(unitId));
    if (u) setValue("rent_amount", u.default_rent);
  }, [unitId, units.data, setValue]);

  if (units.loading || tenants.loading) return <Loading />;
  const freeTenants = tenants.data?.data.filter((t) => !t.active_lease) ?? [];

  const onSubmit = async (values: Form) => {
    setError("");
    try {
      const res = await api.post<{ data: Lease }>("/leases", values);
      router.push(`/owner/leases/${res.data.id}`);
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Alert>{error}</Alert>
        {units.data?.data.length === 0 && <Alert kind="info">Aucun logement libre. Ajoutez un logement ou clôturez un bail.</Alert>}
        <Field label="Logement libre" error={errors.unit_id?.message} required>
          <Select {...register("unit_id")}>
            <option value="">— Choisir —</option>
            {units.data?.data.map((u) => <option key={u.id} value={u.id}>{u.property?.name} — {u.label} ({money(u.default_rent)})</option>)}
          </Select>
        </Field>
        <Field label="Locataire" error={errors.tenant_id?.message} hint="Le locataire n'existe pas encore ? Créez d'abord sa fiche dans « Locataires »." required>
          <Select {...register("tenant_id")}>
            <option value="">— Choisir —</option>
            {freeTenants.map((t) => <option key={t.id} value={t.id}>{t.full_name} · {t.phone}</option>)}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date de début" error={errors.start_date?.message} required><Input type="date" {...register("start_date")} /></Field>
          <Field label="Jour d'échéance (1 à 28)" error={errors.due_day?.message} required><Input type="number" min={1} max={28} {...register("due_day")} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Loyer mensuel (FCFA)" error={errors.rent_amount?.message} required><Input type="number" min={1} {...register("rent_amount")} /></Field>
          <Field label="Caution (FCFA)" error={errors.deposit_amount?.message}><Input type="number" min={0} {...register("deposit_amount")} /></Field>
          <Field label="Pénalité de retard (FCFA)" error={errors.late_fee?.message} hint="0 = aucune"><Input type="number" min={0} {...register("late_fee")} /></Field>
        </div>
        <p className="text-xs text-slate-500">Le loyer est figé dans le bail : modifier plus tard le loyer du logement ne changera pas ce bail. La facture du mois est créée automatiquement.</p>
        <Button type="submit" loading={isSubmitting}>Créer le bail</Button>
      </form>
    </Card>
  );
}

export default function NewLeasePage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Nouveau bail" back="/owner/leases" />
      <Suspense fallback={<Loading />}><NewLeaseForm /></Suspense>
    </div>
  );
}
