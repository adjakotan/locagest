"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { applyServerErrors } from "@/lib/forms";
import { Alert, Button, Card, Field, Input, PageHeader } from "@/components/ui";
import type { User } from "@/types";

// F05 : modification du profil et du mot de passe.
const profileSchema = z.object({
  name: z.string().min(2, "Nom trop court."),
  email: z.string().email("Adresse e-mail invalide."),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  company_ifu: z.string().optional(),
});
const passwordSchema = z
  .object({ current_password: z.string().min(1, "Obligatoire."), password: z.string().min(8, "Au moins 8 caractères."), password_confirmation: z.string() })
  .refine((d) => d.password === d.password_confirmation, { path: ["password_confirmation"], message: "Les deux mots de passe ne correspondent pas." });

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [msg, setMsg] = useState({ profile: "", password: "", error: "" });

  const profile = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name, email: user?.email, phone: user?.phone ?? "", company_name: user?.company_name ?? "", company_ifu: user?.company_ifu ?? "" },
  });
  const password = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) });

  const saveProfile = async (v: z.infer<typeof profileSchema>) => {
    setMsg({ profile: "", password: "", error: "" });
    try {
      const res = await api.put<{ data: User }>("/user/profile", v);
      setUser(res.data);
      setMsg((m) => ({ ...m, profile: "Profil enregistré." }));
    } catch (e) {
      setMsg((m) => ({ ...m, error: applyServerErrors(e, profile.setError) }));
    }
  };

  const savePassword = async (v: z.infer<typeof passwordSchema>) => {
    setMsg({ profile: "", password: "", error: "" });
    try {
      await api.put("/user/password", v);
      password.reset();
      setMsg((m) => ({ ...m, password: "Mot de passe modifié." }));
    } catch (e) {
      setMsg((m) => ({ ...m, error: applyServerErrors(e, password.setError) }));
    }
  };

  if (!user) return null;

  return (
    <>
      <PageHeader title="Mon profil" subtitle={user.role_label} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Informations">
          <form onSubmit={profile.handleSubmit(saveProfile)} className="space-y-4" noValidate>
            <Alert kind="success">{msg.profile}</Alert>
            <Alert>{msg.error}</Alert>
            <Field label="Nom" error={profile.formState.errors.name?.message} required><Input {...profile.register("name")} /></Field>
            <Field label="E-mail" error={profile.formState.errors.email?.message} required><Input type="email" {...profile.register("email")} /></Field>
            <Field label="Téléphone" error={profile.formState.errors.phone?.message}><Input type="tel" {...profile.register("phone")} /></Field>
            {user.account_type === "company" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Raison sociale"><Input {...profile.register("company_name")} /></Field>
                <Field label="IFU"><Input {...profile.register("company_ifu")} /></Field>
              </div>
            )}
            <Button type="submit" loading={profile.formState.isSubmitting}>Enregistrer</Button>
          </form>
        </Card>
        <Card title="Mot de passe">
          <form onSubmit={password.handleSubmit(savePassword)} className="space-y-4" noValidate>
            <Alert kind="success">{msg.password}</Alert>
            <Field label="Mot de passe actuel" error={password.formState.errors.current_password?.message} required><Input type="password" autoComplete="current-password" {...password.register("current_password")} /></Field>
            <Field label="Nouveau mot de passe" error={password.formState.errors.password?.message} required><Input type="password" autoComplete="new-password" {...password.register("password")} /></Field>
            <Field label="Confirmation" error={password.formState.errors.password_confirmation?.message} required><Input type="password" autoComplete="new-password" {...password.register("password_confirmation")} /></Field>
            <Button type="submit" loading={password.formState.isSubmitting}>Changer le mot de passe</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
