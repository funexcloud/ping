import MemorialListClient from "@/app/memorial/list/memorial-list-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "추모관 목록 - PING",
};

export default function MemorialListPage() {
  return <MemorialListClient />;
}
