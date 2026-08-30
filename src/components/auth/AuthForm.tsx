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
