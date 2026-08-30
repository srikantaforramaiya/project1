"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export function CustomerRowActions({ customerId, isActive }: { customerId: string; isActive: boolean }) {
  const router = useRouter();
  const { push } = useToast();

  async function toggle() {
    const action = isActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this customer account?`)) return;
    const res = await fetch(`/api/admin/customers/${customerId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive })
    });
    if (!res.ok) { push("Update failed.", "error"); return; }
    push(`Customer ${action}d.`);
    router.refresh();
  }

  return (
    <button onClick={toggle} className={isActive ? "btn-danger !px-3 !py-1.5 text-xs" : "btn-secondary !px-3 !py-1.5 text-xs"}>
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
