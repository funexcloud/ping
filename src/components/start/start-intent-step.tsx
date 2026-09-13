import { FilePenLine, Send } from "lucide-react";

import { START_INTENT_COPY } from "@/lib/ping-flow-step-copy";

type StartIntentStepProps = {
  onChooseBulk: () => void;
  onChooseWrite: () => void;
};

export function StartIntentStep({ onChooseBulk, onChooseWrite }: StartIntentStepProps) {
  return (
    <section className="ping-start__body ping-start-step" aria-labelledby="start-intent-title">
      <div className="ping-start-step__head">
        <h2 id="start-intent-title" className="ping-start-step__title">
          {START_INTENT_COPY.title}
        </h2>
        <p className="ping-start-step__sub">{START_INTENT_COPY.subtitle}</p>
      </div>
      <div className="ping-start-intent">
        <button type="button" className="ping-start-intent__card is-primary" onClick={onChooseBulk}>
          <Send aria-hidden="true" />
          <span>
            <strong>{START_INTENT_COPY.bulkTitle}</strong>
            <em>{START_INTENT_COPY.bulkSub}</em>
          </span>
        </button>
        <button type="button" className="ping-start-intent__card" onClick={onChooseWrite}>
          <FilePenLine aria-hidden="true" />
          <span>
            <strong>{START_INTENT_COPY.writeTitle}</strong>
            <em>{START_INTENT_COPY.writeSub}</em>
          </span>
        </button>
      </div>
    </section>
  );
}
