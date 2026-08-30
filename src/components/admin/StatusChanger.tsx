"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUS_LABELS } from "@/lib/store-config";
import { useToast } from "@/components/ui/toast";

/** Allowed next statuses (mirror of the server transition map, for UX only). */
const NEXT: Record<string, string[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAYMENT_RECEIVED: ["CONFIRMED", "CANCELLED", "REFUND_PENDING"],
  CONFIRMED: ["PREPARING", "CANCELLED", "REFUND_PENDING"],
  PREPARING: ["READY", "CANCELLED", "REFUND_PENDING"],
  READY: ["OUT_FOR_DELIVERY", "CANCELLED", "REFUND_PENDING"],
  OUT_FOR_DELIVERY: ["DELIVERED", "REFUND_PENDING"],
  DELIVERED: ["REFUND_PENDING"],
  CANCELLED: ["REFUND_PENDING"],
  REFUND_PENDING: ["REFUNDED"],
  REFUNDED: []
};

export function StatusChanger({ currentStatus, changeStatus }: {
  currentStatus: string;
  changeStatus: (newStatus: string, notes: string) => Promise<void>;
}) {
  const options = NEXT[currentStatus] ?? [];
  const router = useRouter();
  const { push } = useToast();
  const [selected, setSelected] = useState(options[0] ?? "");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  if (options.length === 0) {
    return (
      <section className="card p-6 text-sm">
        <h2 className="font-semibold">Update Status</h2>
        <p className="mt-2 text-text-secondary">This order is in a final state — no further status changes available.</p>
      </section>
    );
  }

  const destructive = ["CANCELLED", "REFUND_PENDING"].includes(selected);

  async function submit() {
    if (!selected) return;
    if (destructive && !confirm(`Change status to ${ORDER_STATUS_LABELS[selected]}? This is a significant action and will be recorded in the audit trail.`)) return;
    setPending(true);
    try {
      await changeStatus(selected, notes);
      push(`Order status changed to ${ORDER_STATUS_LABELS[selected]}.`);
      setNotes("");
      router.refresh();
    } catch {
      push("Status change was not allowed.", "error");
    }
    setPending(false);
  }

  return (
    <section className="card p-6 text-sm">
      <h2 className="mb-3 font-semibold">Update Status</h2>
      <div className="flex flex-wrap gap-2">
        {options.map((s) => (
          <button
            key={s}
            onClick={() => setSelected(s)}
            className={`btn !px-3 !py-1.5 text-xs ${selected === s ? "bg-primary text-primary-foreground" : "border border-border text-text-secondary hover:text-text-primary"}`}
            aria-pressed={selected === s}
          >
            {ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input mt-3" placeholder="Notes (optional, recorded in history)" aria-label="Status change notes" />
      <button onClick={submit} className={`mt-3 w-full ${destructive ? "btn-danger" : "btn-primary"}`} disabled={pending}>
        {pending ? "Updating..." : `Change to ${ORDER_STATUS_LABELS[selected]}`}
      </button>
    </section>
  );
}
