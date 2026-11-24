"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { applyServerErrors } from "@/lib/forms";
import { useApi } from "@/hooks/useApi";
import { Alert, Button, Field, Input, Loading } from "@/components/ui";
import type { User } from "@/types";

// F04 : le locataire crée son compte à partir du lien reçu par e-mail.
const schema = z
  .object({ password: z.string().min(8, "Au moins 8 caractères."), password_confirmation: z.string() })
  .refine((d) => d.password === d.password_confirmation, { path: ["password_confirmation"], message: "Les deux mots de passe ne correspondent pas." });
type Form = z.infer<typeof schema>;

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { setUser } = useAuth();
  const { data, loading, error } = useApi<{ full_name: string; email: string; owner: string }>(`/invitations/${token}`);
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  if (loading) return <Loading />;
  if (error || !data) {
    return (
      <div className="space-y-4 text-center">
        <Alert>{error ?? "Lien invalide."}</Alert>
        <p className="text-sm text-slate-600">Demandez à votre propriétaire de vous renvoyer une invitation.</p>
        <Link href="/login" className="text-brand-600 hover:underline">Aller à la connexion</Link>
      </div>
    );
  }

  const onSubmit = async (values: Form) => {
    setFormError("");
    try {
      const res = await api.post<{ data: User }>(`/invitations/${token}/accept`, values);
      setUser(res.data);
      router.replace("/tenant");
    } catch (e) {
      setFormError(applyServerErrors(e, setError));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <h1 className="text-xl font-bold text-slate-900">Bienvenue {data.full_name}</h1>
      <p className="text-sm text-slate-600"><strong>{data.owner}</strong> vous invite à créer votre espace locataire. Choisissez un mot de passe pour <strong>{data.email}</strong>.</p>
      <Alert>{formError}</Alert>
      <Field label="Mot de passe" error={errors.password?.message} required>
        <Input type="password" autoComplete="new-password" {...register("password")} />
      </Field>
      <Field label="Confirmation" error={errors.password_confirmation?.message} required>
        <Input type="password" autoComplete="new-password" {...register("password_confirmation")} />
      </Field>
      <Button type="submit" loading={isSubmitting} className="w-full">Créer mon compte</Button>
    </form>
  );
}
