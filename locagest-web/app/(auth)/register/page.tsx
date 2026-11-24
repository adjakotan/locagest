"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { applyServerErrors } from "@/lib/forms";
import { Alert, Button, Field, Input, cn } from "@/components/ui";
import type { User } from "@/types";

// F01 : inscription d'un propriétaire, particulier ou société.
const schema = z
  .object({
    account_type: z.enum(["individual", "company"]),
    name: z.string().min(2, "Indiquez votre nom complet."),
    company_name: z.string().optional(),
    company_ifu: z.string().optional(),
    email: z.string().min(1, "L'e-mail est obligatoire.").email("Adresse e-mail invalide."),
    phone: z.string().min(8, "Numéro de téléphone invalide."),
    password: z.string().min(8, "Au moins 8 caractères."),
    password_confirmation: z.string(),
  })
  .refine((d) => d.password === d.password_confirmation, { path: ["password_confirmation"], message: "Les deux mots de passe ne correspondent pas." })
  .refine((d) => d.account_type === "individual" || (d.company_name ?? "").trim().length > 1, { path: ["company_name"], message: "La raison sociale est obligatoire pour une société." });
type Form = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [error, setError] = useState("");
  const { register, handleSubmit, watch, setValue, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { account_type: "individual" },
  });
  const type = watch("account_type");

  const onSubmit = async (values: Form) => {
    setError("");
    try {
      const res = await api.post<{ data: User }>("/register", values);
      setUser(res.data);
      router.replace("/owner");
    } catch (e) {
      setError(applyServerErrors(e, setFieldError));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <h1 className="text-xl font-bold text-slate-900">Créer un compte propriétaire</h1>
      <Alert>{error}</Alert>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
        {(["individual", "company"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setValue("account_type", t)} className={cn("rounded-md py-2 text-sm font-medium", type === t ? "bg-white text-brand-700 shadow" : "text-slate-600")}>
            {t === "individual" ? "Particulier" : "Société"}
          </button>
        ))}
      </div>
      <Field label={type === "company" ? "Nom du responsable" : "Nom complet"} error={errors.name?.message} required>
        <Input autoComplete="name" {...register("name")} />
      </Field>
      {type === "company" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Raison sociale" error={errors.company_name?.message} required>
            <Input {...register("company_name")} />
          </Field>
          <Field label="IFU" error={errors.company_ifu?.message}>
            <Input {...register("company_ifu")} />
          </Field>
        </div>
      )}
      <Field label="E-mail" error={errors.email?.message} required>
        <Input type="email" autoComplete="email" {...register("email")} />
      </Field>
      <Field label="Téléphone" error={errors.phone?.message} required>
        <Input type="tel" autoComplete="tel" placeholder="+229 97 00 00 00" {...register("phone")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mot de passe" error={errors.password?.message} hint="8 caractères minimum" required>
          <Input type="password" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field label="Confirmation" error={errors.password_confirmation?.message} required>
          <Input type="password" autoComplete="new-password" {...register("password_confirmation")} />
        </Field>
      </div>
      <Button type="submit" loading={isSubmitting} className="w-full">Créer mon compte</Button>
      <p className="text-center text-sm text-slate-600">
        Déjà inscrit ? <Link href="/login" className="font-medium text-brand-600 hover:underline">Se connecter</Link>
      </p>
    </form>
  );
}
