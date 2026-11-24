"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { Alert, Button, Field, Input } from "@/components/ui";
import type { Tenant } from "@/types";

const schema = z.object({
  full_name: z.string().min(2, "Le nom complet est obligatoire."),
  phone: z.string().min(8, "Numéro de téléphone invalide."),
  email: z.string().email("Adresse e-mail invalide.").or(z.literal("")).optional(),
  id_number: z.string().optional(),
  emergency_contact: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export function TenantForm({ tenant, onSaved }: { tenant?: Tenant; onSaved: (t: Tenant) => void }) {
  const [error, setError] = useState("");
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: tenant ? { full_name: tenant.full_name, phone: tenant.phone, email: tenant.email ?? "", id_number: tenant.id_number ?? "", emergency_contact: tenant.emergency_contact ?? "" } : {},
  });

  const onSubmit = async (values: Form) => {
    setError("");
    try {
      const body = { ...values, email: values.email || null };
      const res = tenant ? await api.put<{ data: Tenant }>(`/tenants/${tenant.id}`, body) : await api.post<{ data: Tenant }>("/tenants", body);
      onSaved(res.data);
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Alert>{error}</Alert>
      <Field label="Nom complet" error={errors.full_name?.message} required><Input autoComplete="off" {...register("full_name")} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Téléphone" error={errors.phone?.message} required><Input type="tel" placeholder="+229 97 00 00 00" {...register("phone")} /></Field>
        <Field label="E-mail" error={errors.email?.message} hint="Nécessaire pour l'inviter dans son espace"><Input type="email" {...register("email")} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="N° de pièce d'identité" error={errors.id_number?.message} hint="Visible uniquement par vous"><Input {...register("id_number")} /></Field>
        <Field label="Contact d'urgence" error={errors.emergency_contact?.message}><Input placeholder="Nom et téléphone" {...register("emergency_contact")} /></Field>
      </div>
      <Button type="submit" loading={isSubmitting}>{tenant ? "Enregistrer" : "Créer la fiche"}</Button>
    </form>
  );
}
