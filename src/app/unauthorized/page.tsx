import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl" aria-hidden>🔒</p>
      <h1 className="mt-4 text-2xl font-bold">Access Denied</h1>
      <p className="mt-2 max-w-sm text-text-secondary">You do not have permission to view this area. Administrator access is required.</p>
      <Link href="/" className="btn-primary mt-6">Back to Store</Link>
    </div>
  );
}
