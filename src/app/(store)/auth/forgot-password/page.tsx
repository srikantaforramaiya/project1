"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";

export default function ForgotPasswordPage() {
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) {
      push(data?.error ?? "Could not send the reset link.", "error");
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card-elevated w-full p-8">
        <h1 className="text-2xl font-bold">Forgot Password</h1>
        <p className="mt-1 text-sm text-text-secondary">Enter your account email and we&apos;ll send you a link to reset your password.</p>

        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-text-secondary">
              If an account exists for <strong>{email}</strong>, a reset link has been sent. Please check your inbox (and spam folder).
            </p>
            <Link href="/auth/login" className="btn-primary block w-full text-center">Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-text-secondary">
          Remembered it? <Link href="/auth/login" className="text-primary hover:underline">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
