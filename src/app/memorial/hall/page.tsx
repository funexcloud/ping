import MemorialHallClient from "@/app/memorial/hall/memorial-hall-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "영구추모관 - PING",
};

export default function MemorialHallPage() {
  return <MemorialHallClient />;
}
