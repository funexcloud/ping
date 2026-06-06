import type { Metadata } from "next";
import SendUrlClient from "./send-url-client";

export const metadata: Metadata = {
  title: "PING · 부고 주소 입력",
  robots: { index: false, follow: false },
};

export default function SendUrlPage() {
  return (
    <div className="ping-layout-centered">
      <SendUrlClient />
    </div>
  );
}
