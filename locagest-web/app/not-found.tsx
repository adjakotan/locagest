import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-5xl font-bold text-brand-700">404</p>
      <p className="text-slate-600">Cette page n&apos;existe pas.</p>
      <Link href="/" className="text-brand-600 hover:underline">Retour à l&apos;accueil</Link>
    </div>
  );
}
