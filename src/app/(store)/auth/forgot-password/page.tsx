import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return <div className="mx-auto max-w-md px-4 py-16"><ForgotPasswordForm /></div>;
}
