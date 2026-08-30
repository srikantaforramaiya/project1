"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const { push } = useToast();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") })
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      push(data?.error ?? "Something went wrong.", "error");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="card-elevated mx-auto w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold">Check Your Email</h1>
        <p className="mt-3 text-sm text-text-secondary">If an account exists for that email, a password reset link has been sent. The link expires in 1 hour.</p>
        <Link href="/auth/login" className="btn-secondary mt-6">Back to Login</Link>
      </div>
    );
  }

  return (
    <div className="card-elevated mx-auto w-full max-w-md p-8">
      <h1 className="text-2xl font-bold">Forgot Password</h1>
      <p className="mt-1 text-sm text-text-secondary">Enter your email and we&apos;ll send you a reset link.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" className="input" required />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={pending}>{pending ? "Sending..." : "Send Reset Link"}</button>
      </form>
      <div className="mt-4 text-center text-sm">
        <Link href="/auth/login" className="text-text-secondary hover:text-primary">Back to login</Link>
      </div>
    </div>
  );
}
