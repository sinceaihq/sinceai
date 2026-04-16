import styles from "./PartnerMarquee.module.css";

interface Logo {
  name: string;
  src: string;
  href: string;
  noFilter?: boolean;
  loading?: "lazy" | "eager";
}

const logos: Logo[] = [
  { name: "Google for Developers", src: "/assets/sponsors/GoogleForDevelopers.png", href: "https://developers.google.com/" },
  { name: "ElevenLabs",            src: "/assets/sponsors/elevenlabs.png",           href: "https://elevenlabs.io/" },
  { name: "Bayer",                 src: "/assets/sponsors/Bayer.svg",                href: "https://www.bayer.com/" },
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

function LogoItem({
  name,
  src,
  href,
  noFilter,
  loading = "lazy",
  ...rest
}: Logo & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
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
        width={140}
        height={32}
        style={noFilter ? { filter: "none", transition: "none" } : undefined}
      />
    </a>
  );
}

export function PartnerMarquee() {
  return (
    <div className={styles.marqueeContainer}>
      <span className={styles.marqueeLabel}>// backed by</span>

      <div className={styles.marqueeTrackWrapper}>
        <div className={styles.marqueeTrack}>
          {/* First copy */}
          {logos.map((logo, i) => (
            <LogoItem key={`a-${i}`} {...logo} />
          ))}
          {/* Second copy — seamless loop duplicate, lazy is fine as it starts off-screen */}
          {logos.map((logo, i) => (
            <LogoItem key={`b-${i}`} {...logo} aria-hidden="true" tabIndex={-1} />
          ))}
        </div>
      </div>
    </div>
  );
}
