import { requireUser } from "@/lib/auth";
import { User, MapPin, Package, LayoutDashboard, LogOut } from "lucide-react";
import { LogoutButton } from "@/components/layout/LogoutButton";
import Link from "next/link";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const links = [
    { href: "/account", label: "Overview", icon: LayoutDashboard },
    { href: "/account/profile", label: "Profile", icon: User },
    { href: "/account/addresses", label: "Addresses", icon: MapPin },
    { href: "/account/orders", label: "My Orders", icon: Package }
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <div className="card p-4">
            <p className="mb-1 text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-text-secondary">{user.email}</p>
          </div>
          <nav className="card mt-4 p-2" aria-label="Account navigation">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-surface-elevated hover:text-text-primary">
                <l.icon className="h-4 w-4" aria-hidden /> {l.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-border pt-2">
              <LogoutButton />
            </div>
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
