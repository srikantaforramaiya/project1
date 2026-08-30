"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";

function ResetPasswordFormInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();
  const { push } = useToast();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      push("Passwords do not match.", "error");
      return;
    }
    setPending(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: form.get("password"), confirmPassword: form.get("confirmPassword") })
    });
    const data = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) {
      push(data?.error ?? "Reset failed.", "error");
      return;
    }
    push("Password updated. Please log in.");
    router.push("/auth/login");
  }

  return (
    <div className="card-elevated mx-auto w-full max-w-md p-8">
      <h1 className="text-2xl font-bold">Reset Password</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="label">New Password</label>
          <input id="password" name="password" type="password" className="input" required autoComplete="new-password" />
          <p className="field-error">Min 8 chars with upper, lower and a number.</p>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="label">Confirm New Password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" className="input" required autoComplete="new-password" />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={pending}>{pending ? "Updating..." : "Update Password"}</button>
      </form>
      <div className="mt-4 text-center text-sm">
        <Link href="/auth/login" className="text-text-secondary hover:text-primary">Back to login</Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Suspense>
        <ResetPasswordFormInner />
      </Suspense>
    </div>
  );
}
