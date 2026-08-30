import { SimplePage } from "@/components/pages/SimplePage";

export default function Privacy() {
  return (
    <SimplePage
      title="Privacy Policy"
      intro="This policy explains what information we collect and how we use it. Please replace this placeholder text with your final policy before going live."
      sections={[
        { heading: "Information We Collect", body: "We collect your name, email address, mobile number and delivery addresses to process orders. Payment information is handled entirely by our payment gateway — we never store card or UPI credentials." },
        { heading: "How We Use Information", body: "Your information is used only to fulfil orders, send order confirmations, and provide customer support. We do not sell your data to third parties." },
        { heading: "Data Retention", body: "Order records are retained for accounting and legal purposes. You may request deletion of your account data by contacting us." },
        { heading: "Contact", body: "For privacy questions, email us using the details on our Contact page." }
      ]}
    />
  );
}
