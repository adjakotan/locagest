"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { download, qs } from "@/lib/api";
import { date, money } from "@/lib/format";
import { errorMessage } from "@/lib/forms";
import { Alert, Badge, Button, Cell, Empty, Loading, PageHeader, Pagination, Row, Table } from "@/components/ui";
import type { Invoice, Paginated } from "@/types";

// F70 / F71 : mes factures et mes quittances.
export default function TenantInvoices() {
  const [page, setPage] = useState(1);
  const { data, loading, error } = useApi<Paginated<Invoice>>(`/me/invoices${qs({ page })}`);
  const [msg, setMsg] = useState("");

  return (
    <>
      <PageHeader title="Mes factures" subtitle="Téléchargez vos factures et vos quittances" />
      <Alert>{msg}</Alert>
      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : !data?.data.length ? <Empty title="Aucune facture." /> : (
        <>
          <Table head={["Mois", "Montant", "Payé", "Échéance", "Statut", "Quittance"]}>
            {data.data.map((i) => (
              <Row key={i.id} href={`/tenant/invoices/${i.id}`}>
                <Cell className="font-medium">{i.period_label}<span className="block text-xs font-normal text-slate-400">{i.invoice_number}</span></Cell>
                <Cell label="Montant" className="tabular-nums">{money(i.amount_due)}</Cell>
                <Cell label="Payé" className="tabular-nums">{money(i.amount_paid)}</Cell>
                <Cell label="Échéance">{date(i.due_date)}</Cell>
                <Cell><Badge status={i.status}>{i.status_label}</Badge></Cell>
                <Cell>
                  {i.receipt ? (
                    <Button variant="ghost" className="px-2 py-1 text-emerald-700" onClick={(e) => { e.stopPropagation(); download(`/payments/${i.receipt!.payment_id}/receipt`, `${i.receipt!.receipt_number}.pdf`).catch((err) => setMsg(errorMessage(err))); }}>
                      ⬇ {i.receipt.receipt_number}
                    </Button>
                  ) : <span className="text-xs text-slate-400">—</span>}
                </Cell>
              </Row>
            ))}
          </Table>
          <Pagination meta={data.meta} onPage={setPage} />
        </>
      )}
    </>
  );
}
