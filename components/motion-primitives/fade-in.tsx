import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FadeInProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Seconds before the animation starts. */
  delay?: number;
  /** Seconds the animation takes. */
  duration?: number;
}

const timing = (delay: number, duration: number) =>
  ({ "--fade-delay": `${delay}s`, "--fade-duration": `${duration}s` }) as React.CSSProperties;

/**
 * Fade and rise in on first paint — pure CSS, so the content is in the HTML,
 * visible to crawlers and counted for LCP from the first frame (the animation
 * starts at opacity 0.01, not 0). Reduced motion: no animation.
 */
export function FadeIn({ children, delay = 0, duration = 0.8, className, style, ...props }: FadeInProps) {
  return (
    <div className={cn("fade-in", className)} style={{ ...timing(delay, duration), ...style }} {...props}>
      {children}
    </div>
  );
}

/**
 * Fade and rise in as the block scrolls into view — CSS scroll-driven
 * animation (no JavaScript). Browsers without it show the content at once.
 */
export function FadeInView({ children, delay = 0, duration = 0.8, className, style, ...props }: FadeInProps) {
  return (
    <div className={cn("fade-in-view", className)} style={{ ...timing(delay, duration), ...style }} {...props}>
      {children}
    </div>
  );
}
