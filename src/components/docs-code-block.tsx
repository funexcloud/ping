"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const PACKAGE_MANAGERS = ["pnpm", "npm", "yarn", "bun"] as const;

export type PackageManagerId = (typeof PACKAGE_MANAGERS)[number];

export type DocsCodeBlockProps = {
  /** 탭 value → 소스. 비어 있지 않은 패키지 매니저만 탭으로 표시. */
  snippets: Partial<Record<PackageManagerId, string>>;
  defaultTab?: PackageManagerId;
  className?: string;
};

const COPY_DONE_MS = 2000;

function orderedKeys(
  snippets: DocsCodeBlockProps["snippets"],
): PackageManagerId[] {
  return PACKAGE_MANAGERS.filter((k) => {
    const v = snippets[k];
    return typeof v === "string" && v.trim().length > 0;
  });
}

/**
 * shadcn/ui 문서 스타일 설치 커맨드 블록.
 * 바깥은 `bg-muted` / `text-muted-foreground`, 코드 영역은 `--code-inner-*` (다크).
 */
export function DocsCodeBlock({
  snippets,
  defaultTab,
  className,
}: DocsCodeBlockProps) {
  const keys = React.useMemo(() => orderedKeys(snippets), [snippets]);

  const [tab, setTab] = React.useState<string>(() => {
    if (
      defaultTab &&
      snippets[defaultTab] &&
      String(snippets[defaultTab]).trim()
    ) {
      return defaultTab;
    }
    return keys[0] ?? "npm";
  });

  React.useEffect(() => {
    if (keys.length && !keys.includes(tab as PackageManagerId)) {
      setTab(keys[0]!);
    }
  }, [keys, tab]);

  const activeTab = tab as PackageManagerId;
  const activeCode = keys.includes(activeTab)
    ? (snippets[activeTab] ?? "")
    : "";

  const [copied, setCopied] = React.useState(false);
  const onCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPY_DONE_MS);
    } catch {
      /* ignore */
    }
  }, [activeCode]);

  if (keys.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg bg-muted text-muted-foreground",
        className,
      )}
    >
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-2">
          <TabsList className="h-auto gap-0.5 bg-muted/80 p-0 text-muted-foreground shadow-none">
            {keys.map((k) => (
              <TabsTrigger
                key={k}
                value={k}
                className={cn(
                  "rounded-md border-0 px-3 py-1.5 text-sm shadow-none ring-offset-background",
                  "bg-transparent font-normal text-muted-foreground",
                  "transition-colors hover:text-foreground/80",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "data-[state=active]:bg-card data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none",
                )}
              >
                {k}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={onCopy}
            aria-label="클립보드에 복사"
          >
            {copied ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
          </Button>
        </div>
        {keys.map((k) => (
          <TabsContent
            key={k}
            value={k}
            className="m-0 mt-0 p-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            <pre
              className={cn(
                "max-h-[min(24rem,50vh)] overflow-x-auto overflow-y-auto",
                "bg-code-inner px-4 py-3 font-mono text-[13px] leading-relaxed",
                "text-code-inner-foreground [tab-size:2]",
              )}
            >
              <code>{snippets[k]}</code>
            </pre>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/** 문서 예시용 기본 스니펫 (필요 시 그대로 또는 수정해 `snippets`에 전달) */
export const EXAMPLE_SHADCN_ADD_COMMANDS: Record<PackageManagerId, string> = {
  pnpm: "pnpm dlx shadcn@latest add button",
  npm: "npx shadcn@latest add button",
  yarn: "yarn dlx shadcn@latest add button",
  bun: "bunx --bun shadcn@latest add button",
};
