"use client";

import "./ping-bank-account-copy-all-button.css";

import {
  copyTextToClipboard,
  formatBankTransferCopyText,
} from "@/lib/ping-bank-transfer-checkout";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

type PingBankAccountCopyAllButtonProps = {
  className?: string;
};

export function PingBankAccountCopyAllButton({ className }: PingBankAccountCopyAllButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    const ok = await copyTextToClipboard(formatBankTransferCopyText());
    if (!ok) {
      alert("복사에 실패했습니다. 계좌번호를 직접 선택해 복사해 주세요.");
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <button
      type="button"
      className={cn(
        "ping-bank-copy-all-btn inline-flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors",
        copied
          ? "ping-bank-copy-all-btn--copied border-amber-200 bg-amber-50 text-amber-950"
          : "border-[#0336FF]/30 bg-[#0336FF]/5 text-[#0336FF]",
        className,
      )}
      aria-label={copied ? "계좌 정보 복사됨" : "계좌 정보 한 번에 복사"}
      onClick={() => void onCopy()}
    >
      {copied ? (
        <Check className="size-4 shrink-0 text-amber-950" strokeWidth={2.5} aria-hidden />
      ) : (
        <Copy className="size-4 shrink-0" strokeWidth={2} aria-hidden />
      )}
      <span>{copied ? "복사됨" : "계좌 정보 한 번에 복사"}</span>
    </button>
  );
}
