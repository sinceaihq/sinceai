import styles from "./PartnerMarquee.module.css";
import { PARTNERS, tier1Partners, type Partner } from "@/lib/partners";

interface Logo {
  name: string;
  src: string;
  href: string;
  loading?: "lazy" | "eager";
}

/** Capital partners that must appear in the homepage marquee in addition to all Strategic Partners. */
const extraMarqueeNames = [
  "Antler",
  "Tesi",
  "Icebreaker VC",
  "Inventure",
  "Wave Ventures",
  "Redstone VC",
  "MAKI VC",
  "Inovexus",
  "FiBAN",
  "FOV Ventures",
  "Aalto AI",
  "Maria 01",
  "AI Mad Lab",
  "Founders House",
] as const;

function byName(name: string): Partner {
  const partner = PARTNERS.find((p) => p.name === name);
  if (!partner) throw new Error(`PartnerMarquee: unknown partner "${name}"`);
  return partner;
}

const logos: Logo[] = [];
const seen = new Set<string>();
for (const partner of [...tier1Partners, ...extraMarqueeNames.map(byName)]) {
  if (seen.has(partner.name)) continue;
  seen.add(partner.name);
  logos.push({
    name: partner.name,
    src: partner.logo,
    href: partner.url,
    loading: logos.length < 3 ? "eager" : "lazy",
  });
}

function LogoItem({ name, src, href, loading = "lazy", ...rest }: Logo & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.logoItem}
      aria-label={`${name} — Since AI partner`}
      {...rest}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${name} logo — Since AI partner`}
        loading={loading}
        width={120}
        height={40}
      />
    </a>
  );
}

/**
 * Partner marquee — Apple/Stripe-grade infinite logo scroll.
 *
 * Architecture: pure CSS @keyframes animation on the compositor thread.
 * No JS runtime involvement. Immune to main-thread stalls from Lenis
 * smooth-scroll, React renders, or scroll/hover event handlers.
 *
 * Seamless loop math: two identical logoSets are rendered side-by-side.
 * Each logoSet has `padding-right === gap`, making the trailing space after
 * set A match the inter-logo spacing. translateX(-50%) moves the track by
 * exactly one set's width, so set B's first logo lands precisely where set A's
 * first logo was — pixel-perfect sub-pixel seam.
 *
 * GPU layer isolation (see .module.css): `contain: paint` + `isolation: isolate`
 * on the container, `translateZ(0)` + `will-change: transform` on the track,
 * ensure the marquee runs on its own GPU compositor layer unaffected by the
 * Lenis parent transform on <html>.
 *
 * `colorful` opts out of the default grayscale/dimmed treatment and renders
 * logos at full colour and a larger size — used on /hackathon, the landing
 * page for paid traffic. The homepage hero keeps the default subtle look.
 *
 * Roster: every Strategic Partner (tier 1) plus selected capital partners.
 */
interface PartnerMarqueeProps {
  colorful?: boolean;
  label?: string;
}

export function PartnerMarquee({
  colorful = false,
  label = "// backed by",
}: PartnerMarqueeProps = {}) {
  return (
    <div
      className={`${styles.marqueeContainer}${colorful ? ` ${styles.colorful}` : ""}`}
    >
      <span className={styles.marqueeLabel}>{label}</span>

      <div className={styles.marqueeTrackWrapper}>
        <div className={styles.marqueeTrack}>
          {/* Set A — accessible, read by screen readers */}
          <div className={styles.logoSet}>
            {logos.map((logo) => (
              <LogoItem key={`a-${logo.name}`} {...logo} />
            ))}
          </div>
          {/* Set B — visual duplicate for seamless loop, hidden from AT */}
          <div className={styles.logoSet} aria-hidden="true">
            {logos.map((logo) => (
              <LogoItem key={`b-${logo.name}`} {...logo} tabIndex={-1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
