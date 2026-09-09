"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const { push } = useToast();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [otpStage, setOtpStage] = useState<{ email: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  async function verifyOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (!otpStage) return;
    setPending(true);
    setOtpError(null);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: otpStage.email, otp })
    });
    const data = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) {
      setOtpError(data?.error ?? "Verification failed. Please try again.");
      return;
    }
    push("Email verified. Welcome!");
    router.push(next);
    router.refresh();
  }

  async function resendOtp() {
    if (!otpStage) return;
    setPending(true);
    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: otpStage.email })
    });
    setPending(false);
    push(res.ok ? "A new OTP has been sent to your email." : "Could not resend the OTP right now.", res.ok ? "success" : "error");
  }

  if (otpStage) {
    return (
      <div className="card-elevated mx-auto w-full max-w-md p-8">
        <h1 className="text-2xl font-bold">Verify your email</h1>
        <p className="mt-1 text-sm text-text-secondary">
          We sent a 6-digit code to <strong>{otpStage.email}</strong>. It is valid for 60 minutes.
        </p>
        <form onSubmit={verifyOtp} className="mt-6 space-y-4" noValidate>
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
            {otpError && <p className="field-error">{otpError}</p>}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={pending || otp.length !== 6}>
            {pending ? "Verifying..." : "Verify & Continue"}
          </button>
          <button type="button" onClick={resendOtp} className="btn-secondary w-full" disabled={pending}>
            Resend OTP
          </button>
        </form>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErrors({});
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form.entries());
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) {
      setErrors(data?.fields ?? {});
      push(data?.error ?? "Please check your details and try again.", "error");
      return;
    }
    if (mode === "register" && data?.requiresVerification) {
      setOtpStage({ email: data.email });
      push(data.warning ?? `Verification code sent to ${data.email}.`, data.warning ? "error" : "success");
      return;
    }
    push(mode === "login" ? `Welcome back!` : "Account created. Welcome!");
    router.push(next);
    router.refresh();
  }

  const isRegister = mode === "register";

  return (
    <div className="card-elevated mx-auto w-full max-w-md p-8">
      <h1 className="text-2xl font-bold">{isRegister ? "Create Account" : "Welcome Back"}</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {isRegister ? "Register to order fresh local food." : "Log in to your account."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {isRegister && (
          <div>
            <label htmlFor="name" className="label">Full Name</label>
            <input id="name" name="name" type="text" autoComplete="name" className="input" required aria-describedby="name-error" />
            {errors.name && <p id="name-error" className="field-error">{errors.name[0]}</p>}
          </div>
        )}
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" className="input" required aria-describedby="email-error" />
          {errors.email && <p id="email-error" className="field-error">{errors.email[0]}</p>}
        </div>
        {isRegister && (
          <div>
            <label htmlFor="phone" className="label">Mobile Number</label>
            <input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile" className="input" required aria-describedby="phone-error" />
            {errors.phone && <p id="phone-error" className="field-error">{errors.phone[0]}</p>}
          </div>
        )}
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} className="input" required aria-describedby="password-error" />
          {errors.password && <p id="password-error" className="field-error">{errors.password[0]}</p>}
        </div>
        {isRegister && (
          <div>
            <label htmlFor="confirmPassword" className="label">Confirm Password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" className="input" required aria-describedby="confirmPassword-error" />
            {errors.confirmPassword && <p id="confirmPassword-error" className="field-error">{errors.confirmPassword[0]}</p>}
          </div>
        )}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Please wait..." : isRegister ? "Create Account" : "Log In"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-text-secondary">
        {isRegister ? (
          <>Already have an account? <Link href="/auth/login" className="text-primary hover:underline">Log in</Link></>
        ) : (
          <>New here? <Link href="/auth/register" className="text-primary hover:underline">Create an account</Link></>
        )}
      </div>
      {!isRegister && (
        <div className="mt-2 text-center text-sm">
          <Link href="/auth/forgot-password" className="text-text-secondary hover:text-primary">Forgot password?</Link>
        </div>
      )}
    </div>
  );
}
