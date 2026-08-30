import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
