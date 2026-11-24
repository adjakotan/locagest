"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";
import { applyServerErrors } from "@/lib/forms";
import { Alert, Button, Field, Input } from "@/components/ui";
import type { User } from "@/types";

const schema = z.object({
  email: z.string().min(1, "L'e-mail est obligatoire.").email("Adresse e-mail invalide."),
  password: z.string().min(1, "Le mot de passe est obligatoire."),
  remember: z.boolean().optional(),
});
type Form = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();
  const [error, setError] = useState("");
  const { register, handleSubmit, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Form) => {
    setError("");
    try {
      const res = await api.post<{ data: User }>("/login", values);
      setUser(res.data);
      const next = params.get("next");
      router.replace(next && next.startsWith("/") ? next : homeFor(res.data.role));
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <h1 className="text-xl font-bold text-slate-900">Connexion</h1>
      <Alert>{error}</Alert>
      <Field label="E-mail" error={errors.email?.message} required>
        <Input type="email" autoComplete="email" {...register("email")} />
      </Field>
      <Field label="Mot de passe" error={errors.password?.message} required>
        <Input type="password" autoComplete="current-password" {...register("password")} />
      </Field>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-slate-600">
          <input type="checkbox" {...register("remember")} className="rounded border-slate-300" /> Rester connecté
        </label>
        <Link href="/forgot-password" className="text-brand-600 hover:underline">Mot de passe oublié ?</Link>
      </div>
      <Button type="submit" loading={isSubmitting} className="w-full">Se connecter</Button>
      <p className="text-center text-sm text-slate-600">
        Pas encore de compte ? <Link href="/register" className="font-medium text-brand-600 hover:underline">Créer un compte propriétaire</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
