"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { date, money } from "@/lib/format";
import { Alert, Badge, Card, Cell, Empty, LinkButton, Loading, PageHeader, Row, Table } from "@/components/ui";
import type { Unit } from "@/types";

// F34 : historique des baux d'un logement.
export default function UnitPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error } = useApi<{ data: Unit }>(`/units/${id}`);
  if (loading) return <Loading />;
  if (error || !data) return <Alert>{error}</Alert>;
  const u = data.data;

  return (
    <>
      <PageHeader
        back={`/owner/properties/${u.property_id}`}
        title={u.label}
        subtitle={<><Link href={`/owner/properties/${u.property_id}`} className="hover:underline">{u.property?.name}</Link> · {u.type_label} · {money(u.default_rent)}/mois</>}
        actions={u.status === "vacant" ? <LinkButton href={`/owner/leases/new?unit=${u.id}`}>Créer un bail</LinkButton> : <LinkButton href={`/owner/leases/${u.active_lease?.id}`} variant="secondary">Voir le bail en cours</LinkButton>}
      />
      <div className="mb-4"><Badge status={u.status}>{u.status_label}</Badge></div>
      <Card title="Historique des baux">
        {!u.leases?.length ? <Empty title="Ce logement n'a encore jamais été loué." /> : (
          <Table head={["Locataire", "Début", "Fin", "Loyer", "Statut"]}>
            {u.leases.map((l) => (
              <Row key={l.id} href={`/owner/leases/${l.id}`}>
                <Cell className="font-medium">{l.tenant?.full_name}</Cell>
                <Cell label="Début">{date(l.start_date)}</Cell>
                <Cell label="Fin">{date(l.end_date)}</Cell>
                <Cell label="Loyer" className="tabular-nums">{money(l.rent_amount)}</Cell>
                <Cell><Badge status={l.status}>{l.status_label}</Badge></Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
