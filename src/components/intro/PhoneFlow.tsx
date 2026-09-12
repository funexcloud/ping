"use client";

import { PhoneDeviceFrame } from "@/components/intro/PhoneDeviceFrame";
import { PhoneFlowScreen } from "@/components/intro/PhoneFlowScreen";
import { PHONE_FLOW } from "@/lib/intro/phone-flow-config";

export function PhoneFlow() {
  return (
    <section
      className="phone-flow phone-flow--embedded phone-flow--static"
      aria-label="발송 화면 체험"
    >
      <div className="phone-flow__layout">
        <div className="phone-flow__pin">
          <PhoneDeviceFrame>
            {PHONE_FLOW.map((step) => (
              <div
                key={step.key}
                className="phone-flow__screen"
                data-step={step.key}
                aria-hidden
              >
                <PhoneFlowScreen step={step.key} />
              </div>
            ))}
          </PhoneDeviceFrame>
        </div>

        <div className="phone-flow__steps">
          {PHONE_FLOW.map((step, index) => (
            <article
              key={step.key}
              className="phone-flow__step ping-bordered-panel"
              data-step={step.key}
              aria-current={index === 0 ? "step" : undefined}
            >
              <p className="phone-flow__step-no">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
