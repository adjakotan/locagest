"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useApi } from "@/hooks/useApi";
import { api, download, qs } from "@/lib/api";
import { date } from "@/lib/format";
import { applyServerErrors, errorMessage } from "@/lib/forms";
import { Alert, Badge, Button, Empty, Field, Input, Loading, Modal, PageHeader, Pagination, Select, Textarea } from "@/components/ui";
import type { MaintenanceRequest, Paginated, Property } from "@/types";

type Form = { property_id: string; unit_id: string; title: string; description: string; priority: string; photo: FileList };

/** F80–F83 : liste et création des signalements (locataire ou propriétaire). */
export function MaintenanceList({ asOwner }: { asOwner: boolean }) {
  const [f, setF] = useState({ status: "", page: 1 });
  const { data, loading, error, reload } = useApi<Paginated<MaintenanceRequest>>(`/maintenance-requests${qs(f)}`);
  const properties = useApi<Paginated<Property>>(asOwner ? "/properties?per_page=200" : null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [msg, setMsg] = useState("");
  const form = useForm<Form>({ defaultValues: { priority: "normal" } });
  const selectedProperty = form.watch("property_id");
  const property = useApi<{ data: Property }>(asOwner && selectedProperty ? `/properties/${selectedProperty}` : null);

  const submit = async (v: Form) => {
    setFormError("");
    const fd = new FormData();
    (["property_id", "unit_id", "title", "description", "priority"] as const).forEach((k) => v[k] && fd.append(k, v[k]));
    if (v.photo?.[0]) fd.append("photo", v.photo[0]);
    try {
      await api.post("/maintenance-requests", fd);
      setCreating(false);
      form.reset({ priority: "normal" });
      reload();
    } catch (e) {
      setFormError(applyServerErrors(e, form.setError));
    }
  };

  const setStatus = async (r: MaintenanceRequest, status: string) => {
    try {
      await api.patch(`/maintenance-requests/${r.id}`, { status });
      reload();
    } catch (e) {
      setMsg(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Signalements"
        subtitle={asOwner ? "Pannes et problèmes signalés dans vos logements" : "Signalez un problème dans votre logement"}
        actions={<Button onClick={() => { setFormError(""); setCreating(true); }}>+ Nouveau signalement</Button>}
      />
      <Select value={f.status} onChange={(e) => setF({ status: e.target.value, page: 1 })} className="mb-4 sm:w-52" aria-label="Statut">
        <option value="">Tous</option>
        <option value="open">Ouverts</option>
        <option value="in_progress">En cours</option>
        <option value="resolved">Résolus</option>
      </Select>
      <Alert>{msg}</Alert>
      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : !data?.data.length ? <Empty title="Aucun signalement." /> : (
        <div className="space-y-3">
          {data.data.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{r.title}</p>
                  <p className="text-xs text-slate-500">
                    {r.property?.name} — {r.unit?.label ?? "Parties communes"}{r.tenant && ` · ${r.tenant.full_name}`} · signalé le {date(r.created_at)}{r.reported_by && ` par ${r.reported_by}`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {r.priority !== "normal" && <Badge status={r.priority}>{r.priority_label}</Badge>}
                  <Badge status={r.status}>{r.status_label}</Badge>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{r.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.has_photo && <Button variant="secondary" className="py-1.5" onClick={() => download(`/maintenance-requests/${r.id}/photo`, undefined, true)}>Voir la photo</Button>}
                {asOwner && r.status === "open" && <Button variant="secondary" className="py-1.5" onClick={() => setStatus(r, "in_progress")}>Prendre en charge</Button>}
                {asOwner && r.status !== "resolved" && <Button variant="success" className="py-1.5" onClick={() => setStatus(r, "resolved")}>Marquer résolu</Button>}
                {asOwner && r.status !== "resolved" && (
                  <Link href={`/owner/expenses/new?property=${r.property?.id}&request=${r.id}`} className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm text-brand-700 hover:bg-brand-50">Enregistrer la dépense de réparation</Link>
                )}
                {asOwner && r.status === "resolved" && <Button variant="ghost" className="py-1.5" onClick={() => setStatus(r, "open")}>Rouvrir</Button>}
              </div>
            </div>
          ))}
          <Pagination meta={data.meta} onPage={(page) => setF({ ...f, page })} />
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Nouveau signalement">
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
          <Alert>{formError}</Alert>
          {asOwner && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Bien" error={form.formState.errors.property_id?.message} required>
                <Select {...form.register("property_id", { required: "Choisissez le bien." })}>
                  <option value="">— Choisir —</option>
                  {properties.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <Field label="Logement">
                <Select {...form.register("unit_id")}>
                  <option value="">Parties communes</option>
                  {property.data?.data.units?.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                </Select>
              </Field>
            </div>
          )}
          <Field label="Titre" error={form.formState.errors.title?.message} required><Input placeholder="Fuite d'eau, prise électrique…" {...form.register("title", { required: "Donnez un titre." })} /></Field>
          <Field label="Description" error={form.formState.errors.description?.message} required><Textarea {...form.register("description", { required: "Décrivez le problème." })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Priorité">
              <Select {...form.register("priority")}>
                <option value="low">Faible</option>
                <option value="normal">Normale</option>
                <option value="urgent">Urgente</option>
              </Select>
            </Field>
            <Field label="Photo" error={form.formState.errors.photo?.message as string | undefined}><Input type="file" accept="image/*" capture="environment" {...form.register("photo")} /></Field>
          </div>
          <Button type="submit" loading={form.formState.isSubmitting} className="w-full">Envoyer</Button>
        </form>
      </Modal>
    </>
  );
}
