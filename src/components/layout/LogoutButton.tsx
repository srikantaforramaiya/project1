"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button onClick={logout} className={className ?? "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-danger hover:bg-danger/10"}>
      <LogOut className="h-4 w-4" aria-hidden /> Logout
    </button>
  );
}
