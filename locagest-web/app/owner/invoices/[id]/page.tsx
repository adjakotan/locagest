"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useApi } from "@/hooks/useApi";
import { api, download } from "@/lib/api";
import { date, ITEM_TYPES, money, PAYMENT_METHODS, today } from "@/lib/format";
import { applyServerErrors, errorMessage } from "@/lib/forms";
import { InvoiceDocuments } from "@/components/InvoiceDocuments";
import { Alert, Badge, Button, Card, Field, Input, Loading, Modal, PageHeader, Select } from "@/components/ui";
import type { Invoice, Payment } from "@/types";

const paymentSchema = z.object({
  amount: z.coerce.number().int().positive("Le montant doit être supérieur à 0."),
  paid_at: z.string().min(1, "Obligatoire."),
  method: z.enum(["cash", "mobile_money", "transfer"]),
  reference: z.string().optional(),
  note: z.string().optional(),
});
const itemSchema = z.object({
  type: z.string().min(1),
  label: z.string().min(2, "Décrivez la ligne."),
  amount: z.coerce.number().int().refine((v) => v !== 0, "Le montant ne peut pas être 0."),
});

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useApi<{ data: Invoice }>(`/invoices/${id}`);
  const [modal, setModal] = useState<"payment" | "item" | null>(null);
  const [formError, setFormError] = useState("");
  const [actionMsg, setActionMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const pay = useForm<z.infer<typeof paymentSchema>>({ resolver: zodResolver(paymentSchema) });
  const item = useForm<z.infer<typeof itemSchema>>({ resolver: zodResolver(itemSchema), defaultValues: { type: "water" } });

  if (loading && !data) return <Loading />;
  if (error || !data) return <Alert>{error}</Alert>;
  const inv = data.data;

  // F41 : 3 clics — « Enregistrer un paiement » (montant prérempli) → « Valider ».
  const openPayment = () => {
    pay.reset({ amount: inv.remaining, paid_at: today(), method: "cash", reference: "", note: "" });
    setFormError("");
    setModal("payment");
  };
  const submitPayment = async (v: z.infer<typeof paymentSchema>) => {
    setFormError("");
    try {
      const res = await api.post<{ data: Payment }>(`/invoices/${inv.id}/payments`, v);
      setModal(null);
      setActionMsg({ kind: "success", text: res.data.receipt_number ? `Paiement enregistré. Facture soldée : quittance ${res.data.receipt_number} générée.` : "Paiement enregistré." });
      reload();
    } catch (e) {
      setFormError(applyServerErrors(e, pay.setError));
    }
  };

  const submitItem = async (v: z.infer<typeof itemSchema>) => {
    setFormError("");
    try {
      await api.post(`/invoices/${inv.id}/items`, v);
      setModal(null);
      item.reset({ type: "water", label: "", amount: undefined });
      reload();
    } catch (e) {
      setFormError(applyServerErrors(e, item.setError));
    }
  };

  // F44 : annulation avec motif.
  const cancelPayment = async (p: Payment) => {
    const reason = prompt(`Annuler le paiement de ${money(p.amount)} du ${date(p.paid_at)} ?\nIndiquez le motif :`);
    if (!reason) return;
    try {
      await api.post(`/payments/${p.id}/cancel`, { reason });
      setActionMsg({ kind: "success", text: "Paiement annulé ; la caisse a été corrigée." });
      reload();
    } catch (e) {
      setActionMsg({ kind: "error", text: errorMessage(e) });
    }
  };

  const confirmPayment = async (p: Payment, ok: boolean) => {
    try {
      if (ok) await api.post(`/payments/${p.id}/confirm`);
      else {
        const reason = prompt("Motif du refus (facultatif) :") ?? undefined;
        await api.post(`/payments/${p.id}/reject`, { reason });
      }
      reload();
    } catch (e) {
      setActionMsg({ kind: "error", text: errorMessage(e) });
    }
  };

  return (
    <>
      <PageHeader
        back="/owner/invoices"
        title={`Facture ${inv.invoice_number}`}
        subtitle={<>{inv.period_label} · <Link href={`/owner/tenants/${inv.lease?.tenant?.id}`} className="hover:underline">{inv.lease?.tenant?.full_name}</Link> · {inv.lease?.unit?.label} — {inv.lease?.unit?.property?.name}</>}
        actions={inv.status !== "paid" && <Button onClick={openPayment}>+ Enregistrer un paiement</Button>}
      />
      <div className="space-y-6">
        {actionMsg && <Alert kind={actionMsg.kind}>{actionMsg.text}</Alert>}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Statut</p><div className="mt-2"><Badge status={inv.status}>{inv.status_label}</Badge>{inv.days_late > 0 && <span className="ml-2 text-xs text-red-600">{inv.days_late} jour(s)</span>}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Échéance</p><p className="mt-1 text-lg font-semibold">{date(inv.due_date)}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Payé</p><p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700">{money(inv.amount_paid)}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase text-slate-500">Reste à payer</p><p className="mt-1 text-lg font-semibold tabular-nums">{money(inv.remaining)}</p></div>
        </div>

        <InvoiceDocuments invoice={inv} share />

        {/* F46 / F47 */}
        <Card title="Détail de la facture" action={inv.status !== "paid" && <Button variant="secondary" className="py-1.5" onClick={() => { setFormError(""); setModal("item"); }}>+ Ajouter une ligne</Button>}>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {inv.items?.map((it) => (
                <tr key={it.id}>
                  <td className="py-2.5">{it.label}<span className="ml-2 text-xs text-slate-400">{it.type_label}</span></td>
                  <td className={`py-2.5 text-right tabular-nums ${it.amount < 0 ? "text-red-600" : ""}`}>{money(it.amount)}</td>
                </tr>
              ))}
              <tr className="font-semibold"><td className="pt-3">Total</td><td className="pt-3 text-right tabular-nums">{money(inv.amount_due)}</td></tr>
            </tbody>
          </table>
          {inv.amount_paid > 0 && inv.status !== "paid" && <p className="mt-3 text-xs text-slate-500">Facture déjà payée en partie : les lignes existantes ne peuvent plus être modifiées, ajoutez une ligne de correction si besoin.</p>}
        </Card>

        <Card title="Paiements">
          {!inv.payments?.length ? <p className="py-4 text-center text-sm text-slate-500">Aucun paiement pour l&apos;instant.</p> : (
            <ul className="divide-y divide-slate-100">
              {inv.payments.map((p) => (
                <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium tabular-nums">{money(p.amount)} <span className="font-normal text-slate-500">· {p.method_label} · {date(p.paid_at)}</span></p>
                    <p className="text-xs text-slate-500">
                      {p.reference && <>Réf. {p.reference} · </>}
                      {p.declared_by_tenant ? "Déclaré par le locataire" : `Saisi par ${p.recorded_by ?? "—"}`}
                      {p.receipt_number && <> · Quittance {p.receipt_number}</>}
                      {p.cancel_reason && <> · Motif : {p.cancel_reason}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={p.status}>{p.status_label}</Badge>
                    {p.has_proof && <Button variant="ghost" className="py-1" onClick={() => download(`/payments/${p.id}/proof`, undefined, true)}>Preuve</Button>}
                    {p.status === "declared" && (
                      <>
                        <Button variant="success" className="py-1" onClick={() => confirmPayment(p, true)}>Confirmer</Button>
                        <Button variant="ghostDanger" className="py-1" onClick={() => confirmPayment(p, false)}>Refuser</Button>
                      </>
                    )}
                    {p.status === "confirmed" && <Button variant="ghostDanger" className="py-1" onClick={() => cancelPayment(p)}>Annuler</Button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={modal === "payment"} onClose={() => setModal(null)} title="Enregistrer un paiement">
        <form onSubmit={pay.handleSubmit(submitPayment)} className="space-y-4" noValidate>
          <Alert>{formError}</Alert>
          <Field label={`Montant (reste dû : ${money(inv.remaining)})`} error={pay.formState.errors.amount?.message} required>
            <Input type="number" min={1} max={inv.remaining} inputMode="numeric" autoFocus {...pay.register("amount")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date du paiement" error={pay.formState.errors.paid_at?.message} required><Input type="date" max={today()} {...pay.register("paid_at")} /></Field>
            <Field label="Moyen" required><Select {...pay.register("method")}>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
          </div>
          <Field label="Référence" hint="Ex. ID de transaction Mobile Money" error={pay.formState.errors.reference?.message}><Input {...pay.register("reference")} /></Field>
          <Field label="Note"><Input {...pay.register("note")} /></Field>
          <Button type="submit" loading={pay.formState.isSubmitting} className="w-full">Valider le paiement</Button>
        </form>
      </Modal>

      <Modal open={modal === "item"} onClose={() => setModal(null)} title="Ajouter une ligne">
        <form onSubmit={item.handleSubmit(submitItem)} className="space-y-4" noValidate>
          <Alert>{formError}</Alert>
          <Field label="Type" required><Select {...item.register("type")}>{ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
          <Field label="Libellé" error={item.formState.errors.label?.message} required><Input placeholder="Eau — part de la facture SONEB d'octobre" {...item.register("label")} /></Field>
          <Field label="Montant (FCFA)" error={item.formState.errors.amount?.message} hint="Négatif uniquement pour une correction" required><Input type="number" {...item.register("amount")} /></Field>
          <Button type="submit" loading={item.formState.isSubmitting} className="w-full">Ajouter</Button>
        </form>
      </Modal>
    </>
  );
}
