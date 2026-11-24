"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useApi } from "@/hooks/useApi";
import { api, qs } from "@/lib/api";
import { date, money } from "@/lib/format";
import { applyServerErrors } from "@/lib/forms";
import { ArrowLeftRight, Landmark, ShieldCheck, Wallet } from "lucide-react";
import { Alert, Button, Card, Empty, Field, Input, LinkButton, Loading, Modal, PageHeader, Pagination, Select, Stat } from "@/components/ui";
import type { FundMovement, Paginated, Property } from "@/types";

interface CashData {
  property: { id: number; name: string; reserve_rate: number };
  balances: { main: number; reserve: number };
  movements: Paginated<FundMovement>;
}
type MoveForm = { amount: number; note: string; from: "main" | "reserve" };

// F100 / F109 / F110 : soldes, mouvements, retraits et transferts.
function CashView() {
  const router = useRouter();
  const params = useSearchParams();
  const properties = useApi<Paginated<Property>>("/properties?per_page=200");
  const propertyId = params.get("property") ?? "";
  const [f, setF] = useState({ fund: "", page: 1 });
  const cash = useApi<CashData>(propertyId ? `/properties/${propertyId}/cash${qs(f)}` : null);
  const [modal, setModal] = useState<"withdraw" | "transfer" | null>(null);
  const [formError, setFormError] = useState("");
  const form = useForm<MoveForm>({ defaultValues: { from: "main" } });

  useEffect(() => {
    if (!propertyId && properties.data?.data.length) router.replace(`/owner/cash?property=${properties.data.data[0].id}`);
  }, [propertyId, properties.data, router]);

  if (properties.loading) return <Loading />;
  if (!properties.data?.data.length) return <Empty title="Ajoutez d'abord un bien pour suivre sa caisse."><LinkButton href="/owner/properties/new">Ajouter un bien</LinkButton></Empty>;

  const open = (m: "withdraw" | "transfer") => {
    form.reset({ amount: undefined as unknown as number, note: "", from: "main" });
    setFormError("");
    setModal(m);
  };
  const submit = async (v: MoveForm) => {
    setFormError("");
    try {
      if (modal === "withdraw") await api.post(`/properties/${propertyId}/cash/withdrawals`, { amount: Number(v.amount), note: v.note });
      else await api.post(`/properties/${propertyId}/cash/transfers`, { amount: Number(v.amount), note: v.note, from: v.from });
      setModal(null);
      cash.reload();
    } catch (e) {
      setFormError(applyServerErrors(e, form.setError));
    }
  };

  const c = cash.data;
  return (
    <>
      <PageHeader
        title="Caisse du bien"
        subtitle="L'argent des loyers confirmés, et lui seul, finance les dépenses du bien."
        actions={
          <Select value={propertyId} onChange={(e) => { setF({ fund: "", page: 1 }); router.replace(`/owner/cash?property=${e.target.value}`); }} className="w-60" aria-label="Bien">
            {properties.data.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        }
      />
      {cash.loading && !c ? <Loading /> : cash.error ? <Alert>{cash.error}</Alert> : c && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat icon={Wallet} label="Caisse principale" value={money(c.balances.main)} hint="Disponible pour les dépenses et les retraits" />
            <Stat icon={ShieldCheck} label="Réserve pour imprévus" value={money(c.balances.reserve)} hint={`${c.property.reserve_rate} % de chaque loyer · jamais retirée`} />
            <Stat icon={Landmark} label="Total" value={money(c.balances.main + c.balances.reserve)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => open("withdraw")}>Retirer le bénéfice</Button>
            <Button variant="secondary" onClick={() => open("transfer")}><ArrowLeftRight className="h-4 w-4" /> Transfert principale / réserve</Button>
            <LinkButton variant="secondary" href={`/owner/expenses/new?property=${propertyId}`}>Saisir une dépense</LinkButton>
          </div>

          <Card title="Mouvements" action={
            <Select value={f.fund} onChange={(e) => setF({ fund: e.target.value, page: 1 })} className="w-48 py-1.5" aria-label="Compartiment">
              <option value="">Les deux compartiments</option>
              <option value="main">Caisse principale</option>
              <option value="reserve">Réserve</option>
            </Select>
          }>
            {!c.movements.data.length ? <p className="py-6 text-center text-sm text-slate-500">Aucun mouvement. Les loyers confirmés apparaîtront ici.</p> : (
              <ul className="divide-y divide-slate-100">
                {c.movements.data.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{m.type_label} <span className="font-normal text-slate-400">· {m.fund_label}</span></p>
                      <p className="truncate text-xs text-slate-500">{date(m.moved_at)}{m.note && ` · ${m.note}`}{m.recorded_by && ` · ${m.recorded_by}`}</p>
                    </div>
                    <p className={`whitespace-nowrap font-semibold tabular-nums ${m.direction === "in" ? "text-emerald-700" : "text-red-700"}`}>{m.direction === "in" ? "+" : "−"} {money(m.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
            <Pagination meta={c.movements.meta} onPage={(page) => setF({ ...f, page })} />
          </Card>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "withdraw" ? "Retrait du propriétaire" : "Transfert entre compartiments"}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4" noValidate>
          <Alert>{formError}</Alert>
          {modal === "withdraw" && <Alert kind="info">Le retrait se fait uniquement depuis la caisse principale ({money(c?.balances.main)} disponibles). La réserve reste intacte.</Alert>}
          {modal === "transfer" && (
            <Field label="Sens du transfert">
              <Select {...form.register("from")}>
                <option value="main">Caisse principale → Réserve</option>
                <option value="reserve">Réserve → Caisse principale</option>
              </Select>
            </Field>
          )}
          <Field label="Montant (FCFA)" error={form.formState.errors.amount?.message} required><Input type="number" min={1} autoFocus {...form.register("amount", { required: "Indiquez un montant." })} /></Field>
          <Field label="Note"><Input placeholder={modal === "transfer" ? "Ex. renforcer la réserve avant la saison des pluies" : ""} {...form.register("note")} /></Field>
          <Button type="submit" loading={form.formState.isSubmitting} className="w-full">Valider</Button>
        </form>
      </Modal>
    </>
  );
}

export default function CashPage() {
  return <Suspense fallback={<Loading />}><CashView /></Suspense>;
}
