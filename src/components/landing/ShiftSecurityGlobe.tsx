"use client";

import { LandingDisplayTitle } from "@/components/landing/LandingDisplayTitle";
import { GlobeCdn } from "@/components/ui/cobe-globe-cdn";
import {
  LANDING_SECTION_EYEBROWS,
  LANDING_SHIFT_SECURITY_LEAD,
  LANDING_SHIFT_SECURITY_TITLE,
  LANDING_TITLE_BREAKS,
} from "@/content/landing/landing-config";

/** Before/After 그리드 아래 — 통신·CDN 보안 내러티브 + 글로브 */
export function ShiftSecurityGlobe() {
  return (
    <div className="ping-saas-shift-security">
      <div className="ping-saas-section-head ping-saas-shift-security__head">
        <p className="ping-saas-label">{LANDING_SECTION_EYEBROWS.security}</p>
        <LandingDisplayTitle
          title={LANDING_SHIFT_SECURITY_TITLE}
          breakAfter={LANDING_TITLE_BREAKS.security}
        />
        <p className="ping-saas-section-desc">{LANDING_SHIFT_SECURITY_LEAD}</p>
      </div>
      <div className="ping-saas-shift-security__globe">
        <GlobeCdn />
      </div>
    </div>
  );
}
