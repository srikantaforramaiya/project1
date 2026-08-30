import { SimplePage } from "@/components/pages/SimplePage";

export default function RefundPolicy() {
  return (
    <SimplePage
      title="Refund & Cancellation Policy"
      intro="You can cancel orders before they begin preparation. Refunds for verified payments are processed to the original UPI account."
      sections={[
        { heading: "Cancellation", body: "Orders can be cancelled while their status is 'Payment Received' or 'Confirmed'. Once preparation has started, cancellation may not be possible — contact us as early as possible." },
        { heading: "Refunds", body: "If an order is cancelled after payment, the full amount is refunded to your original UPI payment method, typically within 3–5 business days." },
        { heading: "Quality Issues", body: "If you receive an incorrect or unsatisfactory order, contact us within 2 hours of delivery with details and photos. Eligible orders receive a full or partial refund." }
      ]}
    />
  );
}
