"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { api, download, qs } from "@/lib/api";
import { date, money } from "@/lib/format";
import { errorMessage } from "@/lib/forms";
import { Alert, Badge, Button, Cell, Empty, Input, LinkButton, Loading, PageHeader, Pagination, Row, Select, Table } from "@/components/ui";
import type { Expense, ExpenseCategory, Paginated, Property } from "@/types";

export default function ExpensesPage() {
  const [f, setF] = useState({ property: "", category: "", month: "", page: 1 });
  const { data, loading, error, reload } = useApi<Paginated<Expense>>(`/expenses${qs(f)}`);
  const properties = useApi<Paginated<Property>>("/properties?per_page=200");
  const categories = useApi<{ data: ExpenseCategory[] }>("/expense-categories");
  const [msg, setMsg] = useState("");

  // RG20 : annulation avec motif, jamais de suppression.
  const cancel = async (e: Expense) => {
    const reason = prompt(`Annuler la dépense de ${money(e.amount)} ? L'argent reviendra dans la ${e.funded_from_label.toLowerCase()}.\nMotif :`);
    if (!reason) return;
    try {
      await api.post(`/expenses/${e.id}/cancel`, { reason });
      reload();
    } catch (err) {
      setMsg(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Dépenses" subtitle="Réparations, entretien, charges… payées depuis la caisse du bien" actions={<LinkButton href="/owner/expenses/new">+ Saisir une dépense</LinkButton>} />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex">
        <Select value={f.property} onChange={(e) => setF({ ...f, property: e.target.value, page: 1 })} className="sm:w-56" aria-label="Bien">
          <option value="">Tous les biens</option>
          {properties.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, page: 1 })} className="sm:w-56" aria-label="Catégorie">
          <option value="">Toutes les catégories</option>
          {categories.data?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input type="month" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value, page: 1 })} className="col-span-2 sm:w-44" aria-label="Mois" />
      </div>
      <Alert>{msg}</Alert>
      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : !data?.data.length ? <Empty title="Aucune dépense enregistrée." /> : (
        <>
          <Table head={["Date", "Bien / logement", "Catégorie", "Description", "Payé par", "Montant", "Statut", ""]}>
            {data.data.map((e) => (
              <Row key={e.id}>
                <Cell>{date(e.spent_at)}</Cell>
                <Cell label="Bien" className="font-medium">{e.property?.name}{e.unit ? ` — ${e.unit.label}` : <span className="text-xs font-normal text-slate-400"> (parties communes)</span>}</Cell>
                <Cell label="Catégorie">{e.category?.name}</Cell>
                <Cell label="Description" className="text-slate-600">{e.description || "—"}{e.supplier && <span className="block text-xs text-slate-400">{e.supplier}</span>}</Cell>
                <Cell label="Payé par">{e.funded_from_label}</Cell>
                <Cell label="Montant" className="font-semibold tabular-nums">{money(e.amount)}</Cell>
                <Cell><Badge status={e.status}>{e.status_label}</Badge></Cell>
                <Cell>
                  <div className="flex gap-1">
                    {e.has_receipt && <Button variant="ghost" className="px-2 py-1" onClick={() => download(`/expenses/${e.id}/receipt`, undefined, true)}>Reçu</Button>}
                    {e.status === "approved" && <Button variant="ghostDanger" className="px-2 py-1" onClick={() => cancel(e)}>Annuler</Button>}
                  </div>
                </Cell>
              </Row>
            ))}
          </Table>
          <Pagination meta={data.meta} onPage={(page) => setF({ ...f, page })} />
        </>
      )}
    </>
  );
}
