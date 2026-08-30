import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-extrabold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-sm text-text-secondary">The page you&apos;re looking for doesn&apos;t exist or may have been moved.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn-primary">Go Home</Link>
        <Link href="/menu" className="btn-secondary">View Menu</Link>
      </div>
    </div>
  );
}
