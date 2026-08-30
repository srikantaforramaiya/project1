import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </div>
  );
}
