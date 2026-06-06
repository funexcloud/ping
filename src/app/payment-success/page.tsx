import { PaymentSuccessClient } from "@/app/payment-success/payment-success-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "결제 완료 — PING",
  robots: { index: false, follow: false },
};

export default function PaymentSuccessPage() {
  return <PaymentSuccessClient />;
}
