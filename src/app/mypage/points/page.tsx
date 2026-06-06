import MypagePointsClient from "@/app/mypage/points/mypage-points-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "마이페이지 - PING",
};

export default function MypagePointsPage() {
  return <MypagePointsClient />;
}
