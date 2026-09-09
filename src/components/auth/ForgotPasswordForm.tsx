"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";

export function ForgotPasswordForm() {
  const [stage, setStage] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();
  const [done, setDone] = useState(false);

  async function onRequestOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    setStage("otp");
    push("If an account exists, a 6-digit OTP has been sent. It expires in 60 minutes.", "success");
  }

  async function onReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, password: form.get("password"), confirmPassword: form.get("confirmPassword") })
    });
    const data = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) {
      setError(data?.error ?? "Reset failed. Please try again.");
      return;
    }
    setDone(true);
    push("Password updated. Please log in.");
  }

  async function resendOtp() {
    setPending(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    setPending(false);
    push(res.ok ? "A new OTP has been sent." : "Could not resend the OTP right now.", res.ok ? "success" : "error");
  }

  if (done) {
    return (
      <div className="card-elevated mx-auto w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold">Password Updated</h1>
        <p className="mt-3 text-sm text-text-secondary">Your password has been changed. You can now log in with the new password.</p>
        <Link href="/auth/login" className="btn-primary mt-6">Go to Login</Link>
      </div>
    );
  }

  if (stage === "otp") {
    return (
      <div className="card-elevated mx-auto w-full max-w-md p-8">
        <h1 className="text-2xl font-bold">Enter OTP</h1>
        <p className="mt-1 text-sm text-text-secondary">
          We sent a 6-digit code to <strong>{email}</strong>. It is valid for 60 minutes.
        </p>
        <form onSubmit={onReset} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="otp" className="label">Verification code (OTP)</label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="6-digit code"
              className="input text-center text-lg tracking-[0.5em]"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <label htmlFor="password" className="label">New Password</label>
            <input id="password" name="password" type="password" className="input" required autoComplete="new-password" />
            <p className="field-error">Min 8 chars with upper, lower and a number.</p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="label">Confirm New Password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" className="input" required autoComplete="new-password" />
          </div>
          {error && <p className="field-error">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={pending || otp.length !== 6}>
            {pending ? "Updating..." : "Update Password"}
          </button>
          <button type="button" onClick={resendOtp} className="btn-secondary w-full" disabled={pending}>
            Resend OTP
          </button>
        </form>
        <div className="mt-4 text-center text-sm">
          <Link href="/auth/login" className="text-text-secondary hover:text-primary">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated mx-auto w-full max-w-md p-8">
      <h1 className="text-2xl font-bold">Forgot Password</h1>
      <p className="mt-1 text-sm text-text-secondary">Enter your email and we&apos;ll send you a 6-digit OTP to reset your password.</p>
      <form onSubmit={onRequestOtp} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={pending}>{pending ? "Sending..." : "Send OTP"}</button>
      </form>
      <div className="mt-4 text-center text-sm">
        <Link href="/auth/login" className="text-text-secondary hover:text-primary">Back to login</Link>
      </div>
    </div>
  );
}
