import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { BUSINESS_NAME, BUSINESS_ADDRESS, BUSINESS_PHONE, BUSINESS_EMAIL } from "@/lib/store-config";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-bold">
            <UtensilsCrossed className="h-5 w-5 text-primary" aria-hidden />
            {BUSINESS_NAME}
          </div>
          <p className="mt-3 text-sm text-text-secondary">
            Fresh local food, bold flavours, delivered near you.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Contact</h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>{BUSINESS_ADDRESS}</li>
            <li>{BUSINESS_PHONE}</li>
            <li>{BUSINESS_EMAIL}</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Quick Links</h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li><Link href="/menu" className="hover:text-primary">Menu</Link></li>
            <li><Link href="/about" className="hover:text-primary">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
            <li><Link href="/account/orders" className="hover:text-primary">Track Order</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Legal</h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li><Link href="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-primary">Terms &amp; Conditions</Link></li>
            <li><Link href="/refund-policy" className="hover:text-primary">Refund / Cancellation Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-text-secondary">
        © {new Date().getFullYear()} {BUSINESS_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
