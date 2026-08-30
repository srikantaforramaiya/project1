import { SimplePage } from "@/components/pages/SimplePage";
import { BUSINESS_ADDRESS, BUSINESS_PHONE, BUSINESS_EMAIL } from "@/lib/store-config";

export default function Contact() {
  return (
    <SimplePage
      title="Contact Us"
      intro="Questions about your order, delivery area or anything else? Reach out."
      sections={[
        { heading: "Address", body: BUSINESS_ADDRESS },
        { heading: "Phone", body: BUSINESS_PHONE },
        { heading: "Email", body: BUSINESS_EMAIL },
        { heading: "Hours", body: "Open daily, 8:00 AM – 10:00 PM." }
      ]}
    />
  );
}
