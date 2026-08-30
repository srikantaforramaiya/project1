import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { BUSINESS_NAME, TAGLINE } from "@/lib/store-config";

export const metadata: Metadata = {
  title: { default: `${BUSINESS_NAME} — ${TAGLINE}`, template: `%s · ${BUSINESS_NAME}` },
  description: "Order fresh, locally prepared food online. Secure UPI payments and quick local delivery.",
  openGraph: {
    title: BUSINESS_NAME,
    description: TAGLINE,
    type: "website"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
