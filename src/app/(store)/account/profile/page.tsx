"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export default function ProfilePage() {
  const router = useRouter();
  const { push } = useToast();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then((s) => {
      if (s) { setName(s.name); setEmail(s.email); }
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone })
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      const firstError = data?.fields ? (Object.values(data.fields)[0] as string[] | undefined)?.[0] : undefined;
      push(firstError ?? data?.error ?? "Update failed.", "error");
      return;
    }
    push("Profile updated.");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Profile</h1>
      <form onSubmit={onSubmit} className="card mt-6 max-w-md space-y-4 p-6">
        <div>
          <label htmlFor="name" className="label">Full Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
        </div>
        <div>
          <label htmlFor="phone" className="label">Mobile Number</label>
          <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" inputMode="numeric" required />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" value={email} className="input opacity-60" disabled aria-describedby="email-note" />
          <p id="email-note" className="field-error">Email changes require identity verification — contact support to change your email.</p>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
      </form>
    </div>
  );
}
