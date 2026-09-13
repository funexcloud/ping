"use client";

import { cn } from "@/lib/utils";
import { animate, motion, useMotionValue } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import useMeasure from "react-use-measure";

type InfiniteSliderProps = {
  children: ReactNode;
  gap?: number;
  duration?: number;
  durationOnHover?: number;
  /** @deprecated duration 사용 — shadcn demo 호환 */
  speed?: number;
  /** @deprecated durationOnHover 사용 — shadcn demo 호환 */
  speedOnHover?: number;
  direction?: "horizontal" | "vertical";
  reverse?: boolean;
  className?: string;
};

export function InfiniteSlider({
  children,
  gap = 16,
  duration = 25,
  durationOnHover,
  speed,
  speedOnHover,
  direction = "horizontal",
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const baseDuration = speed ?? duration;
  const hoverDuration = speedOnHover ?? durationOnHover;
  const [currentDuration, setCurrentDuration] = useState(baseDuration);
  const [ref, { width, height }] = useMeasure();
  const translation = useMotionValue(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setCurrentDuration(baseDuration);
  }, [baseDuration]);

  useEffect(() => {
    let controls: { stop: () => void } | undefined;
    const size = direction === "horizontal" ? width : height;
    if (!size) return undefined;

    const contentSize = size + gap;
    const from = reverse ? -contentSize / 2 : 0;
    const to = reverse ? 0 : -contentSize / 2;

    if (isTransitioning) {
      controls = animate(translation, [translation.get(), to], {
        ease: "linear",
        duration: currentDuration * Math.abs((translation.get() - to) / contentSize),
        onComplete: () => {
          setIsTransitioning(false);
          setKey((prevKey) => prevKey + 1);
        },
      });
    } else {
      controls = animate(translation, [from, to], {
        ease: "linear",
        duration: currentDuration,
        repeat: Infinity,
        repeatType: "loop",
        repeatDelay: 0,
        onRepeat: () => {
          translation.set(from);
        },
      });
    }

    return () => controls?.stop();
  }, [key, translation, currentDuration, width, height, gap, isTransitioning, direction, reverse]);

  const hoverProps = hoverDuration
    ? {
        onHoverStart: () => {
          setIsTransitioning(true);
          setCurrentDuration(hoverDuration);
        },
        onHoverEnd: () => {
          setIsTransitioning(true);
          setCurrentDuration(baseDuration);
        },
      }
    : {};

  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        className="flex w-max"
        style={{
          ...(direction === "horizontal" ? { x: translation } : { y: translation }),
          gap: `${gap}px`,
          flexDirection: direction === "horizontal" ? "row" : "column",
        }}
        ref={ref}
        {...hoverProps}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
}
