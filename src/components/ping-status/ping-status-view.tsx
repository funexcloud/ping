"use client";

import { ArrowLeft, Headphones, House, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { PING_LOGO_ON_LIGHT_SRC } from "@/lib/ping-brand";
import styles from "./ping-status-view.module.css";

export type PingStatusAction = {
  kind: "link" | "back" | "retry";
  label: string;
  href?: string;
};

type PingStatusViewProps = {
  statusCode: string;
  eyebrow: string;
  title: string;
  description: string;
  actions: PingStatusAction[];
  onRetry?: () => void;
  digest?: string;
  showBrand?: boolean;
  standalone?: boolean;
  helpHref?: string;
  helpLabel?: string;
  asSection?: boolean;
};

function actionIcon(kind: PingStatusAction["kind"]): ReactNode {
  if (kind === "retry") return <RefreshCw aria-hidden />;
  if (kind === "back") return <ArrowLeft aria-hidden />;
  return <House aria-hidden />;
}

export function PingStatusView({
  statusCode,
  eyebrow,
  title,
  description,
  actions,
  onRetry,
  digest,
  showBrand = false,
  standalone = false,
  helpHref = "/customer-center",
  helpLabel = "도움이 필요해요",
  asSection = false,
}: PingStatusViewProps) {
  const router = useRouter();
  const Root = asSection ? "section" : "main";

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    window.location.assign("/");
  };

  return (
    <Root
      className={`${styles.page}${standalone ? ` ${styles.standalone}` : ""}`}
      role={statusCode === "404" ? undefined : "alert"}
      aria-live={statusCode === "404" ? undefined : "polite"}
    >
      <div className={styles.inner}>
        {showBrand ? (
          <a className={styles.brand} href="/" aria-label="PING 홈으로">
            <img
              className={styles.brandImage}
              src={PING_LOGO_ON_LIGHT_SRC}
              width="1024"
              height="1024"
              alt="PING"
            />
          </a>
        ) : null}

        <div className={styles.signalStage} aria-hidden="true">
          <span className={styles.orbit} />
          <p className={styles.code}>{statusCode}</p>
          <span className={styles.breakMark}>signal</span>
        </div>

        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>

        <div className={styles.actions} data-count={String(actions.length)}>
          {actions.map((action, index) => {
            const className = `${styles.action} ${index === 0 ? styles.primary : styles.secondary}`;

            if (action.kind === "link") {
              return (
                <a key={`${action.kind}:${action.href}:${action.label}`} className={className} href={action.href || "/"}>
                  {actionIcon(action.kind)}
                  {action.label}
                </a>
              );
            }

            return (
              <button
                key={`${action.kind}:${action.label}`}
                className={className}
                type="button"
                onClick={action.kind === "retry" ? onRetry : handleBack}
              >
                {actionIcon(action.kind)}
                {action.label}
              </button>
            );
          })}
        </div>

        <div className={styles.utilityRow}>
          <a className={styles.utilityLink} href={helpHref}>
            <Headphones aria-hidden size={14} /> {helpLabel}
          </a>
        </div>

        {digest ? <p className={styles.digest}>오류 코드 {digest}</p> : null}
        <p className={styles.signature}>보내고 · 닿고 · 기억되도록, PING</p>
      </div>
    </Root>
  );
}
