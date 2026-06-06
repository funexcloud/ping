import { redirect } from "next/navigation";

/** 레거시 `ping-cx-flow.html` 데모 — App Router `/intro` 와 동일한 CX 시연 */
export default function PingCxFlowPage() {
  redirect("/intro");
}
