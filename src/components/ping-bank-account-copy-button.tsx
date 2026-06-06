"use client";

import { copyTextToClipboard, PING_BANK_TRANSFER } from "@/lib/ping-bank-transfer-checkout";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

type PingBankAccountCopyButtonProps = {
  className?: string;
};

export function PingBankAccountCopyButton({ className }: PingBankAccountCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    const ok = await copyTextToClipboard(PING_BANK_TRANSFER.accountNumber);
    if (!ok) {
      alert("복사에 실패했습니다.");
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent touch-manipulation transition-colors",
        copied && "bg-amber-50",
        className,
      )}
      aria-label={copied ? "복사됨" : "계좌번호 복사"}
      title={copied ? "복사됨" : "복사"}
      onClick={() => void onCopy()}
    >
      {copied ? (
        <Check className="size-4 text-amber-950" strokeWidth={2.5} aria-hidden />
      ) : (
        <Copy className="size-4 text-gray-600" strokeWidth={2} aria-hidden />
      )}
    </button>
  );
}
