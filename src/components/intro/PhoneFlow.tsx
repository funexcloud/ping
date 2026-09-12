"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { PhoneDeviceFrame } from "@/components/intro/PhoneDeviceFrame";
import { PhoneFlowScreen } from "@/components/intro/PhoneFlowScreen";
import { PHONE_FLOW } from "@/lib/intro/config";

gsap.registerPlugin(ScrollTrigger);

export function PhoneFlow() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const pinWrap = section.querySelector<HTMLElement>(".phone-flow__pin");
      const screens = gsap.utils.toArray<HTMLElement>(".phone-flow__screen", section);
      const steps = gsap.utils.toArray<HTMLElement>(".phone-flow__step", section);

      if (reduce || !pinWrap || screens.length === 0) {
        section.classList.add("phone-flow--static");
        gsap.set(screens, { opacity: 1, visibility: "visible", position: "relative" });
        gsap.set(steps, { opacity: 1, y: 0 });
        return;
      }

      gsap.set(screens, { opacity: 0, visibility: "hidden" });
      gsap.set(screens[0], { opacity: 1, visibility: "visible" });
      gsap.set(steps, { opacity: 0.32, y: 8 });
      gsap.set(steps[0], { opacity: 1, y: 0 });

      const segment = 1 / (screens.length - 1 || 1);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${Math.max(screens.length, 2) * window.innerHeight * 0.72}`,
          pin: pinWrap,
          scrub: 0.55,
          anticipatePin: 1,
        },
      });

      screens.forEach((screen, index) => {
        if (index === 0) return;

        const stepCopy = steps[index];
        const prev = screens[index - 1];

        tl.to(prev, { opacity: 0, duration: segment * 0.35, ease: "power1.inOut" }, index * segment)
          .set(prev, { visibility: "hidden" }, index * segment + segment * 0.35)
          .set(screen, { visibility: "visible" }, index * segment + segment * 0.35)
          .to(screen, { opacity: 1, duration: segment * 0.35, ease: "power1.inOut" }, index * segment + segment * 0.35)
          .to(
            steps[index - 1],
            { opacity: 0.28, y: -4, duration: segment * 0.25 },
            index * segment,
          )
          .to(stepCopy, { opacity: 1, y: 0, duration: segment * 0.35 }, index * segment + segment * 0.1);
      });

      void document.fonts.ready.then(() => ScrollTrigger.refresh());
    },
    { scope: root },
  );

  return (
    <section ref={root} className="phone-flow phone-flow--embedded" aria-label="발송 화면 체험">
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
