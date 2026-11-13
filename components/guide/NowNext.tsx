import { isEventOver } from "@/lib/hackathon-2026";
import { NowNextLive, type NowNextProps } from "./NowNextLive";

/**
 * The "now / next" card. Rendered on the server, it tells the live card
 * whether the event was already over when the page was built — so the HTML
 * says so from the first byte, also without JavaScript, instead of showing
 * "First up" for a weekend that has passed.
 */
export function NowNext(props: NowNextProps) {
  return <NowNextLive {...props} endedAtBuild={isEventOver()} />;
}
