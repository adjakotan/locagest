"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { UNIT_TYPES } from "@/lib/format";
import { applyServerErrors } from "@/lib/forms";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import type { Unit } from "@/types";

const schema = z.object({
  label: z.string().min(1, "Le libellé est obligatoire (ex. « Chambre 3 »)."),
  type: z.enum(["room", "apartment", "house", "shop"]),
  default_rent: z.coerce.number({ invalid_type_error: "Indiquez un loyer." }).int().positive("Le loyer doit être supérieur à 0."),
});
type Form = z.infer<typeof schema>;

export function UnitForm({ propertyId, unit, onDone }: { propertyId: number; unit?: Unit; onDone: () => void }) {
  const [error, setError] = useState("");
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: unit ? { label: unit.label, type: unit.type, default_rent: unit.default_rent } : { type: "room" },
  });

  const onSubmit = async (values: Form) => {
    setError("");
    try {
      if (unit) await api.put(`/units/${unit.id}`, values);
      else await api.post(`/properties/${propertyId}/units`, values);
      onDone();
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Alert>{error}</Alert>
      <Field label="Libellé" error={errors.label?.message} required><Input placeholder="Chambre 3, Appartement A1…" {...register("label")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" error={errors.type?.message} required>
          <Select {...register("type")}>{UNIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>
        </Field>
        <Field label="Loyer par défaut (FCFA)" error={errors.default_rent?.message} required>
          <Input type="number" min={1} inputMode="numeric" {...register("default_rent")} />
        </Field>
      </div>
      {unit?.status === "occupied" && <Alert kind="info">Le bail en cours garde son loyer actuel : le nouveau loyer s&apos;appliquera aux prochains baux.</Alert>}
      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">{unit ? "Enregistrer" : "Ajouter le logement"}</Button>
    </form>
  );
}
