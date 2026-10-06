import { ACCOMMODATION_INTRO, type DiscordAudience } from "@/lib/hackathon-2026";
import { Accommodation } from "./Accommodation";
import { PartnerDiscord } from "./PartnerDiscord";
import { GuideSection, SectionHeading } from "./primitives";

const DISCORD_LEDE: Record<DiscordAudience, string> = {
  "challenge-partners":
    "Discord is the main channel between partner representatives and the Since AI team during the hackathon — and where teams ask about your challenge. Set it up before you travel.",
  partners:
    "Discord is the main channel between partner representatives and the Since AI team during the hackathon — and where builders ask about your technology in your own partner channel. Set it up before you travel.",
};

/** "Partner communication on Discord" — section id `discord`. */
export function DiscordSection({ audience, company }: { audience: DiscordAudience; company?: string }) {
  return (
    <GuideSection id="discord">
      <SectionHeading
        id="discord-title"
        eyebrow="// partner discord"
        title="Partner communication on Discord."
        lede={DISCORD_LEDE[audience]}
      />
      <PartnerDiscord audience={audience} company={company} />
    </GuideSection>
  );
}

/** "Accommodation & discounted rates" — section id `accommodation`. */
export function AccommodationSection() {
  return (
    <GuideSection id="accommodation">
      <SectionHeading
        id="accommodation-title"
        eyebrow="// stay"
        title="Accommodation & discounted rates."
        lede={ACCOMMODATION_INTRO}
      />
      <Accommodation />
    </GuideSection>
  );
}
