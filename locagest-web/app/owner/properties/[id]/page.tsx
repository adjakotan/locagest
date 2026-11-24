"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { errorMessage } from "@/lib/forms";
import { UnitForm } from "@/components/forms/UnitForm";
import { Alert, Badge, Button, Card, Empty, LinkButton, Loading, Modal, PageHeader, Stat } from "@/components/ui";
import type { Property, Unit } from "@/types";

export default function PropertyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error, reload } = useApi<{ data: Property }>(`/properties/${id}`);
  const [modal, setModal] = useState<{ open: boolean; unit?: Unit }>({ open: false });
  const [actionError, setActionError] = useState("");

  if (loading && !data) return <Loading />;
  if (error || !data) return <Alert>{error}</Alert>;
  const p = data.data;

  const deleteProperty = async () => {
    if (!confirm(`Supprimer définitivement le bien « ${p.name} » ?`)) return;
    try {
      await api.delete(`/properties/${p.id}`);
      router.push("/owner/properties");
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  const deleteUnit = async (u: Unit) => {
    if (!confirm(`Supprimer le logement « ${u.label} » ?`)) return;
    try {
      await api.delete(`/units/${u.id}`);
      reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        back="/owner/properties"
        title={p.name}
        subtitle={`${p.address} · ${p.neighborhood ? p.neighborhood + ", " : ""}${p.city}`}
        actions={
          <>
            <LinkButton href={`/owner/cash?property=${p.id}`} variant="secondary">Caisse</LinkButton>
            <LinkButton href={`/owner/properties/${p.id}/edit`} variant="secondary">Modifier</LinkButton>
            <Button variant="ghostDanger" className="" onClick={deleteProperty}>Supprimer</Button>
          </>
        }
      />
      <div className="space-y-6">
        <Alert>{actionError}</Alert>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Logements" value={p.units_count ?? 0} />
          <Stat label="Occupés" value={p.occupied_units_count ?? 0} />
          <Stat label="Occupation" value={`${p.occupancy_rate ?? 0} %`} />
        </div>
        {p.description && <p className="text-sm text-slate-600">{p.description}</p>}

        <Card title="Logements" action={<Button className="py-1.5" onClick={() => setModal({ open: true })}>+ Ajouter</Button>}>
          {!p.units?.length ? (
            <Empty title="Aucun logement dans ce bien.">Ajoutez les chambres, appartements ou boutiques à louer.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {p.units.map((u) => (
                <li key={u.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/owner/units/${u.id}`} className="font-medium text-slate-800 hover:text-brand-700">{u.label}</Link>
                    <span className="ml-2 text-xs text-slate-500">{u.type_label} · {money(u.default_rent)}/mois</span>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <Badge status={u.status}>{u.status_label}</Badge>
                      {u.active_lease?.tenant && <span className="text-slate-600">{u.active_lease.tenant.full_name} · {money(u.active_lease.rent_amount)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {u.status === "vacant" ? (
                      <LinkButton href={`/owner/leases/new?unit=${u.id}`} variant="secondary" className="py-1.5">Louer</LinkButton>
                    ) : (
                      <LinkButton href={`/owner/leases/${u.active_lease?.id}`} variant="secondary" className="py-1.5">Bail</LinkButton>
                    )}
                    <Button variant="ghost" className="py-1.5" onClick={() => setModal({ open: true, unit: u })}>Modifier</Button>
                    {u.status === "vacant" && <Button variant="ghostDanger" className="py-1.5" onClick={() => deleteUnit(u)}>Supprimer</Button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={modal.open} onClose={() => setModal({ open: false })} title={modal.unit ? "Modifier le logement" : "Nouveau logement"}>
        <UnitForm propertyId={p.id} unit={modal.unit} onDone={() => { setModal({ open: false }); reload(); }} />
      </Modal>
    </>
  );
}
