import MemorialAuthClient from "@/app/memorial/auth/memorial-auth-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PASS 인증 - 영구추모관",
};

export default function MemorialAuthPage() {
  return <MemorialAuthClient />;
}
