import styles from "./PartnerMarquee.module.css";

interface Logo {
  name: string;
  src: string;
  href: string;
  loading?: "lazy" | "eager";
}

const logos: Logo[] = [
  { name: "Google for Developers", src: "/assets/sponsors/GoogleForDevelopers.png", href: "https://developers.google.com/", loading: "eager" },
  { name: "ElevenLabs",            src: "/assets/sponsors/elevenlabs.png",           href: "https://elevenlabs.io/",         loading: "eager" },
  { name: "Bayer",                 src: "/assets/sponsors/Bayer.svg",                href: "https://www.bayer.com/",         loading: "eager" },
  { name: "Sandvik",               src: "/assets/sponsors/sandvik.png",              href: "https://www.sandvik.com/" },
  { name: "Kongsberg",             src: "/assets/sponsors/kongsberg.png",            href: "https://www.kongsberg.com/" },
  { name: "Valmet",                src: "/assets/sponsors/valmet.png",               href: "https://www.valmet.com/" },
  { name: "Aiven",                 src: "/assets/sponsors/aiven.png",                href: "https://aiven.io/" },
  { name: "n8n",                   src: "/assets/sponsors/n8n.svg",                  href: "https://n8n.io/" },
  { name: "Lovable",               src: "/assets/sponsors/lovable.png",              href: "https://lovable.dev/" },
  { name: "Antler",                src: "/assets/sponsors/antler.png",               href: "https://www.antler.co/" },
  { name: "Inventure",             src: "/assets/sponsors/Inventure.png",            href: "https://www.inventure.vc/" },
  { name: "Wave Ventures",         src: "/assets/sponsors/WaveVentures.png",         href: "https://www.wave.ventures/" },
  { name: "Aalto AI",              src: "/assets/supports/aaltoai.png",              href: "https://www.aaltoai.com/" },
  { name: "Maria 01",              src: "/assets/sponsors/maria01.png",              href: "https://maria.io/" },
  { name: "AI Mad Lab",            src: "/assets/supports/aimadlab.svg",             href: "https://www.aimadlab.com/" },
  { name: "Founders House",        src: "/assets/sponsors/founders_house.svg",       href: "https://founders-house.fi/" },
];

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
 */
export function PartnerMarquee() {
  return (
    <div className={styles.marqueeContainer}>
      <span className={styles.marqueeLabel}>{"// backed by"}</span>

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
