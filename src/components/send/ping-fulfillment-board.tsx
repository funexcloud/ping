"use client";

import { PingBrandLogo } from "@/components/brand/ping-brand-logo";
import {
  fulfillmentHeadline,
  fulfillmentLead,
  fulfillmentProgressPercent,
  fulfillmentStatRows,
  fulfillmentStepStates,
  formatKnownCount,
  type FulfillmentStepState,
} from "@/lib/ping-fulfillment-ui";
import type { FulfillmentDerived } from "@/lib/ping-order-fulfillment";
import { cn } from "@/lib/utils";

import "./ping-fulfillment-board.css";

const STEPS: { key: "contacts" | "send" | "result"; label: string }[] = [
  { key: "contacts", label: "연락처 확인" },
  { key: "send", label: "메시지 발송" },
  { key: "result", label: "전달 결과 확인" },
];

function stepCount(
  key: "contacts" | "send" | "result",
  data: FulfillmentDerived,
): string | null {
  if (key === "contacts") return formatKnownCount(data.targetCount);
  if (key === "send") return formatKnownCount(data.sentCount);
  if (key === "result" && (data.phase === "partial" || data.phase === "failed")) {
    return formatKnownCount(data.failedCount);
  }
  return null;
}

function StepDot({ state }: { state: FulfillmentStepState }) {
  return <span className={cn("ping-send-board__dot", `is-${state}`)} aria-hidden />;
}

export function PingFulfillmentBoard({ data }: { data: FulfillmentDerived }) {
  const title = fulfillmentHeadline(data.phase);
  const lead = fulfillmentLead(data.phase);
  const sending = data.phase === "dispatching";
  const pct = fulfillmentProgressPercent(data);
  const sentLabel = formatKnownCount(data.sentCount);
  const totalLabel = formatKnownCount(data.targetCount);
  const steps = fulfillmentStepStates(data.phase);
  const stats = fulfillmentStatRows(data);

  return (
    <section
      className={cn("ping-send-board", sending && "is-sending")}
      aria-live="polite"
      aria-label={title}
    >
      <h2 className="ping-send-board__title">{title}</h2>

      <div className={cn("ping-send-board__mark", sending && "is-sending")}>
        <span className="ping-send-board__wave" aria-hidden />
        <span className="ping-send-board__wave ping-send-board__wave--mid" aria-hidden />
        <span className="ping-send-board__wave ping-send-board__wave--inner" aria-hidden />
        <PingBrandLogo variant="mark" className="ping-send-board__symbol" />
      </div>

      {sentLabel || totalLabel ? (
        <p className="ping-send-board__ratio">
          {sentLabel ?? "—"}
          {totalLabel ? <span> / {totalLabel}</span> : null}
        </p>
      ) : null}

      {pct != null ? (
        <div
          className="ping-send-board__progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
      ) : sending ? (
        <div className="ping-send-board__progress is-indeterminate" role="progressbar" aria-label="발송 진행">
          <span />
        </div>
      ) : null}

      <ul className="ping-send-board__steps">
        {STEPS.map((step) => {
          const count = stepCount(step.key, data);
          return (
            <li key={step.key} className={cn(`is-${steps[step.key]}`)}>
              <StepDot state={steps[step.key]} />
              <span className="ping-send-board__step-label">{step.label}</span>
              {count ? <span className="ping-send-board__step-count">{count}명</span> : null}
            </li>
          );
        })}
      </ul>

      {stats.length > 0 ? (
        <div className="ping-send-board__stats" aria-label="발송 결과">
          {stats.map((row) => (
            <div key={row.key}>
              <small>{row.label}</small>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <p className="ping-send-board__lead">{lead}</p>
    </section>
  );
}
