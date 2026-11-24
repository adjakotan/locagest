"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { api, qs } from "@/lib/api";
import { currentMonth, date, INVOICE_STATUSES, money } from "@/lib/format";
import { errorMessage } from "@/lib/forms";
import { Alert, Badge, Button, Cell, Empty, Input, Loading, PageHeader, Pagination, Row, Select, Table } from "@/components/ui";
import type { Invoice, Paginated, Property } from "@/types";

// F45 : liste filtrable des factures (mois, bien, statut).
function InvoicesList() {
  const params = useSearchParams();
  const initialStatus = params.get("status") ?? "";
  const [f, setF] = useState({ month: initialStatus ? "" : currentMonth(), property: "", status: initialStatus, page: 1 });
  const { data, loading, error, reload } = useApi<Paginated<Invoice>>(`/invoices${qs(f)}`);
  const properties = useApi<Paginated<Property>>("/properties?per_page=200");
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    setMsg(null);
    try {
      const res = await api.post<{ message: string }>("/invoices/generate", { month: f.month || currentMonth() });
      setMsg({ kind: "success", text: res.message });
      reload();
    } catch (e) {
      setMsg({ kind: "error", text: errorMessage(e) });
    } finally {
      setGenerating(false);
    }
  };

  const totals = data?.data.reduce((a, i) => ({ due: a.due + i.amount_due, paid: a.paid + i.amount_paid }), { due: 0, paid: 0 });

  return (
    <>
      <PageHeader
        title="Factures"
        subtitle="Créées automatiquement chaque mois pour chaque bail en cours"
        actions={<Button variant="secondary" loading={generating} onClick={generate} title="Même traitement que la tâche automatique quotidienne">Générer les factures du mois</Button>}
      />
      {msg && <div className="mb-4"><Alert kind={msg.kind}>{msg.text}</Alert></div>}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex">
        <Input type="month" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value, page: 1 })} className="sm:w-44" aria-label="Mois" />
        <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} className="sm:w-52" aria-label="Statut">
          <option value="">Tous les statuts</option>
          {INVOICE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <Select value={f.property} onChange={(e) => setF({ ...f, property: e.target.value, page: 1 })} className="col-span-2 sm:w-56" aria-label="Bien">
          <option value="">Tous les biens</option>
          {properties.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        {(f.month || f.status || f.property) && <Button variant="ghost" onClick={() => setF({ month: "", property: "", status: "", page: 1 })}>Effacer</Button>}
      </div>
      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : !data?.data.length ? <Empty title="Aucune facture pour ces critères." /> : (
        <>
          <Table head={["Locataire", "Logement", "Mois", "Échéance", "Montant", "Reste", "Statut"]}>
            {data.data.map((i) => (
              <Row key={i.id} href={`/owner/invoices/${i.id}`}>
                <Cell className="font-medium text-slate-800">{i.lease?.tenant?.full_name}<span className="block text-xs font-normal text-slate-400">{i.invoice_number}</span></Cell>
                <Cell label="Logement">{i.lease?.unit?.label} — {i.lease?.unit?.property?.name}</Cell>
                <Cell label="Mois">{i.period_label}</Cell>
                <Cell label="Échéance">{date(i.due_date)}</Cell>
                <Cell label="Montant" className="tabular-nums">{money(i.amount_due)}</Cell>
                <Cell label="Reste" className={i.remaining > 0 ? "font-semibold tabular-nums text-slate-900" : "tabular-nums text-slate-400"}>{money(i.remaining)}</Cell>
                <Cell><Badge status={i.status}>{i.status_label}</Badge>{i.days_late > 0 && <span className="ml-1 text-xs text-red-600">{i.days_late} j</span>}</Cell>
              </Row>
            ))}
          </Table>
          {totals && <p className="mt-3 text-right text-sm text-slate-600">Sur cette page : facturé <strong>{money(totals.due)}</strong> · payé <strong>{money(totals.paid)}</strong></p>}
          <Pagination meta={data.meta} onPage={(page) => setF({ ...f, page })} />
        </>
      )}
    </>
  );
}

export default function InvoicesPage() {
  return <Suspense fallback={<Loading />}><InvoicesList /></Suspense>;
}
