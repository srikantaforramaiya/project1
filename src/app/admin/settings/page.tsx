import { env } from "@/lib/env";
import { STORE_CONFIG, BUSINESS_NAME, BUSINESS_ADDRESS, BUSINESS_PHONE, BUSINESS_EMAIL } from "@/lib/store-config";
import { isEmailConfigured } from "@/services/email.service";

export default function AdminSettingsPage() {
  const sections: { title: string; rows: { label: string; value: string }[] }[] = [
    {
      title: "General",
      rows: [
        { label: "Store Name", value: BUSINESS_NAME },
        { label: "Store Address", value: BUSINESS_ADDRESS },
        { label: "Contact Phone", value: BUSINESS_PHONE },
        { label: "Contact Email", value: BUSINESS_EMAIL }
      ]
    },
    {
      title: "Ordering & Delivery",
      rows: [
        { label: "Minimum Order Amount", value: `₹${STORE_CONFIG.minimumOrderAmount}` },
        { label: "Delivery Fee", value: `₹${STORE_CONFIG.deliveryFee}` },
        { label: "Free Delivery Threshold", value: `₹${STORE_CONFIG.freeDeliveryThreshold}` },
        { label: "Default Preparation Time", value: `${STORE_CONFIG.defaultPreparationMinutes} minutes` },
        { label: "Serviceable PIN Codes", value: STORE_CONFIG.serviceablePostalCodes.join(", ") },
        { label: "Business Hours", value: `${STORE_CONFIG.businessHours.openHour}:00 – ${STORE_CONFIG.businessHours.closeHour}:00` }
      ]
    },
    {
      title: "Payments",
      rows: [
        { label: "Payment Mode", value: env.PAYMENT_MODE === "razorpay" ? "Razorpay — Configured ✓" : "Mock (development only)" },
        { label: "Webhook Endpoint", value: `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/payment` },
        { label: "Webhook Secret", value: env.PAYMENT_WEBHOOK_SECRET ? "Configured ✓" : "Not configured" }
      ]
    },
    {
      title: "Email",
      rows: [
        { label: "SMTP Provider", value: isEmailConfigured() ? "Configured ✓" : "Not configured (emails are logged but not sent)" },
        { label: "From Address", value: env.EMAIL_FROM }
      ]
    }
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Store configuration is centralised in <code className="text-primary">src/lib/store-config.ts</code> and environment variables.
        Secrets are never displayed or stored in the database.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {sections.map((s) => (
          <section key={s.title} className="card p-6 text-sm">
            <h2 className="mb-3 font-semibold">{s.title}</h2>
            <dl className="space-y-2">
              {s.rows.map((r) => (
                <div key={r.label} className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
                  <dt className="text-text-secondary">{r.label}</dt>
                  <dd className="text-right font-medium">{r.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
