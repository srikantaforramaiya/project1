import { Check, Circle } from "lucide-react";
import { ORDER_STATUS_LABELS, formatDateTimeIST } from "@/lib/store-config";

const TIMELINE: { status: string; dateField: "confirmedAt" | "preparingAt" | "readyAt" | "dispatchedAt" | "deliveredAt" | null }[] = [
  { status: "PENDING_PAYMENT", dateField: null },
  { status: "PAYMENT_RECEIVED", dateField: "confirmedAt" },
  { status: "CONFIRMED", dateField: "confirmedAt" },
  { status: "PREPARING", dateField: "preparingAt" },
  { status: "READY", dateField: "readyAt" },
  { status: "OUT_FOR_DELIVERY", dateField: "dispatchedAt" },
  { status: "DELIVERED", dateField: "deliveredAt" }
];

const STATUS_ORDER_INDEX: Record<string, number> = {
  PENDING_PAYMENT: 0, PAYMENT_RECEIVED: 1, CONFIRMED: 2, PREPARING: 3, READY: 4,
  OUT_FOR_DELIVERY: 5, DELIVERED: 6, CANCELLED: -1, REFUND_PENDING: -1, REFUNDED: -1
};

export function OrderTimeline({ order }: { order: { orderStatus: string; createdAt: Date; confirmedAt: Date | null; preparingAt: Date | null; readyAt: Date | null; dispatchedAt: Date | null; deliveredAt: Date | null; cancelledAt: Date | null } }) {
  const currentIndex = STATUS_ORDER_INDEX[order.orderStatus];

  if (["CANCELLED", "REFUND_PENDING", "REFUNDED"].includes(order.orderStatus)) {
    return (
      <div className="card border-danger/40 p-4 text-sm">
        <p className="font-semibold text-danger">{ORDER_STATUS_LABELS[order.orderStatus]}</p>
        {order.cancelledAt && <p className="mt-1 text-text-secondary">on {formatDateTimeIST(order.cancelledAt)}</p>}
      </div>
    );
  }

  return (
    <ol className="relative space-y-0" aria-label="Order progress">
      {TIMELINE.map((step, idx) => {
        const reached = idx <= currentIndex;
        const timestamp = step.dateField ? order[step.dateField] : order.createdAt;
        return (
          <li key={step.status} className="flex gap-3 pb-5 last:pb-0">
            <div className="flex flex-col items-center">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${reached ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface text-text-secondary"}`}>
                {reached ? <Check className="h-4 w-4" aria-hidden /> : <Circle className="h-3 w-3" aria-hidden />}
              </span>
              {idx < TIMELINE.length - 1 && <span className={`mt-1 w-px flex-1 ${idx < currentIndex ? "bg-primary/50" : "bg-border"}`} aria-hidden />}
            </div>
            <div className="pb-1">
              <p className={`text-sm font-medium ${reached ? "text-text-primary" : "text-text-secondary"}`}>{ORDER_STATUS_LABELS[step.status]}</p>
              {reached && timestamp && <p className="text-xs text-text-secondary">{formatDateTimeIST(timestamp)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
