"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Package, FolderTree, ShoppingCart, Users, CreditCard, BarChart3, Settings, ScrollText, LogOut, Menu as MenuIcon, X, UtensilsCrossed } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText }
];

export function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Admin navigation">
      {NAV.map((n) => {
        const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? "bg-primary/10 font-medium text-primary" : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"}`}
            aria-current={active ? "page" : undefined}
          >
            <n.icon className="h-4 w-4" aria-hidden /> {n.label}
          </Link>
        );
      })}
      <button onClick={logout} className="mt-auto flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-danger hover:bg-danger/10">
        <LogOut className="h-4 w-4" aria-hidden /> Logout ({adminName})
      </button>
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <Link href="/admin" className="flex items-center gap-2 font-bold"><UtensilsCrossed className="h-5 w-5 text-primary" aria-hidden /> Admin</Link>
        <button onClick={() => setOpen(!open)} aria-label={open ? "Close sidebar" : "Open sidebar"} aria-expanded={open} className="btn-ghost !px-2 !py-2">
          {open ? <X className="h-5 w-5" aria-hidden /> : <MenuIcon className="h-5 w-5" aria-hidden />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-surface" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-border p-4">
              <span className="font-bold">Admin</span>
              <button onClick={() => setOpen(false)} aria-label="Close sidebar"><X className="h-5 w-5" aria-hidden /></button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <Link href="/admin" className="flex items-center gap-2 border-b border-border p-4 font-bold">
          <UtensilsCrossed className="h-5 w-5 text-primary" aria-hidden /> Neon Bites Admin
        </Link>
        {nav}
      </aside>
    </>
  );
}
