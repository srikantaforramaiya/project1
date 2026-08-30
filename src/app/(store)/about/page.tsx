import { SimplePage } from "@/components/pages/SimplePage";

export default function About() {
  return (
    <SimplePage
      title="About Us"
      intro="We are a local kitchen serving fresh, homemade-style food to our neighbourhood."
      sections={[
        {
          heading: "Our Story",
          body: "Neon Bites started as a small family kitchen with a simple idea: serve the food we love to our neighbours, made fresh every single day. Every dish is prepared in small batches using locally sourced ingredients."
        },
        {
          heading: "What Makes Us Different",
          body: "No pre-made food sitting in display counters. You order, we cook, we deliver — hot and fresh. We follow strict hygiene practices in our kitchen and package every order carefully."
        },
        {
          heading: "Our Promise",
          body: "Fresh food, honest prices, secure UPI payments and quick local delivery. If something isn't right with your order, contact us and we will make it right."
        }
      ]}
    />
  );
}
