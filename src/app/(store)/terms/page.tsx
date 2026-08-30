import { SimplePage } from "@/components/pages/SimplePage";

export default function Terms() {
  return (
    <SimplePage
      title="Terms & Conditions"
      intro="By placing an order on this website you agree to the terms below. Please have these reviewed and finalised before going live."
      sections={[
        { heading: "Orders", body: "All orders are subject to availability and confirmation of payment. We reserve the right to refuse or cancel orders in cases of suspected fraud or stock errors." },
        { heading: "Pricing", body: "Prices are shown in Indian Rupees and include applicable taxes unless stated otherwise. Delivery charges are shown before payment." },
        { heading: "Delivery", body: "We deliver only to serviceable PIN codes. Estimated delivery times are indicative and not guaranteed." },
        { heading: "Liability", body: "Our liability for any order is limited to the amount paid for that order. Allergen information is available on request." }
      ]}
    />
  );
}
