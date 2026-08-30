"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingBag, Menu as MenuIcon, X, User, LayoutDashboard, UtensilsCrossed } from "lucide-react";
import { BUSINESS_NAME } from "@/lib/store-config";

type SessionInfo = { name: string; role: string } | null;

export function Header({ cartCount }: { cartCount: number }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionInfo>(null);
  const [badgePop, setBadgePop] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSession(d ? { name: d.name, role: d.role } : null))
      .catch(() => setSession(null));
  }, [pathname]);

  useEffect(() => {
    if (cartCount > 0) {
      setBadgePop(true);
      const t = setTimeout(() => setBadgePop(false), 350);
      return () => clearTimeout(t);
    }
  }, [cartCount]);

  const links = [
    { href: "/", label: "Home" },
    { href: "/menu", label: "Menu" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" }
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <UtensilsCrossed className="h-6 w-6 text-primary" aria-hidden />
          <span className="text-lg tracking-tight">
            {BUSINESS_NAME.split(" ")[0]}
            <span className="text-primary">.</span>
            {BUSINESS_NAME.split(" ")[1] ?? ""}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                pathname === l.href ? "text-primary" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {session?.role === "ADMIN" && (
            <Link href="/admin" className="btn-ghost hidden md:inline-flex !px-3 !py-2 text-xs">
              <LayoutDashboard className="h-4 w-4" aria-hidden /> Admin
            </Link>
          )}
          {session ? (
            <Link href="/account" className="btn-ghost hidden md:inline-flex !px-3 !py-2 text-xs">
              <User className="h-4 w-4" aria-hidden /> {session.name.split(" ")[0]}
            </Link>
          ) : (
            <Link href="/auth/login" className="btn-ghost hidden md:inline-flex !px-3 !py-2 text-xs">
              Login
            </Link>
          )}
          <Link href="/cart" className="btn-primary relative !px-3.5 !py-2" aria-label={`Cart, ${cartCount} items`}>
            <ShoppingBag className="h-4 w-4" aria-hidden />
            {cartCount > 0 && (
              <span
                className={`absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-background ${
                  badgePop ? "animate-pop" : ""
                }`}
              >
                {cartCount}
              </span>
            )}
          </Link>
          <button
            className="btn-ghost !px-2.5 !py-2 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <MenuIcon className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-surface px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2.5 text-sm hover:bg-surface-elevated" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            {session?.role === "ADMIN" && (
              <Link href="/admin" className="rounded-lg px-3 py-2.5 text-sm hover:bg-surface-elevated" onClick={() => setOpen(false)}>
                Admin Dashboard
              </Link>
            )}
            {session ? (
              <>
                <Link href="/account" className="rounded-lg px-3 py-2.5 text-sm hover:bg-surface-elevated" onClick={() => setOpen(false)}>
                  My Account
                </Link>
                <button onClick={logout} className="rounded-lg px-3 py-2.5 text-left text-sm text-danger hover:bg-surface-elevated">
                  Logout
                </button>
              </>
            ) : (
              <Link href="/auth/login" className="rounded-lg px-3 py-2.5 text-sm hover:bg-surface-elevated" onClick={() => setOpen(false)}>
                Login / Register
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
