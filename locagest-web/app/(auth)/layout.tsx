import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";

const POINTS = [
  "Factures mensuelles créées automatiquement",
  "Paiements partiels, quittances PDF numérotées",
  "Caisse et réserve par bien, dépenses contrôlées",
  "Espace en ligne pour vos locataires",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Présentation (ordinateur) */}
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-brand-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-700/40" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand-800/60" />
        <Logo light className="relative" />
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">La gestion locative et financière de vos biens, au même endroit.</h2>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-brand-100">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-300" /> {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-brand-300">Aucun paiement en ligne : LocaGest enregistre et contrôle, il n&apos;encaisse jamais.</p>
      </div>

      {/* Formulaire */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <Logo className="mb-8 lg:hidden" />
        <div className="w-full max-w-md">{children}</div>
        <p className="mt-10 text-xs text-slate-400">© {new Date().getFullYear()} LocaGest</p>
      </div>
    </div>
  );
}
