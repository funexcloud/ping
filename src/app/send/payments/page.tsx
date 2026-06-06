import type { Metadata } from "next";
import SendPaymentsClient from "./payments-client";

export const metadata: Metadata = {
  title: "PING · 결제 금액 확인",
  robots: { index: false, follow: false },
};

export default function SendPaymentsPage() {
  return (
    <div className="ping-layout-centered">
      <SendPaymentsClient />
    </div>
  );
}
