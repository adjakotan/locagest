"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { ArrowLeft } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui";

const schema = z.object({ email: z.string().min(1, "L'e-mail est obligatoire.").email("Adresse e-mail invalide.") });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Form) => {
    setError("");
    try {
      const res = await api.post<{ message: string }>("/forgot-password", values);
      setDone(res.message);
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <h1 className="text-xl font-bold text-slate-900">Mot de passe oublié</h1>
      <p className="text-sm text-slate-600">Indiquez votre e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
      <Alert>{error}</Alert>
      <Alert kind="success">{done}</Alert>
      <Field label="E-mail" error={errors.email?.message} required>
        <Input type="email" autoComplete="email" {...register("email")} />
      </Field>
      <Button type="submit" loading={isSubmitting} className="w-full">Envoyer le lien</Button>
      <p className="text-center text-sm"><Link href="/login" className="inline-flex items-center gap-1 text-slate-500 hover:text-brand-700"><ArrowLeft className="h-4 w-4" /> Retour à la connexion</Link></p>
    </form>
  );
}
