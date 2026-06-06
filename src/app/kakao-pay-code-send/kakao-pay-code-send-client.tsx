"use client";

import { BookOpen, ClipboardCopy, ExternalLink, Smartphone } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const KAKAO_PAY_OPEN = "https://www.kakaopay.com";
const KAKAO_PAY_DEV = "https://developers.kakaopay.com";

export function KakaoPayCodeSendClient() {
  const [transferCode, setTransferCode] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const requestMessage = useMemo(() => {
    const parts: string[] = [];
    const won = amount.replace(/\D/g, "");
    if (won) {
      const n = Number(won);
      if (Number.isFinite(n) && n > 0) {
        parts.push(`${n.toLocaleString("ko-KR")}원`);
      }
    }
    const code = transferCode.trim();
    if (code) parts.push(`송금 코드: ${code}`);
    if (memo.trim()) parts.push(`메모: ${memo.trim()}`);
    const body =
      parts.length > 0
        ? `카카오페이 코드송금 부탁드립니다.\n${parts.join("\n")}`
        : "카카오페이 코드송금 부탁드립니다.";
    return body;
  }, [amount, memo, transferCode]);

  const flash = useCallback((msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2200);
  }, []);

  const copyText = useCallback(
    async (text: string, okMsg: string) => {
      const t = text.trim();
      if (!t) {
        flash("복사할 내용이 없습니다.");
        return;
      }
      try {
        await navigator.clipboard.writeText(t);
        flash(okMsg);
      } catch {
        flash("복사에 실패했습니다. 브라우저에서 클립보드 권한을 확인해 주세요.");
      }
    },
    [flash],
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-lg px-4 py-10 pb-16">
        <p className="mb-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-center text-xs font-medium leading-relaxed text-muted-foreground">
          이 화면은 다른 메뉴·신청·결제 단계와 <span className="text-foreground">연결되지 않은</span>{" "}
          독립 페이지입니다.
        </p>

        <header className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Smartphone className="size-6" aria-hidden />
          </div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            카카오페이 코드송금
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            앱에서 확인한 <strong className="font-semibold text-foreground">송금 코드</strong>를
            정리하고, 상대에게 보낼 문구를 복사할 때 쓸 수 있는 보조 화면입니다.
          </p>
        </header>

        <section
          className="mb-8 rounded-xl border border-border bg-card p-4 shadow-sm"
          aria-labelledby="steps-title"
        >
          <h2 id="steps-title" className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="size-4 shrink-0 text-primary" aria-hidden />
            앱에서 코드 확인하기
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>카카오페이 앱 실행</li>
            <li>
              <span className="text-foreground">송금</span> →{" "}
              <span className="text-foreground">코드 송금</span> 메뉴 (앱 UI는 업데이트될 수
              있습니다)
            </li>
            <li>표시되는 코드를 아래 입력란에 적어 두고 복사해 사용하세요</li>
          </ol>
          <Button variant="outline" size="sm" className="mt-4 w-full sm:w-auto" asChild>
            <a href={KAKAO_PAY_OPEN} target="_blank" rel="noopener noreferrer">
              카카오페이 안내 웹
              <ExternalLink className="size-3.5 opacity-70" aria-hidden />
            </a>
          </Button>
        </section>

        <section className="space-y-5 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="transfer-code">송금 코드</Label>
            <Input
              id="transfer-code"
              name="transfer-code"
              inputMode="text"
              autoComplete="off"
              placeholder="앱에 표시된 코드를 입력"
              value={transferCode}
              onChange={(e) => setTransferCode(e.target.value)}
              className="font-mono text-base"
            />
            <p className="text-xs text-muted-foreground">
              받을 때: 내 코드를 기입한 뒤 &quot;코드만 복사&quot;로 공유하세요. 보낼 때는 앱에 상대
              코드를 입력합니다.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">요청 금액 (선택)</Label>
            <Input
              id="amount"
              name="amount"
              inputMode="numeric"
              placeholder="예: 10000"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">메모 (선택)</Label>
            <Input
              id="memo"
              name="memo"
              placeholder="예: 부고 문자 비용"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="default"
              className="flex-1"
              onClick={() => copyText(transferCode, "코드를 복사했습니다.")}
              disabled={!transferCode.trim()}
            >
              <ClipboardCopy className="size-4" aria-hidden />
              코드만 복사
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => copyText(requestMessage, "요청 문구를 복사했습니다.")}
            >
              <ClipboardCopy className="size-4" aria-hidden />
              요청 문구 복사
            </Button>
          </div>

          <div
            className={cn(
              "rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground transition-opacity",
              !transferCode.trim() && !amount && !memo.trim() && "opacity-70",
            )}
          >
            <p className="mb-1 text-xs font-medium text-foreground">미리보기</p>
            <pre className="whitespace-pre-wrap break-all font-sans text-xs">{requestMessage}</pre>
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-border bg-muted/20 p-4">
          <h2 className="mb-2 text-sm font-semibold">개발자·코드송금 API</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            서비스에 연동하려면 카카오페이 개발자 센터에서 앱 등록·키 발급이 필요합니다. 이 페이지는
            연동 API를 호출하지 않습니다.
          </p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <a href={KAKAO_PAY_DEV} target="_blank" rel="noopener noreferrer">
              developers.kakaopay.com
              <ExternalLink className="size-3.5 opacity-70" aria-hidden />
            </a>
          </Button>
        </section>

        {notice ? (
          <p
            role="status"
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-center text-sm text-background shadow-lg"
          >
            {notice}
          </p>
        ) : null}
      </div>
    </div>
  );
}
