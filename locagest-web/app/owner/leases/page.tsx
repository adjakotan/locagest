"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { qs } from "@/lib/api";
import { date, money } from "@/lib/format";
import { Alert, Badge, Cell, Empty, Input, LinkButton, Loading, PageHeader, Pagination, Row, Select, Table } from "@/components/ui";
import type { Lease, Paginated } from "@/types";

export default function LeasesPage() {
  const [f, setF] = useState({ status: "active", search: "", page: 1 });
  const { data, loading, error } = useApi<Paginated<Lease>>(`/leases${qs(f)}`);

  return (
    <>
      <PageHeader title="Baux" actions={<LinkButton href="/owner/leases/new">+ Nouveau bail</LinkButton>} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Nom du locataire…" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value, page: 1 })} className="sm:max-w-xs" />
        <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} className="sm:w-48" aria-label="Statut">
          <option value="active">En cours</option>
          <option value="ended">Clôturés</option>
          <option value="">Tous</option>
        </Select>
      </div>
      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : !data?.data.length ? <Empty title="Aucun bail." /> : (
        <>
          <Table head={["Locataire", "Logement", "Début", "Loyer", "Échéance", "Statut"]}>
            {data.data.map((l) => (
              <Row key={l.id} href={`/owner/leases/${l.id}`}>
                <Cell className="font-medium text-slate-800">{l.tenant?.full_name}</Cell>
                <Cell label="Logement">{l.unit?.label} — {l.unit?.property?.name}</Cell>
                <Cell label="Début">{date(l.start_date)}{l.end_date && ` → ${date(l.end_date)}`}</Cell>
                <Cell label="Loyer" className="tabular-nums">{money(l.rent_amount)}</Cell>
                <Cell label="Échéance">le {l.due_day} du mois</Cell>
                <Cell><Badge status={l.status}>{l.status_label}</Badge></Cell>
              </Row>
            ))}
          </Table>
          <Pagination meta={data.meta} onPage={(page) => setF({ ...f, page })} />
        </>
      )}
    </>
  );
}
