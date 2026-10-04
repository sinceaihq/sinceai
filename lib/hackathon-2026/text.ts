/**
 * Display helper for narrow screens: a " · " separator stays at the end of a
 * line (never starts the next one), and "floor 1", "Stand 2" or "counter 4"
 * never split across lines.
 */
export function keepDots(text: string): string {
  return text.replace(/ · /g, "\u00a0· ").replace(/\b(floor|Floor|Stand|counter|Counter) (\d+)/g, "$1\u00a0$2");
}
