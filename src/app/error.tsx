"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="h-12 w-12 text-warning" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-text-secondary">An unexpected error occurred. Our team has been notified. Please try again.</p>
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="btn-primary">Try Again</button>
        <Link href="/" className="btn-secondary">Go Home</Link>
      </div>
    </div>
  );
}
