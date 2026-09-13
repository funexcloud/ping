import { CANONICAL_SEND_JOURNEY_STEPS } from "@/lib/ping-flow-step-copy";

export function IntroJourneySteps({ benefitsMode = "grid" }: { benefitsMode?: "grid" | "scroll" }) {
  return (
    <div className={benefitsMode === "scroll" ? "grid gap-4" : "grid gap-4 md:grid-cols-3 lg:grid-cols-5"}>
      {CANONICAL_SEND_JOURNEY_STEPS.map((step, index) => {
        const no = String(index + 1).padStart(2, "0");
        return (
          <article key={step.title} className="rounded-2xl border bg-white p-4">
            <span className="text-xs font-bold text-ping-primary">{no}</span>
            <h3 className="mt-2 font-bold">{step.title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{step.desc}</p>
          </article>
        );
      })}
    </div>
  );
}

export function IntroFeaturesGrid() {
  return <IntroJourneySteps />;
}
