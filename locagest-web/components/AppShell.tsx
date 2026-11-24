"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { homeFor, useAuth } from "@/lib/auth";
import type { Role } from "@/types";
import { cn, Loading } from "./ui";

type NavItem = { href: string; label: string; icon: string };

// US 1.4 : le menu n'affiche que les liens prévus pour le rôle connecté.
const NAV: Record<string, NavItem[]> = {
  owner: [
    { href: "/owner", label: "Tableau de bord", icon: "📊" },
    { href: "/owner/properties", label: "Biens", icon: "🏢" },
    { href: "/owner/units", label: "Logements", icon: "🚪" },
    { href: "/owner/tenants", label: "Locataires", icon: "👥" },
    { href: "/owner/leases", label: "Baux", icon: "📝" },
    { href: "/owner/invoices", label: "Factures", icon: "🧾" },
    { href: "/owner/payments", label: "Paiements à confirmer", icon: "⏳" },
    { href: "/owner/cash", label: "Caisse", icon: "💰" },
    { href: "/owner/expenses", label: "Dépenses", icon: "🔧" },
    { href: "/owner/maintenance", label: "Signalements", icon: "🛠️" },
  ],
  tenant: [
    { href: "/tenant", label: "Mon espace", icon: "🏠" },
    { href: "/tenant/invoices", label: "Mes factures", icon: "🧾" },
    { href: "/tenant/maintenance", label: "Signalements", icon: "🛠️" },
  ],
};

export function AppShell({ children, roles }: { children: React.ReactNode; roles: Role[] }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!roles.includes(user.role)) router.replace(homeFor(user.role));
  }, [loading, user, roles, router, pathname]);

  if (loading || !user || !roles.includes(user.role)) {
    return <Loading />;
  }

  const items = NAV[user.role === "tenant" ? "tenant" : "owner"];
  const home = homeFor(user.role);
  const isActive = (href: string) => (href === home ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
            isActive(item.href) ? "bg-white/15 text-white" : "text-brand-100 hover:bg-white/10 hover:text-white"
          )}
        >
          <span aria-hidden className="w-5 text-center">{item.icon}</span>
          {item.label}
        </Link>
      ))}
      <div className="mt-auto border-t border-white/10 pt-3">
        <Link href="/profile" className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm", pathname === "/profile" ? "bg-white/15 text-white" : "text-brand-100 hover:bg-white/10")}>
          <span aria-hidden className="w-5 text-center">👤</span>
          <span className="truncate">{user.name}</span>
        </Link>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-brand-100 hover:bg-white/10 hover:text-white">
          <span aria-hidden className="w-5 text-center">↩</span> Se déconnecter
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Barre latérale (ordinateur) */}
      <aside className="hidden w-64 shrink-0 flex-col bg-brand-800 lg:flex lg:sticky lg:top-0 lg:h-screen">
        <Link href={home} className="px-6 py-5 text-xl font-bold text-white">LocaGest</Link>
        {nav}
      </aside>

      {/* En-tête (téléphone) */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-brand-800 px-4 py-3 lg:hidden">
        <Link href={home} className="text-lg font-bold text-white">LocaGest</Link>
        <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-white hover:bg-white/10" aria-label="Menu" aria-expanded={open}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-x-0 top-[56px] flex max-h-[calc(100vh-56px)] flex-col overflow-y-auto bg-brand-800" onClick={(e) => e.stopPropagation()}>
            {nav}
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 lg:py-8">{children}</main>
    </div>
  );
}
