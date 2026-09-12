import { LandingDisplayTitle } from "@/components/landing/LandingDisplayTitle";
import { TestimonialsMinimal } from "@/components/ui/minimal-testimonial";
import {
  LANDING_CEO_NAME,
  LANDING_CEO_PHOTO,
  LANDING_CEO_STORY_URL,
  LANDING_CEO_TITLE,
  LANDING_SECTION_EYEBROWS,
  LANDING_STORY_LEAD,
  LANDING_STORY_QUOTES,
  LANDING_STORY_TITLE,
  LANDING_TITLE_BREAKS,
} from "@/content/landing/landing-config";

export function StorySection() {
  const items = LANDING_STORY_QUOTES.map((quote) => ({
    quote,
    name: LANDING_CEO_NAME,
    role: LANDING_CEO_TITLE,
    image: LANDING_CEO_PHOTO,
  }));

  return (
    <section className="ping-saas-story">
      <div className="ping-saas-shell ping-saas-shell--narrow">
        <header className="ping-saas-section-head ping-saas-story__head">
          <p className="ping-saas-label">{LANDING_SECTION_EYEBROWS.story}</p>
          <LandingDisplayTitle title={LANDING_STORY_TITLE} breakAfter={LANDING_TITLE_BREAKS.story} />
          <p className="ping-saas-section-desc">{LANDING_STORY_LEAD}</p>
        </header>

        <TestimonialsMinimal
          items={items}
          storyHref={LANDING_CEO_STORY_URL}
          storyLabel="대표 이야기 더 보기 →"
          className="px-0 py-0"
        />
      </div>
    </section>
  );
}
