"use client";

import { useState } from "react";
import { download } from "@/lib/api";
import { date, money } from "@/lib/format";
import { errorMessage } from "@/lib/forms";
import { Alert, Button } from "@/components/ui";
import type { Invoice } from "@/types";

/** F48 / F52 : téléchargement de la facture PDF, de la quittance, partage WhatsApp / e-mail. */
export function InvoiceDocuments({ invoice, share = false }: { invoice: Invoice; share?: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const get = async (key: string, path: string, name: string) => {
    setError("");
    setBusy(key);
    try {
      await download(path, name);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const text = `Bonjour ${invoice.lease?.tenant?.full_name ?? ""}, votre facture LocaGest ${invoice.invoice_number} (${invoice.period_label}) s'élève à ${money(invoice.amount_due)}` +
    (invoice.remaining > 0 ? `. Reste à payer : ${money(invoice.remaining)}, échéance le ${date(invoice.due_date)}.` : ". Elle est entièrement payée, merci !");
  const phone = (invoice.lease?.tenant?.phone ?? "").replace(/[^\d]/g, "");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" loading={busy === "pdf"} onClick={() => get("pdf", `/invoices/${invoice.id}/pdf`, `${invoice.invoice_number}.pdf`)}>📄 Facture PDF</Button>
        {invoice.receipt && (
          <Button variant="success" loading={busy === "receipt"} onClick={() => get("receipt", `/payments/${invoice.receipt!.payment_id}/receipt`, `${invoice.receipt!.receipt_number}.pdf`)}>
            ✓ Quittance {invoice.receipt.receipt_number}
          </Button>
        )}
        {share && (
          <>
            <a className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" target="_blank" rel="noreferrer" href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`}>
              WhatsApp
            </a>
            <a className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" href={`mailto:?subject=${encodeURIComponent("Facture " + invoice.invoice_number)}&body=${encodeURIComponent(text)}`}>
              E-mail
            </a>
          </>
        )}
      </div>
      <Alert>{error}</Alert>
    </div>
  );
}
