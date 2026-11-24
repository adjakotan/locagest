"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { qs } from "@/lib/api";
import { currentMonth, money } from "@/lib/format";
import { Banknote, Building2, Clock, LineChart, Plus, ReceiptText, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { Alert, Card, Empty, Input, LinkButton, Loading, PageHeader, Stat } from "@/components/ui";
import type { Dashboard } from "@/types";

export default function OwnerDashboard() {
  const [month, setMonth] = useState(currentMonth());
  const { data, loading, error } = useApi<Dashboard>(`/dashboard${qs({ month })}`);

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle={data?.month_label}
        actions={<Input type="month" value={month} onChange={(e) => setMonth(e.target.value || currentMonth())} className="w-44" aria-label="Mois" />}
      />
      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : data && (
        <div className="space-y-6">
          {data.units_count === 0 && (
            <Alert kind="info">
              Bienvenue ! Commencez par <Link href="/owner/properties/new" className="font-semibold underline">ajouter votre premier bien</Link> et ses logements.
            </Alert>
          )}
          {data.pending_payments_count > 0 && (
            <Alert kind="info">
              <Link href="/owner/payments" className="font-semibold underline">{data.pending_payments_count} paiement(s) déclaré(s) par vos locataires</Link> attendent votre confirmation.
            </Alert>
          )}

          {/* F60 */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={ReceiptText} label="Facturé ce mois" value={money(data.billed)} />
            <Stat icon={TrendingUp} label="Encaissé ce mois" value={money(data.collected)} tone="good" />
            <Stat icon={Clock} label="Reste à percevoir" value={money(data.outstanding)} tone={data.outstanding > 0 ? "warn" : "default"} hint="toutes périodes" />
            <Stat icon={Building2} label="Taux d'occupation" value={`${data.occupancy_rate} %`} hint={`${data.occupied_count} / ${data.units_count} logements`} />
          </div>

          {/* F64 */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={Wallet} label="Caisse principale" value={money(data.cash_main)} />
            <Stat icon={ShieldCheck} label="Réserve (imprévus)" value={money(data.cash_reserve)} />
            <Stat icon={Banknote} label="Dépenses du mois" value={money(data.expenses_month)} />
            <Stat icon={LineChart} label="Résultat net du mois" value={money(data.net_result_month)} tone={data.net_result_month >= 0 ? "good" : "bad"} />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* F61 */}
            <Card className="lg:col-span-3" title={`Locataires en retard (${data.late_count})`} action={<Link href="/owner/invoices?status=late" className="text-sm text-brand-600 hover:underline">Tout voir</Link>}>
              {data.late_invoices.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Aucun retard de paiement.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.late_invoices.slice(0, 8).map((l) => (
                    <li key={l.invoice_id}>
                      <Link href={`/owner/invoices/${l.invoice_id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{l.tenant}</p>
                          <p className="truncate text-xs text-slate-500">{l.unit} — {l.property} · {l.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums text-red-700">{money(l.remaining)}</p>
                          <p className="text-xs text-slate-500">{l.days_late} jour(s) de retard</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* F63 */}
            <Card className="lg:col-span-2" title="Encaissements et dépenses (12 mois)">
              <Chart data={data.chart} />
            </Card>
          </div>

          {/* F65 */}
          <Card title="Vos biens" action={<LinkButton href="/owner/properties/new" variant="secondary" className="py-1.5"><Plus className="h-4 w-4" />Ajouter un bien</LinkButton>}>
            {data.properties.length === 0 ? (
              <Empty title="Aucun bien pour l'instant." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.properties.map((p) => (
                  <Link key={p.id} href={`/owner/properties/${p.id}`} className="rounded-lg border border-slate-200 p-3 hover:border-brand-300 hover:bg-brand-50/40">
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.city} · {p.units_count} logement(s) · {p.occupancy_rate} % occupés</p>
                    <p className="mt-2 text-sm tabular-nums">Caisse : <strong>{money(p.main)}</strong> <span className="text-slate-500">· Réserve : {money(p.reserve)}</span></p>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function Chart({ data }: { data: Dashboard["chart"] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.collected, d.expenses]));
  return (
    <div>
      <div className="flex h-44 items-end gap-1.5">
        {data.map((d) => (
          <div key={d.month} className="flex h-full flex-1 items-end justify-center gap-0.5" title={`${d.label} — encaissé ${money(d.collected)}, dépenses ${money(d.expenses)}`}>
            <div className="w-1/2 rounded-t bg-brand-500" style={{ height: `${(d.collected / max) * 100}%` }} />
            <div className="w-1/2 rounded-t bg-amber-400" style={{ height: `${(d.expenses / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5 text-[10px] text-slate-400">
        {data.map((d) => <span key={d.month} className="flex-1 truncate text-center">{d.label.slice(0, 4)}</span>)}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> Encaissé</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Dépenses</span>
      </div>
    </div>
  );
}
