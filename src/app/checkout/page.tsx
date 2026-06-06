import { CheckoutClient } from "@/app/checkout/checkout-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "결제 — PING",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
