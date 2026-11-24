"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Banknote, Building2, ClipboardCheck, DoorOpen, FileSignature, Home, LayoutDashboard, LogOut,
  Menu, ReceiptText, Users, Wallet, Wrench, X, type LucideIcon,
} from "lucide-react";
import { homeFor, useAuth } from "@/lib/auth";
import type { Role } from "@/types";
import { Logo } from "./Logo";
import { cn, Loading } from "./ui";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { title?: string; items: NavItem[] };

// US 1.4 : le menu n'affiche que les liens prévus pour le rôle connecté.
const NAV: Record<"owner" | "tenant", NavGroup[]> = {
  owner: [
    { items: [{ href: "/owner", label: "Tableau de bord", icon: LayoutDashboard }] },
    {
      title: "Patrimoine",
      items: [
        { href: "/owner/properties", label: "Biens", icon: Building2 },
        { href: "/owner/units", label: "Logements", icon: DoorOpen },
        { href: "/owner/tenants", label: "Locataires", icon: Users },
        { href: "/owner/leases", label: "Baux", icon: FileSignature },
      ],
    },
    {
      title: "Loyers",
      items: [
        { href: "/owner/invoices", label: "Factures", icon: ReceiptText },
        { href: "/owner/payments", label: "Paiements à confirmer", icon: ClipboardCheck },
      ],
    },
    {
      title: "Finances",
      items: [
        { href: "/owner/cash", label: "Caisse", icon: Wallet },
        { href: "/owner/expenses", label: "Dépenses", icon: Banknote },
        { href: "/owner/maintenance", label: "Signalements", icon: Wrench },
      ],
    },
  ],
  tenant: [
    {
      items: [
        { href: "/tenant", label: "Mon espace", icon: Home },
        { href: "/tenant/invoices", label: "Mes factures", icon: ReceiptText },
        { href: "/tenant/maintenance", label: "Signalements", icon: Wrench },
      ],
    },
  ],
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

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

  const groups = NAV[user.role === "tenant" ? "tenant" : "owner"];
  const home = homeFor(user.role);
  const isActive = (href: string) => (href === home ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  const nav = (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <nav className="flex-1 space-y-5 px-3 py-4">
        {groups.map((g, i) => (
          <div key={i}>
            {g.title && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-brand-300/80">{g.title}</p>}
            <div className="space-y-0.5">
              {g.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive(href) ? "bg-white text-brand-800 shadow-sm" : "text-brand-100 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive(href) ? "text-brand-600" : "text-brand-300 group-hover:text-white")} strokeWidth={2} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link href="/profile" className={cn("flex items-center gap-3 rounded-lg p-2 transition", pathname === "/profile" ? "bg-white/15" : "hover:bg-white/10")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">{initials(user.name)}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-white">{user.name}</span>
            <span className="block truncate text-xs text-brand-200">{user.company_name || user.role_label}</span>
          </span>
        </Link>
        <button onClick={logout} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-brand-100 transition hover:bg-white/10 hover:text-white">
          <LogOut className="h-[18px] w-[18px] text-brand-300" /> Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Barre latérale (ordinateur) */}
      <aside className="hidden w-64 shrink-0 flex-col bg-brand-900 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Link href={home} className="flex h-16 items-center border-b border-white/10 px-6">
          <Logo light />
        </Link>
        {nav}
      </aside>

      {/* En-tête (téléphone) */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-brand-900 px-4 lg:hidden">
        <Link href={home}><Logo light /></Link>
        <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-white hover:bg-white/10" aria-label="Menu" aria-expanded={open}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-x-0 top-14 flex max-h-[calc(100vh-56px)] flex-col bg-brand-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {nav}
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
