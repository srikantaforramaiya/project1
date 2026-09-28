"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { push } = useToast();

  const [current, setCurrent] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: nextPassword, confirmPassword: confirm })
    });
    const data = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) {
      const firstError = data?.fields ? (Object.values(data.fields)[0] as string[] | undefined)?.[0] : undefined;
      push(firstError ?? data?.error ?? "Could not change your password.", "error");
      return;
    }
    push("Password changed successfully.");
    setCurrent("");
    setNextPassword("");
    setConfirm("");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Change Password</h1>
      <p className="mt-1 text-sm text-text-secondary">Update the password used to sign in to your account.</p>
      <form onSubmit={onSubmit} className="card mt-6 max-w-md space-y-4 p-6">
        <div>
          <label htmlFor="current" className="label">Current Password</label>
          <input
            id="current"
            type="password"
            autoComplete="current-password"
            className="input"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="new" className="label">New Password</label>
          <input
            id="new"
            type="password"
            autoComplete="new-password"
            className="input"
            value={nextPassword}
            onChange={(e) => setNextPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="confirm" className="label">Confirm New Password</label>
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
          {pending ? "Changing..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}
