import type { Metadata } from "next";
import { FlowerOrderClient } from "./flower-order-client";
import "./flower.css";

export const metadata: Metadata = {
  title: "근조화환 보내기 - PING",
  description: "장례식장 근조화환 상품 선택 및 주문 접수",
};

export default function FlowerPage() {
  return <FlowerOrderClient />;
}
