"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { date, money, PAYMENT_METHODS, today } from "@/lib/format";
import { applyServerErrors } from "@/lib/forms";
import { InvoiceDocuments } from "@/components/InvoiceDocuments";
import { Alert, Badge, Button, Card, Field, Input, Loading, Modal, PageHeader, Select } from "@/components/ui";
import type { Invoice } from "@/types";

type Form = { amount: number; paid_at: string; method: string; reference: string; note: string; proof: FileList };

// F49 / F73 : le locataire déclare un paiement avec sa preuve, puis suit son statut.
export default function TenantInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useApi<{ data: Invoice }>(`/me/invoices/${id}`);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState("");
  const form = useForm<Form>();

  if (loading && !data) return <Loading />;
  if (error || !data) return <Alert>{error}</Alert>;
  const inv = data.data;
  const pendingAmount = inv.payments?.filter((p) => p.status === "declared").reduce((s, p) => s + p.amount, 0) ?? 0;
  const canDeclare = inv.status !== "paid" && inv.remaining - pendingAmount > 0;

  const openForm = () => {
    form.reset({ amount: inv.remaining - pendingAmount, paid_at: today(), method: "mobile_money", reference: "", note: "" });
    setFormError("");
    setOpen(true);
  };

  const submit = async (v: Form) => {
    setFormError("");
    const fd = new FormData();
    fd.append("amount", String(v.amount));
    fd.append("paid_at", v.paid_at);
    fd.append("method", v.method);
    if (v.reference) fd.append("reference", v.reference);
    if (v.note) fd.append("note", v.note);
    if (v.proof?.[0]) fd.append("proof", v.proof[0]);
    try {
      await api.post(`/me/invoices/${inv.id}/payments`, fd);
      setOpen(false);
      setDone("Paiement déclaré. Votre propriétaire va le vérifier puis le confirmer.");
      reload();
    } catch (e) {
      setFormError(applyServerErrors(e, form.setError));
    }
  };

  return (
    <>
      <PageHeader
        back="/tenant/invoices"
        title={`Facture de ${inv.period_label}`}
        subtitle={`${inv.invoice_number} · ${inv.lease?.unit?.label} — ${inv.lease?.unit?.property?.name}`}
        actions={canDeclare && <Button onClick={openForm}>J&apos;ai payé : déclarer un paiement</Button>}
      />
      <div className="space-y-6">
        <Alert kind="success">{done}</Alert>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Statut</p><div className="mt-2"><Badge status={inv.status}>{inv.status_label}</Badge></div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Échéance</p><p className="mt-1 text-lg font-semibold">{date(inv.due_date)}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Total</p><p className="mt-1 text-lg font-semibold tabular-nums">{money(inv.amount_due)}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Reste à payer</p><p className="mt-1 text-lg font-semibold tabular-nums">{money(inv.remaining)}</p></div>
        </div>

        <InvoiceDocuments invoice={inv} />

        <Card title="Détail">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {inv.items?.map((it) => (
                <tr key={it.id}><td className="py-2.5">{it.label}</td><td className="py-2.5 text-right tabular-nums">{money(it.amount)}</td></tr>
              ))}
              <tr className="font-semibold"><td className="pt-3">Total</td><td className="pt-3 text-right tabular-nums">{money(inv.amount_due)}</td></tr>
            </tbody>
          </table>
        </Card>

        <Card title="Mes paiements">
          {!inv.payments?.length ? <p className="py-4 text-center text-sm text-slate-500">Aucun paiement.</p> : (
            <ul className="divide-y divide-slate-100">
              {inv.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium tabular-nums">{money(p.amount)} <span className="font-normal text-slate-500">· {p.method_label} · {date(p.paid_at)}</span></p>
                    {p.status === "rejected" && p.cancel_reason && <p className="text-xs text-red-600">Motif du refus : {p.cancel_reason}</p>}
                  </div>
                  <Badge status={p.status}>{p.status_label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Déclarer un paiement">
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
          <Alert>{formError}</Alert>
          <p className="text-sm text-slate-600">LocaGest n&apos;encaisse pas d&apos;argent : indiquez le paiement que vous avez fait à votre propriétaire (espèces, Mobile Money, virement).</p>
          <Field label="Montant payé (FCFA)" error={form.formState.errors.amount?.message} required><Input type="number" min={1} {...form.register("amount", { required: "Indiquez le montant." })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" required><Input type="date" max={today()} {...form.register("paid_at")} /></Field>
            <Field label="Moyen" required><Select {...form.register("method")}>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
          </div>
          <Field label="Référence" hint="ID de la transaction Mobile Money ou du virement"><Input {...form.register("reference")} /></Field>
          <Field label="Preuve (capture du SMS, reçu)" error={form.formState.errors.proof?.message as string | undefined}><Input type="file" accept="image/*,application/pdf" {...form.register("proof")} /></Field>
          <Field label="Message"><Input {...form.register("note")} /></Field>
          <Button type="submit" loading={form.formState.isSubmitting} className="w-full">Envoyer la déclaration</Button>
        </form>
      </Modal>
    </>
  );
}
