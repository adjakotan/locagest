"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { Alert, Button, Field, Input } from "@/components/ui";

const schema = z
  .object({ password: z.string().min(8, "Au moins 8 caractères."), password_confirmation: z.string() })
  .refine((d) => d.password === d.password_confirmation, { path: ["password_confirmation"], message: "Les deux mots de passe ne correspondent pas." });
type Form = z.infer<typeof schema>;

function ResetForm() {
  const params = useSearchParams();
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Form) => {
    setError("");
    try {
      const res = await api.post<{ message: string }>("/reset-password", { ...values, token: params.get("token"), email: params.get("email") });
      setDone(res.message);
    } catch (e) {
      setError(applyServerErrors(e, setFieldError) || "Ce lien est invalide ou a expiré.");
    }
  };

  if (done) {
    return (
      <div className="space-y-4">
        <Alert kind="success">{done}</Alert>
        <Link href="/login" className="block text-center font-medium text-brand-600 hover:underline">Se connecter</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <h1 className="text-xl font-bold text-slate-900">Nouveau mot de passe</h1>
      <Alert>{error}</Alert>
      <Field label="Nouveau mot de passe" error={errors.password?.message} required>
        <Input type="password" autoComplete="new-password" {...register("password")} />
      </Field>
      <Field label="Confirmation" error={errors.password_confirmation?.message} required>
        <Input type="password" autoComplete="new-password" {...register("password_confirmation")} />
      </Field>
      <Button type="submit" loading={isSubmitting} className="w-full">Enregistrer</Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
