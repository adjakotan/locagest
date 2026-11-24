"use client";

import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { date, money } from "@/lib/format";
import { Alert, Badge, Card, Empty, LinkButton, Loading, PageHeader, Stat } from "@/components/ui";
import type { Invoice, Lease, Paginated } from "@/types";

interface MyLeases {
  tenant: { full_name: string };
  active_lease: Lease | null;
  owner: { name: string; phone: string | null } | null;
  leases: Lease[];
  balance_due: number;
}

// F70 / F72 : bail actif, solde dû, dernières factures.
export default function TenantHome() {
  const { data, loading, error } = useApi<MyLeases>("/me/leases");
  const invoices = useApi<Paginated<Invoice>>("/me/invoices?per_page=5");

  if (loading) return <Loading />;
  if (error || !data) return <Alert>{error}</Alert>;
  const l = data.active_lease;
  const toPay = invoices.data?.data.find((i) => i.status !== "paid");

  return (
    <>
      <PageHeader title={`Bonjour ${data.tenant.full_name}`} subtitle="Votre espace locataire" />
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Solde dû" value={money(data.balance_due)} tone={data.balance_due > 0 ? "bad" : "good"} hint={data.balance_due > 0 ? "à régler auprès de votre propriétaire" : "vous êtes à jour"} />
          <Stat label="Loyer mensuel" value={l ? money(l.rent_amount) : "—"} hint={l ? `à payer avant le ${l.due_day} du mois` : undefined} />
          <Stat label="Logement" value={<span className="text-base">{l ? l.unit?.label : "Aucun bail en cours"}</span>} hint={l?.unit?.property?.name} />
        </div>

        {toPay && (
          <Alert kind="info">
            Facture de {toPay.period_label} : reste <strong>{money(toPay.remaining)}</strong> à payer (échéance {date(toPay.due_date)}).{" "}
            <Link href={`/tenant/invoices/${toPay.id}`} className="font-semibold underline">J&apos;ai payé, je le déclare</Link>
          </Alert>
        )}

        {l && (
          <Card title="Mon bail">
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><dt className="text-slate-500">Début</dt><dd className="font-medium">{date(l.start_date)}</dd></div>
              <div><dt className="text-slate-500">Caution versée</dt><dd className="font-medium tabular-nums">{money(l.deposit_amount)}</dd></div>
              <div><dt className="text-slate-500">Propriétaire</dt><dd className="font-medium">{data.owner?.name}</dd></div>
              <div><dt className="text-slate-500">Téléphone</dt><dd className="font-medium">{data.owner?.phone ? <a href={`tel:${data.owner.phone}`} className="text-brand-700">{data.owner.phone}</a> : "—"}</dd></div>
            </dl>
          </Card>
        )}

        <Card title="Dernières factures" action={<Link href="/tenant/invoices" className="text-sm text-brand-600 hover:underline">Toutes mes factures</Link>}>
          {invoices.loading ? <Loading /> : !invoices.data?.data.length ? <Empty title="Aucune facture pour l'instant." /> : (
            <ul className="divide-y divide-slate-100">
              {invoices.data.data.map((i) => (
                <li key={i.id}>
                  <Link href={`/tenant/invoices/${i.id}`} className="flex items-center justify-between py-3 hover:bg-slate-50">
                    <div><p className="font-medium">{i.period_label}</p><p className="text-xs text-slate-500">{i.invoice_number}</p></div>
                    <div className="text-right"><p className="tabular-nums">{money(i.amount_due)}</p><Badge status={i.status}>{i.status_label}</Badge></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-wrap gap-2">
          <LinkButton href="/tenant/maintenance" variant="secondary">🛠️ Signaler un problème</LinkButton>
        </div>
      </div>
    </>
  );
}
