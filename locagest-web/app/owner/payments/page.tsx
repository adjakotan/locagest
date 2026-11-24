"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { api, download, qs } from "@/lib/api";
import { date, money } from "@/lib/format";
import { errorMessage } from "@/lib/forms";
import { Alert, Badge, Button, Empty, Loading, PageHeader, Pagination, Select } from "@/components/ui";
import type { Paginated, Payment } from "@/types";

// F45 / F49 : file des paiements déclarés par les locataires, à confirmer ou refuser.
export default function PaymentsPage() {
  const [f, setF] = useState({ status: "declared", page: 1 });
  const { data, loading, error, reload } = useApi<Paginated<Payment>>(`/payments${qs(f)}`);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const act = async (p: Payment, action: "confirm" | "reject") => {
    let body: Record<string, unknown> = {};
    if (action === "reject") {
      const reason = prompt("Motif du refus (facultatif) :");
      if (reason === null) return;
      body = { reason };
    }
    setBusy(p.id);
    setMsg(null);
    try {
      await api.post(`/payments/${p.id}/${action}`, body);
      setMsg({ kind: "success", text: action === "confirm" ? `Paiement de ${money(p.amount)} confirmé : il est entré dans la caisse.` : "Paiement refusé." });
      reload();
    } catch (e) {
      setMsg({ kind: "error", text: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Paiements"
        subtitle="Un paiement déclaré par un locataire n'entre dans la caisse qu'après votre confirmation."
        actions={
          <Select value={f.status} onChange={(e) => setF({ status: e.target.value, page: 1 })} className="w-52" aria-label="Statut">
            <option value="declared">À confirmer</option>
            <option value="confirmed">Confirmés</option>
            <option value="rejected">Refusés</option>
            <option value="cancelled">Annulés</option>
          </Select>
        }
      />
      {msg && <div className="mb-4"><Alert kind={msg.kind}>{msg.text}</Alert></div>}
      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : !data?.data.length ? (
        <Empty title={f.status === "declared" ? "Aucun paiement en attente de confirmation." : "Aucun paiement."} />
      ) : (
        <div className="space-y-3">
          {data.data.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-lg font-semibold tabular-nums">{money(p.amount)} <span className="text-sm font-normal text-slate-500">· {p.method_label}{p.reference && ` · Réf. ${p.reference}`}</span></p>
                <p className="text-sm text-slate-700">{p.invoice?.lease?.tenant?.full_name} — {p.invoice?.lease?.unit?.label}, {p.invoice?.lease?.unit?.property?.name}</p>
                <p className="text-xs text-slate-500">
                  Payé le {date(p.paid_at)} · <Link href={`/owner/invoices/${p.invoice_id}`} className="text-brand-600 hover:underline">Facture {p.invoice?.invoice_number}</Link> (reste {money(p.invoice?.remaining)})
                  {p.note && <> · « {p.note} »</>}
                  {p.cancel_reason && <> · Motif : {p.cancel_reason}</>}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge status={p.status}>{p.status_label}</Badge>
                {p.has_proof && <Button variant="secondary" className="py-1.5" onClick={() => download(`/payments/${p.id}/proof`, undefined, true).catch((e) => setMsg({ kind: "error", text: errorMessage(e) }))}>Voir la preuve</Button>}
                {p.status === "declared" && (
                  <>
                    <Button variant="success" className="py-1.5" loading={busy === p.id} onClick={() => act(p, "confirm")}>Confirmer</Button>
                    <Button variant="ghostDanger" className="py-1.5" disabled={busy === p.id} onClick={() => act(p, "reject")}>Refuser</Button>
                  </>
                )}
              </div>
            </div>
          ))}
          <Pagination meta={data.meta} onPage={(page) => setF({ ...f, page })} />
        </div>
      )}
    </>
  );
}
