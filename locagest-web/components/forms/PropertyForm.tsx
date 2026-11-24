"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import type { Property } from "@/types";

const schema = z.object({
  name: z.string().min(2, "Donnez un nom au bien (ex. « Cour Akpakpa »)."),
  address: z.string().min(2, "L'adresse est obligatoire."),
  city: z.string().min(2, "La ville est obligatoire."),
  neighborhood: z.string().optional(),
  description: z.string().optional(),
  reserve_rate: z.coerce.number().int().min(0, "Entre 0 et 100.").max(100, "Entre 0 et 100."),
});
type Form = z.infer<typeof schema>;

export function PropertyForm({ property }: { property?: Property }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: property
      ? { name: property.name, address: property.address, city: property.city, neighborhood: property.neighborhood ?? "", description: property.description ?? "", reserve_rate: property.reserve_rate }
      : { reserve_rate: 10 },
  });

  const onSubmit = async (values: Form) => {
    setError("");
    try {
      const res = property
        ? await api.put<{ data: Property }>(`/properties/${property.id}`, values)
        : await api.post<{ data: Property }>("/properties", values);
      router.push(`/owner/properties/${res.data.id}`);
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Alert>{error}</Alert>
        <Field label="Nom du bien" error={errors.name?.message} required><Input placeholder="Cour Akpakpa, Immeuble A…" {...register("name")} /></Field>
        <Field label="Adresse" error={errors.address?.message} required><Input {...register("address")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ville" error={errors.city?.message} required><Input {...register("city")} /></Field>
          <Field label="Quartier" error={errors.neighborhood?.message}><Input {...register("neighborhood")} /></Field>
        </div>
        <Field label="Description" error={errors.description?.message}><Textarea {...register("description")} /></Field>
        <Field label="Part des paiements mise en réserve (%)" error={errors.reserve_rate?.message} hint="À chaque loyer encaissé, ce pourcentage va dans la réserve pour imprévus, le reste dans la caisse principale.">
          <Input type="number" min={0} max={100} {...register("reserve_rate")} className="w-32" />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" loading={isSubmitting}>{property ? "Enregistrer" : "Créer le bien"}</Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>Annuler</Button>
        </div>
      </form>
    </Card>
  );
}
