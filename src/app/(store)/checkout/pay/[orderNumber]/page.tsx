"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Phone, MessageCircle, ShieldCheck, Loader2, XCircle, CheckCircle2, Copy, Clock } from "lucide-react";
import { formatINR } from "@/lib/store-config";
import { useToast } from "@/components/ui/toast";

type PayConfig = {
  orderNumber: string;
  grandTotal: number;
  paymentStatus: string;
  upiVpa: string;
  payeeName: string;
  sellerPhone: string;
};

export default function PayPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);
  const { push } = useToast();
  const [config, setConfig] = useState<PayConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [awaitingVerify, setAwaitingVerify] = useState(false);
  const [done, setDone] = useState(false);

  useState(() => {
    fetch(`/api/payments/config?orderNumber=${encodeURIComponent(orderNumber)}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json()).error))))
      .then((cfg: PayConfig) => {
        setConfig(cfg);
        if (cfg.paymentStatus === "PAID") setDone(true);
      })
      .catch((e) => setError(e.message));
  });

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
      return;
    }
    setAwaitingVerify(true);
    push("Payment noted! Please also call or WhatsApp the seller to confirm.", "info");
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
          <h1 className="mt-4 text-2xl font-bold">Payment Already Verified</h1>
          <p className="mt-2 text-sm text-text-secondary">This order is confirmed.</p>
          <Link href={`/order/success/${orderNumber}`} className="btn-primary mt-6">View Order</Link>
        </div>
      </div>
    );
  }

  const waText = encodeURIComponent(
    `Hi! I placed order ${config.orderNumber} on Neon Bites and have paid ${formatINR(config.grandTotal)} via UPI to ${config.upiVpa}. Please confirm my order.`
  );
  const qrSrc = `/api/payments/qr?orderNumber=${encodeURIComponent(config.orderNumber)}`;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card-elevated p-8 text-center">
        <h1 className="text-2xl font-bold">Pay with UPI QR</h1>
        <p className="mt-1 text-sm text-text-secondary">Order {config.orderNumber}</p>
        <p className="mt-3 text-4xl font-extrabold text-primary">{formatINR(config.grandTotal)}</p>

        {/* QR code — scan with any UPI app */}
        <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-3 shadow-neon-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt={`UPI QR code to pay ${formatINR(config.grandTotal)} to ${config.upiVpa}`} width={240} height={240} />
        </div>

        <ol className="mt-5 space-y-2 text-left text-sm text-text-secondary">
          <li><span className="font-semibold text-text-primary">1.</span> Open any UPI app (GPay, PhonePe, Paytm, BHIM)</li>
          <li><span className="font-semibold text-text-primary">2.</span> Scan this QR code — the amount is pre-filled</li>
          <li><span className="font-semibold text-text-primary">3.</span> Complete the payment, then inform the seller below</li>
        </ol>

        <div className="mt-5 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-xs text-text-secondary">Payment goes to</p>
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
            Payment noted! Remember to call or WhatsApp the seller so your order is confirmed quickly. Track it in <Link href="/account/orders" className="underline">My Orders</Link>.
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-border p-4">
              <p className="text-sm font-semibold">After paying, inform the seller</p>
              <p className="mt-1 text-xs text-text-secondary">Call or WhatsApp <span className="font-mono font-bold text-text-primary">+91 {config.sellerPhone}</span> with your order number to confirm.</p>
              <div className="mt-3 flex justify-center gap-3">
                <a href={`tel:+91${config.sellerPhone}`} className="btn-primary !px-4 !py-2 text-sm">
                  <Phone className="h-4 w-4" aria-hidden /> Call Seller
                </a>
                <a href={`https://wa.me/91${config.sellerPhone}?text=${waText}`} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-4 !py-2 text-sm">
                  <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
                </a>
              </div>
            </div>
            <button onClick={iHavePaid} className="btn-ghost mt-4 w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
              {busy ? "Saving..." : "I Have Paid — Notify the Seller"}
            </button>
          </>
        )}

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-text-secondary">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden /> Payments go directly to the seller&apos;s UPI account ({config.upiVpa}).
        </p>
      </div>
    </div>
  );
}
