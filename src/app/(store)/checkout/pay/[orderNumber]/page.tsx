"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Smartphone, ShieldCheck, Loader2, XCircle, CheckCircle2, Copy, QrCode, Clock } from "lucide-react";
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
  paymentStatus: string;
  upiVpa: string;
  payeeName: string;
  customer: { name: string; email: string; phone: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function buildUpiUri(cfg: PayConfig): string {
  const params = new URLSearchParams({
    pa: cfg.upiVpa,
    pn: cfg.payeeName,
    am: cfg.grandTotal.toFixed(2),
    cu: "INR",
    tn: `Order ${cfg.orderNumber}`,
    tr: cfg.orderNumber
  });
  return `upi://pay?${params.toString()}`;
}

export default function PayPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);
  const router = useRouter();
  const { push } = useToast();
  const [config, setConfig] = useState<PayConfig | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [awaitingVerify, setAwaitingVerify] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/payments/config?orderNumber=${encodeURIComponent(orderNumber)}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json()).error))))
      .then((cfg: PayConfig) => {
        setConfig(cfg);
        if (cfg.paymentStatus === "PAID") setDone(true);
        import("qrcode").then((QRCode) =>
          QRCode.toDataURL(buildUpiUri(cfg), { width: 320, margin: 2, color: { dark: "#0B0E11", light: "#FFFFFF" } })
            .then(setQrDataUrl)
            .catch(() => setQrDataUrl(null))
        );
      })
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

  /** Dev-only: simulate the UPI provider returning a signed success result. */
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
    await verify(data.verify);
  }

  /** Customer scanned the QR and paid — notify the seller for verification. */
  async function iHavePaid() {
    setBusy(true);
    const res = await fetch("/api/payments/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber })
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      push(data?.error ?? "Could not record your payment notification.", "error");
      return;
    }
    if (data.alreadyPaid) {
      setDone(true);
      setTimeout(() => router.push(`/order/success/${orderNumber}`), 1200);
      return;
    }
    setAwaitingVerify(true);
    push("Payment noted! We will confirm once the UPI credit is verified.", "info");
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

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="card-elevated p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" aria-hidden />
          <h1 className="mt-4 text-2xl font-bold">Payment Verified</h1>
          <p className="mt-2 text-sm text-text-secondary">Redirecting to your order...</p>
          <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-primary" aria-hidden />
        </div>
      </div>
    );
  }

  const upiUri = buildUpiUri(config);

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card-elevated p-8 text-center">
        <Smartphone className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <h1 className="mt-3 text-2xl font-bold">Pay with UPI QR</h1>
        <p className="mt-1 text-sm text-text-secondary">Order {config.orderNumber}</p>
        <p className="mt-3 text-4xl font-extrabold text-primary">{formatINR(config.grandTotal)}</p>

        {/* QR code — scan with any UPI app */}
        <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-3 shadow-neon-sm">
          {qrDataUrl ? (
            <Image src={qrDataUrl} alt={`UPI QR code to pay ${formatINR(config.grandTotal)} to ${config.upiVpa}`} width={240} height={240} unoptimized />
          ) : (
            <div className="flex h-[240px] w-[240px] items-center justify-center" aria-label="Generating QR code">
              <QrCode className="h-16 w-16 text-gray-400" aria-hidden />
            </div>
          )}
        </div>

        <ol className="mt-5 space-y-2 text-left text-sm text-text-secondary">
          <li>1. Open any UPI app (GPay, PhonePe, Paytm, BHIM)</li>
          <li>2. Scan this QR code — amount is pre-filled</li>
          <li>3. Complete the payment and tap the button below</li>
        </ol>

        <div className="mt-5 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-xs text-text-secondary">Paying to</p>
          <p className="mt-1 font-mono text-base font-bold text-primary">{config.upiVpa}</p>
          <button
            className="btn-ghost mt-2 !px-3 !py-1.5 text-xs"
            onClick={async () => { try { await navigator.clipboard.writeText(config.upiVpa); push("UPI ID copied."); } catch { push("Copy failed — please note it manually.", "error"); } }}
          >
            <Copy className="h-3.5 w-3.5" aria-hidden /> Copy UPI ID
          </button>
        </div>

        {awaitingVerify ? (
          <div className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning" role="status">
            <Clock className="mr-1.5 inline h-4 w-4" aria-hidden />
            Payment noted! Your order will be confirmed once we verify the UPI credit. You can track it in <Link href="/account/orders" className="underline">My Orders</Link>.
          </div>
        ) : (
          <button onClick={iHavePaid} className="btn-primary mt-6 w-full py-3 text-base" disabled={busy}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ShieldCheck className="h-5 w-5" aria-hidden />}
            {busy ? "Processing..." : "I Have Completed the Payment"}
          </button>
        )}

        {config.mode === "mock" && !awaitingVerify && (
          <div className="mt-5 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            Development mode: auto-verify simulation available.
            <div className="mt-2 flex justify-center gap-2">
              <button onClick={() => mockPay("success")} className="btn-secondary !px-3 !py-1.5 text-xs" disabled={busy}>Simulate Paid</button>
              <button onClick={() => mockPay("failure")} className="btn-ghost !px-3 !py-1.5 text-xs" disabled={busy}>Simulate Failed</button>
            </div>
          </div>
        )}

        {config.mode === "razorpay" && !awaitingVerify && (
          <button onClick={razorpayPay} className="btn-secondary mt-3 w-full" disabled={busy}>
            Or open the secure Razorpay window
          </button>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-text-secondary">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden /> Payments go directly to the seller&apos;s UPI account.
        </p>
      </div>
    </div>
  );
}
