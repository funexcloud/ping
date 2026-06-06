import type { Metadata } from "next";
import { SolapiMySiteClient } from "./solapi-mysite-client";
import "./solapi-mysite.css";

export const metadata: Metadata = {
  title: "마이사이트 생성",
  description: "마이사이트 생성 요청 입력 페이지",
};

export default function SolapiMySitePage() {
  return <SolapiMySiteClient />;
}
