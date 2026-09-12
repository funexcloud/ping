import type { ElementType } from "react";
import { cn } from "@/lib/utils";

export function splitTitleAfterMarker(title: string, marker: string): [string, string] {
  const i = title.indexOf(marker);
  if (i < 0) return [title, ""];
  return [title.slice(0, i + marker.length), title.slice(i + marker.length).trim()];
}

type LandingDisplayTitleProps = {
  as?: "h1" | "h2" | "p";
  title: string;
  /** Inclusive first-line ending. Hidden on PC, shown on mobile. */
  breakAfter?: string;
  id?: string;
  className?: string;
  accentRest?: boolean;
};

/** PC one line; mobile wraps at `breakAfter`, then naturally if still tight. */
export function LandingDisplayTitle({
  as: Tag = "h2",
  title,
  breakAfter,
  id,
  className,
  accentRest = false,
}: LandingDisplayTitleProps) {
  const [lead, rest] = breakAfter ? splitTitleAfterMarker(title, breakAfter) : [title, ""];
  const Title = Tag as ElementType;

  return (
    <Title id={id} className={cn("ping-display-title", className)}>
      {lead}
      {rest ? (
        <>
          <span className="ping-display-title__space"> </span>
          <br className="ping-display-title__break" />
          {accentRest ? <span className="intro-hero__title-accent">{rest}</span> : rest}
        </>
      ) : null}
    </Title>
  );
}
