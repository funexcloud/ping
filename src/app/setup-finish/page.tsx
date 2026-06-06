import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const GUIDE_URL = "https://guide-page.dothome.co.kr/start_linux.html";

export default function SetupFinishPage() {
  redirect(GUIDE_URL);
}
