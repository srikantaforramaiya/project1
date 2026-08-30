import { requireUser } from "@/lib/auth";
import { getCartLines } from "@/services/cart.service";
import { listAddresses } from "@/services/account.service";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { STORE_CONFIG } from "@/lib/store-config";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser();
  const [lines, addresses] = await Promise.all([getCartLines(user.id), listAddresses(user.id)]);

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-text-secondary">Add some dishes before checking out.</p>
      </div>
    );
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const deliveryCharge = subtotal >= STORE_CONFIG.freeDeliveryThreshold ? 0 : STORE_CONFIG.deliveryFee;

  return (
    <CheckoutForm
      lines={lines}
      addresses={addresses}
      user={{ name: user.name, email: user.email, phone: user.phone }}
      subtotal={subtotal}
      deliveryCharge={deliveryCharge}
      serviceablePostalCodes={STORE_CONFIG.serviceablePostalCodes}
    />
  );
}
