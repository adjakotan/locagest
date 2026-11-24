"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useApi } from "@/hooks/useApi";
import { api, qs } from "@/lib/api";
import { date, money, today } from "@/lib/format";
import { applyServerErrors } from "@/lib/forms";
import { Alert, Badge, Button, Card, Cell, Empty, Field, Input, Loading, Modal, PageHeader, Row, Table, Textarea } from "@/components/ui";
import type { Invoice, Lease, Paginated } from "@/types";

type EndForm = { end_date: string; deposit_returned: number; deposit_deductions_note: string };

export default function LeasePage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useApi<{ data: Lease }>(`/leases/${id}`);
  const lease = data?.data;
  const invoices = useApi<Paginated<Invoice>>(lease ? `/invoices${qs({ lease: lease.id, per_page: 50 })}` : null);
  const [closing, setClosing] = useState(false);
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm<EndForm>();

  if (loading && !data) return <Loading />;
  if (error || !lease) return <Alert>{error}</Alert>;

  const returned = Number(watch("deposit_returned") ?? lease.deposit_amount);
  const retained = Math.max(0, lease.deposit_amount - (isNaN(returned) ? 0 : returned));
  const leaseInvoices = invoices.data?.data ?? [];

  // F33 / F35 : clôture et restitution de la caution.
  const onEnd = async (v: EndForm) => {
    setFormError("");
    try {
      await api.post(`/leases/${lease.id}/end`, { ...v, deposit_returned: Number(v.deposit_returned) });
      setClosing(false);
      reload();
    } catch (e) {
      setFormError(applyServerErrors(e, setError));
    }
  };

  return (
    <>
      <PageHeader
        back="/owner/leases"
        title={`Bail — ${lease.tenant?.full_name}`}
        subtitle={<><Link href={`/owner/units/${lease.unit_id}`} className="hover:underline">{lease.unit?.label} — {lease.unit?.property?.name}</Link></>}
        actions={lease.status === "active" && <Button variant="danger" onClick={() => setClosing(true)}>Clôturer le bail</Button>}
      />
      <div className="space-y-6">
        <Card>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div><dt className="text-slate-500">Statut</dt><dd className="mt-1"><Badge status={lease.status}>{lease.status_label}</Badge></dd></div>
            <div><dt className="text-slate-500">Début</dt><dd className="mt-1 font-medium">{date(lease.start_date)}</dd></div>
            <div><dt className="text-slate-500">Fin</dt><dd className="mt-1 font-medium">{date(lease.end_date)}</dd></div>
            <div><dt className="text-slate-500">Échéance</dt><dd className="mt-1 font-medium">le {lease.due_day} du mois</dd></div>
            <div><dt className="text-slate-500">Loyer</dt><dd className="mt-1 font-medium tabular-nums">{money(lease.rent_amount)}</dd></div>
            <div><dt className="text-slate-500">Caution</dt><dd className="mt-1 font-medium tabular-nums">{money(lease.deposit_amount)}</dd></div>
            <div><dt className="text-slate-500">Pénalité de retard</dt><dd className="mt-1 font-medium tabular-nums">{lease.late_fee ? money(lease.late_fee) : "Aucune"}</dd></div>
            <div><dt className="text-slate-500">Locataire</dt><dd className="mt-1 font-medium"><Link href={`/owner/tenants/${lease.tenant_id}`} className="text-brand-700 hover:underline">{lease.tenant?.full_name}</Link></dd></div>
          </dl>
          {lease.status === "ended" && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
              Caution restituée : <strong>{money(lease.deposit_returned)}</strong>
              {lease.deposit_amount - (lease.deposit_returned ?? 0) > 0 && <> · Retenue : <strong>{money(lease.deposit_amount - (lease.deposit_returned ?? 0))}</strong> ({lease.deposit_deductions_note})</>}
            </div>
          )}
        </Card>

        <Card title="Factures de ce bail">
          {invoices.loading ? <Loading /> : !leaseInvoices.length ? <Empty title="Aucune facture." /> : (
            <Table head={["Mois", "N°", "Montant", "Payé", "Statut"]}>
              {leaseInvoices.map((i) => (
                <Row key={i.id} href={`/owner/invoices/${i.id}`}>
                  <Cell className="font-medium">{i.period_label}</Cell>
                  <Cell label="N°" className="text-slate-500">{i.invoice_number}</Cell>
                  <Cell label="Montant" className="tabular-nums">{money(i.amount_due)}</Cell>
                  <Cell label="Payé" className="tabular-nums">{money(i.amount_paid)}</Cell>
                  <Cell><Badge status={i.status}>{i.status_label}</Badge></Cell>
                </Row>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <Modal open={closing} onClose={() => setClosing(false)} title="Clôturer le bail">
        <form onSubmit={handleSubmit(onEnd)} className="space-y-4" noValidate>
          <Alert>{formError}</Alert>
          <Field label="Date de fin" error={errors.end_date?.message} required><Input type="date" defaultValue={today()} {...register("end_date", { required: "Obligatoire." })} /></Field>
          <Field label={`Caution restituée (sur ${money(lease.deposit_amount)})`} error={errors.deposit_returned?.message}>
            <Input type="number" min={0} max={lease.deposit_amount} defaultValue={lease.deposit_amount} {...register("deposit_returned")} />
          </Field>
          {retained > 0 && (
            <>
              <Alert kind="info">Retenue de <strong>{money(retained)}</strong> : ce montant entrera dans la caisse principale du bien.</Alert>
              <Field label="Motif des retenues" error={errors.deposit_deductions_note?.message} required><Textarea placeholder="Dégâts constatés, loyers impayés…" {...register("deposit_deductions_note")} /></Field>
            </>
          )}
          <p className="text-xs text-slate-500">Le logement redeviendra libre et aucune facture ne sera plus créée après la date de fin.</p>
          <Button type="submit" variant="danger" loading={isSubmitting}>Confirmer la clôture</Button>
        </form>
      </Modal>
    </>
  );
}
