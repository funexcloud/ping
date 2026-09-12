import type { LucideIcon } from "lucide-react";

export type ProductPingAudience = "consumer" | "business";

export type ProductPingLandingContent = {
  audience: ProductPingAudience;
  hero: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    lead: string;
    badge: string;
  };
  oldWay: {
    anchorId: string;
    sectionLabel: string;
    title: string;
    description: string;
    pains: string[];
  };
  theShift: {
    anchorId: string;
    sectionLabel: string;
    title: string;
    description: string;
    beforeTitle: string;
    beforeItems: string[];
    afterTitle: string;
    afterItems: string[];
    demoHint: string;
    timeBadge: string;
  };
  trust: {
    anchorId: string;
    sectionLabel: string;
    title: string;
    description: string;
    items: { title: string; desc: string; Icon: LucideIcon }[];
  };
  vertical: {
    anchorId: string;
    sectionLabel: string;
    title: string;
    description: string;
    steps: { title: string; desc: string; href?: string }[];
  };
  pricing: {
    anchorId: string;
    sectionLabel: string;
    title: string;
    description: string;
    planName: string;
    planDesc: string;
    baseFee: string;
    unitPrice: string;
    note: string;
  };
  howItWorks: {
    anchorId: string;
    sectionLabel: string;
    title: string;
    description: string;
    steps: { title: string; desc: string }[];
  };
  faq: {
    anchorId: string;
    sectionLabel: string;
    title: string;
    description: string;
    items: { question: string; answer: string }[];
  };
  start: {
    anchorId: string;
    sectionLabel: string;
    title: string;
    lead: string;
  };
};
