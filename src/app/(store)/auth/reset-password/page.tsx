"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { push } = useToast();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return <p className="mt-6 text-sm text-text-secondary">Invalid or missing reset link. Please request a new password reset.</p>;
  }

  if (done) {
    return (
      <div className="mt-6">
        <p className="text-sm text-text-secondary">Your password has been reset successfully. You can now log in with your new password.</p>
        <Link href="/auth/login" className="btn-primary mt-6 block w-full text-center">Go to Login</Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, confirmPassword: confirm })
    });
    const data = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) {
      const firstError = data?.fields ? (Object.values(data.fields)[0] as string[] | undefined)?.[0] : undefined;
      push(firstError ?? data?.error ?? "Could not reset your password.", "error");
      return;
    }
    setDone(true);
    push("Password reset successfully.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="password" className="label">New Password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="confirm" className="label">Confirm Password</label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Saving..." : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card-elevated w-full p-8">
        <h1 className="text-2xl font-bold">Reset Password</h1>
        <p className="mt-1 text-sm text-text-secondary">Choose a new password for your account.</p>
        <Suspense fallback={<p className="mt-6 text-sm text-text-secondary">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
