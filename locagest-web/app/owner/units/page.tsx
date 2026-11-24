"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { qs } from "@/lib/api";
import { money, UNIT_TYPES } from "@/lib/format";
import { Alert, Badge, Cell, Empty, Input, Loading, PageHeader, Pagination, Row, Select, Table } from "@/components/ui";
import type { Paginated, Property, Unit } from "@/types";

// F16 : recherche et filtres sur tous les logements.
export default function UnitsPage() {
  const [f, setF] = useState({ city: "", property: "", status: "", type: "", rent_min: "", rent_max: "", search: "", page: 1 });
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v, page: 1 });
  const { data, loading, error } = useApi<Paginated<Unit>>(`/units${qs(f)}`);
  const cities = useApi<{ data: string[] }>("/properties/cities");
  const properties = useApi<Paginated<Property>>("/properties?per_page=200");

  return (
    <>
      <PageHeader title="Tous les logements" subtitle="Recherchez dans l'ensemble de votre parc" />
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
        <Input placeholder="Libellé…" value={f.search} onChange={(e) => set("search", e.target.value)} className="col-span-2 md:col-span-1" />
        <Select value={f.city} onChange={(e) => set("city", e.target.value)} aria-label="Ville">
          <option value="">Toutes les villes</option>
          {cities.data?.data.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select value={f.property} onChange={(e) => set("property", e.target.value)} aria-label="Bien">
          <option value="">Tous les biens</option>
          {properties.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={f.status} onChange={(e) => set("status", e.target.value)} aria-label="Statut">
          <option value="">Libre et occupé</option>
          <option value="vacant">Libre</option>
          <option value="occupied">Occupé</option>
        </Select>
        <Select value={f.type} onChange={(e) => set("type", e.target.value)} aria-label="Type">
          <option value="">Tous les types</option>
          {UNIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Input type="number" placeholder="Loyer min" value={f.rent_min} onChange={(e) => set("rent_min", e.target.value)} />
        <Input type="number" placeholder="Loyer max" value={f.rent_max} onChange={(e) => set("rent_max", e.target.value)} />
      </div>
      {loading && !data ? <Loading /> : error ? <Alert>{error}</Alert> : !data?.data.length ? <Empty title="Aucun logement ne correspond à ces critères." /> : (
        <>
          <Table head={["Logement", "Bien", "Type", "Loyer", "Statut", "Locataire"]}>
            {data.data.map((u) => (
              <Row key={u.id} href={`/owner/units/${u.id}`}>
                <Cell className="font-medium text-slate-800">{u.label}</Cell>
                <Cell label="Bien">{u.property?.name} <span className="text-xs text-slate-400">({u.property?.city})</span></Cell>
                <Cell label="Type">{u.type_label}</Cell>
                <Cell label="Loyer" className="tabular-nums">{money(u.default_rent)}</Cell>
                <Cell><Badge status={u.status}>{u.status_label}</Badge></Cell>
                <Cell label="Locataire">{u.active_lease?.tenant?.full_name ?? "—"}</Cell>
              </Row>
            ))}
          </Table>
          <Pagination meta={data.meta} onPage={(page) => setF({ ...f, page })} />
        </>
      )}
    </>
  );
}
