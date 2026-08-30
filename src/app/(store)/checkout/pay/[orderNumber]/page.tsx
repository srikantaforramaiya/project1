"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Smartphone, ShieldCheck, Loader2, XCircle, CheckCircle2 } from "lucide-react";
import { formatINR } from "@/lib/store-config";
import { useToast } from "@/components/ui/toast";

type PayConfig = {
  mode: "mock" | "razorpay";
  provider: string;
  keyId: string | null;
  providerOrderId: string | null;
  amountMinorUnits: number;
  orderNumber: string;
  grandTotal: number;
  customer: { name: string; email: string; phone: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function PayPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);
  const router = useRouter();
  const { push } = useToast();
  const [config, setConfig] = useState<PayConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/payments/config?orderNumber=${encodeURIComponent(orderNumber)}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json()).error))))
      .then(setConfig)
      .catch((e) => setError(e.message));
  }, [orderNumber]);

  function finish(success: boolean, message?: string) {
    setBusy(false);
    if (success) {
      setDone(true);
      push("Payment verified. Order confirmed!");
      setTimeout(() => router.push(`/order/success/${orderNumber}`), 1200);
    } else {
      push(message ?? "Payment could not be verified.", "error");
    }
  }

  async function verify(payload: { providerPaymentId: string; signature: string }) {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, ...payload })
    });
    const data = await res.json().catch(() => null);
    finish(res.ok, data?.error);
  }

  async function mockPay(outcome: "success" | "failure") {
    setBusy(true);
    const res = await fetch("/api/payments/mock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, outcome })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.verify) {
      finish(false, "Payment failed at UPI provider.");
      return;
    }
    // The mock gateway returns a signed result; it is verified server-side like a real gateway.
    await verify(data.verify);
  }

  async function razorpayPay() {
    if (!config || !config.keyId || !config.providerOrderId) return;
    setBusy(true);
    await new Promise<void>((resolve) => {
      if (window.Razorpay) return resolve();
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => { finish(false, "Could not load the payment gateway."); resolve(); };
      document.body.appendChild(script);
    });
    if (!window.Razorpay) return;
    const rzp = new window.Razorpay({
      key: config.keyId,
      order_id: config.providerOrderId,
      name: "Neon Bites",
      description: `Order ${config.orderNumber}`,
      theme: { color: "#A3FF12" },
      prefill: config.customer,
      handler: (response: { razorpay_payment_id: string; razorpay_signature: string }) => {
        verify({ providerPaymentId: response.razorpay_payment_id, signature: response.razorpay_signature });
      },
      modal: { ondismiss: () => setBusy(false) }
    });
    rzp.open();
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <XCircle className="mx-auto h-12 w-12 text-danger" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">Order Not Found</h1>
        <p className="mt-2 text-text-secondary">{error}</p>
        <Link href="/account/orders" className="btn-secondary mt-6">My Orders</Link>
      </div>
    );
  }

  if (!config) {
    return <div className="mx-auto max-w-md px-4 py-20"><div className="card h-56 animate-pulse" /></div>;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card-elevated p-8 text-center">
        {done ? (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-success" aria-hidden />
            <h1 className="mt-4 text-2xl font-bold">Payment Verified</h1>
            <p className="mt-2 text-sm text-text-secondary">Redirecting to your order...</p>
            <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-primary" aria-hidden />
          </>
        ) : (
          <>
            <Smartphone className="mx-auto h-12 w-12 text-primary" aria-hidden />
            <h1 className="mt-4 text-2xl font-bold">UPI Payment</h1>
            <p className="mt-1 text-sm text-text-secondary">Order {config.orderNumber}</p>
            <p className="mt-4 text-4xl font-extrabold text-primary">{formatINR(config.grandTotal)}</p>

            {config.mode === "mock" && (
              <div className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-xs text-warning">
                Development mode: simulated UPI gateway. Real payments are disabled until PAYMENT_MODE=razorpay is configured.
              </div>
            )}

            <button onClick={() => (config.mode === "mock" ? mockPay("success") : razorpayPay())} className="btn-primary mt-6 w-full py-3 text-base" disabled={busy}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ShieldCheck className="h-5 w-5" aria-hidden />}
              {busy ? "Processing..." : `Pay ${formatINR(config.grandTotal)} via UPI`}
            </button>
            {config.mode === "mock" && (
              <button onClick={() => mockPay("failure")} className="btn-ghost mt-3 w-full" disabled={busy}>Simulate Failed Payment</button>
            )}
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-text-secondary">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden /> 100% secure. Verified server-side.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

