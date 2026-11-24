"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { qs } from "@/lib/api";
import { Alert, Empty, Input, LinkButton, Loading, PageHeader, Pagination } from "@/components/ui";
import type { Paginated, Property } from "@/types";

export default function PropertiesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, error } = useApi<Paginated<Property>>(`/properties${qs({ search, page })}`);

  return (
    <>
      <PageHeader title="Mes biens" subtitle="Immeubles, maisons, cours…" actions={<LinkButton href="/owner/properties/new">+ Nouveau bien</LinkButton>} />
      <Input placeholder="Rechercher par nom, ville ou quartier…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="mb-4 sm:max-w-sm" />
      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : data && data.data.length === 0 ? (
        <Empty title={search ? "Aucun bien ne correspond." : "Vous n'avez pas encore de bien."}>
          {!search && <LinkButton href="/owner/properties/new">Ajouter mon premier bien</LinkButton>}
        </Empty>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.data.map((p) => (
              <Link key={p.id} href={`/owner/properties/${p.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow">
                <p className="text-lg font-semibold text-slate-900">{p.name}</p>
                <p className="text-sm text-slate-500">{p.address} · {p.neighborhood ? `${p.neighborhood}, ` : ""}{p.city}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{p.units_count ?? 0} logement(s)</span>
                  <span className="font-medium text-brand-700">{p.occupancy_rate ?? 0} % occupés</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${p.occupancy_rate ?? 0}%` }} />
                </div>
              </Link>
            ))}
          </div>
          <Pagination meta={data?.meta} onPage={setPage} />
        </>
      )}
    </>
  );
}
