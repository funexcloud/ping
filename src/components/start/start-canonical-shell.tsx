import type { ReactNode } from "react";

type StartCanonicalShellProps = {
  children: ReactNode;
};

/**
 * `/start` application column.
 * Same responsive UI on phone / tablet / desktop — no device mockup.
 * Mobile: full viewport width. Desktop: centered `--ping-service-column` (480px).
 */
export function StartCanonicalShell({ children }: StartCanonicalShellProps) {
  return (
    <div className="ping-start">
      <div className="ping-start__app">{children}</div>
    </div>
  );
}
