"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { qs } from "@/lib/api";
import { money } from "@/lib/format";
import { Alert, Cell, Empty, Input, LinkButton, Loading, PageHeader, Pagination, Row, Table } from "@/components/ui";
import type { Paginated, Tenant } from "@/types";

// F21 : recherche par nom ou téléphone.
export default function TenantsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, error } = useApi<Paginated<Tenant>>(`/tenants${qs({ search, page })}`);

  return (
    <>
      <PageHeader title="Locataires" actions={<LinkButton href="/owner/tenants/new">+ Nouveau locataire</LinkButton>} />
      <Input placeholder="Rechercher par nom ou téléphone…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="mb-4 sm:max-w-sm" />
      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : !data?.data.length ? (
        <Empty title={search ? "Aucun locataire trouvé." : "Aucun locataire enregistré."}>{!search && <LinkButton href="/owner/tenants/new">Ajouter un locataire</LinkButton>}</Empty>
      ) : (
        <>
          <Table head={["Nom", "Téléphone", "Logement", "Solde dû", "Compte"]}>
            {data.data.map((t) => (
              <Row key={t.id} href={`/owner/tenants/${t.id}`}>
                <Cell className="font-medium text-slate-800">{t.full_name}</Cell>
                <Cell label="Tél.">{t.phone}</Cell>
                <Cell label="Logement">{t.active_lease ? `${t.active_lease.unit?.label} — ${t.active_lease.unit?.property?.name}` : <span className="text-slate-400">Aucun bail en cours</span>}</Cell>
                <Cell label="Solde dû" className={(t.balance_due ?? 0) > 0 ? "font-semibold tabular-nums text-red-700" : "tabular-nums"}>{money(t.balance_due)}</Cell>
                <Cell label="Compte">{t.has_account ? "✓ Actif" : t.invitation_pending ? "Invité" : "—"}</Cell>
              </Row>
            ))}
          </Table>
          <Pagination meta={data.meta} onPage={setPage} />
        </>
      )}
    </>
  );
}
