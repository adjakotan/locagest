"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { date, money } from "@/lib/format";
import { errorMessage } from "@/lib/forms";
import { TenantForm } from "@/components/forms/TenantForm";
import { Alert, Badge, Button, Card, Cell, Empty, LinkButton, Loading, Modal, PageHeader, Row, Stat, Table } from "@/components/ui";
import type { Invoice, Payment, Tenant } from "@/types";

// F22 : fiche locataire — baux, factures, paiements, solde dû. F04 : invitation.
export default function TenantPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useApi<{ data: Tenant; invoices: Invoice[]; payments: Payment[] }>(`/tenants/${id}`);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string; url?: string } | null>(null);
  const [inviting, setInviting] = useState(false);

  if (loading && !data) return <Loading />;
  if (error || !data) return <Alert>{error}</Alert>;
  const t = data.data;

  const invite = async () => {
    setInviting(true);
    setMsg(null);
    try {
      const res = await api.post<{ message: string; url: string | null }>(`/tenants/${t.id}/invite`);
      setMsg({ kind: "success", text: res.message, url: res.url ?? undefined });
      reload();
    } catch (e) {
      setMsg({ kind: "error", text: errorMessage(e) });
    } finally {
      setInviting(false);
    }
  };

  return (
    <>
      <PageHeader
        back="/owner/tenants"
        title={t.full_name}
        subtitle={`${t.phone}${t.email ? " · " + t.email : ""}`}
        actions={
          <>
            {!t.active_lease && <LinkButton href={`/owner/leases/new?tenant=${t.id}`}>Créer un bail</LinkButton>}
            {!t.has_account && <Button variant="secondary" loading={inviting} onClick={invite}>{t.invitation_pending ? "Renvoyer l'invitation" : "Inviter dans son espace"}</Button>}
            <Button variant="secondary" onClick={() => setEditing(true)}>Modifier</Button>
          </>
        }
      />
      <div className="space-y-6">
        {msg && (
          <Alert kind={msg.kind}>
            {msg.text}
            {msg.url && <span className="mt-1 block break-all text-xs">Lien (développement) : <a href={msg.url} className="underline">{msg.url}</a></span>}
          </Alert>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Solde dû" value={money(t.balance_due)} tone={(t.balance_due ?? 0) > 0 ? "bad" : "good"} />
          <Stat label="Logement" value={<span className="text-base">{t.active_lease ? t.active_lease.unit?.label : "—"}</span>} hint={t.active_lease?.unit?.property?.name} />
          <Stat label="Pièce d'identité" value={<span className="text-base">{t.id_number || "—"}</span>} />
          <Stat label="Compte en ligne" value={<span className="text-base">{t.has_account ? "Actif" : t.invitation_pending ? "Invitation envoyée" : "Aucun"}</span>} />
        </div>
        {t.emergency_contact && <p className="text-sm text-slate-600">Contact d&apos;urgence : {t.emergency_contact}</p>}

        <Card title="Baux">
          {!t.leases?.length ? <Empty title="Aucun bail." /> : (
            <Table head={["Logement", "Début", "Fin", "Loyer", "Statut"]}>
              {t.leases.map((l) => (
                <Row key={l.id} href={`/owner/leases/${l.id}`}>
                  <Cell className="font-medium">{l.unit?.label} — {l.unit?.property?.name}</Cell>
                  <Cell label="Début">{date(l.start_date)}</Cell>
                  <Cell label="Fin">{date(l.end_date)}</Cell>
                  <Cell label="Loyer" className="tabular-nums">{money(l.rent_amount)}</Cell>
                  <Cell><Badge status={l.status}>{l.status_label}</Badge></Cell>
                </Row>
              ))}
            </Table>
          )}
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Factures">
            {!data.invoices.length ? <Empty title="Aucune facture." /> : (
              <ul className="divide-y divide-slate-100">
                {data.invoices.map((i) => (
                  <li key={i.id}>
                    <Link href={`/owner/invoices/${i.id}`} className="flex items-center justify-between py-2.5 hover:bg-slate-50">
                      <div><p className="font-medium">{i.period_label}</p><p className="text-xs text-slate-500">{i.invoice_number}</p></div>
                      <div className="text-right"><p className="tabular-nums">{money(i.amount_due)}</p><Badge status={i.status}>{i.status_label}</Badge></div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Paiements">
            {!data.payments.length ? <Empty title="Aucun paiement." /> : (
              <ul className="divide-y divide-slate-100">
                {data.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5">
                    <div><p className="font-medium tabular-nums">{money(p.amount)}</p><p className="text-xs text-slate-500">{date(p.paid_at)} · {p.method_label}</p></div>
                    <Badge status={p.status}>{p.status_label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Modifier le locataire">
        <TenantForm tenant={t} onSaved={() => { setEditing(false); reload(); }} />
      </Modal>
    </>
  );
}
