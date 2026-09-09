"use client";

import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="mb-4 text-center text-sm text-text-secondary">
        Password reset now uses a 6-digit OTP sent to your email. Enter your email below to receive it.
      </p>
      <ForgotPasswordForm />
      <div className="mt-4 text-center text-sm">
        <Link href="/auth/login" className="text-text-secondary hover:text-primary">Back to login</Link>
      </div>
    </div>
  );
}
