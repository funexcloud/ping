import type { ReactNode } from "react";

type StartCanonicalShellProps = {
  children: ReactNode;
};

/**
 * `/start` presentation shell.
 * Native (0–1023): viewport is the app. Desktop (1024+): centered phone frame.
 */
export function StartCanonicalShell({ children }: StartCanonicalShellProps) {
  return (
    <div className="ping-start">
      <div className="ping-start__presentation">
        <div className="ping-start__notch" aria-hidden="true" />
        <div className="ping-start__app">{children}</div>
      </div>
    </div>
  );
}
