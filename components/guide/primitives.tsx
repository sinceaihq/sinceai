import type { ReactNode } from "react";
import type { Place, Publishability } from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";

/** `// micro-label` in the site's grammar. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-xs font-mono uppercase tracking-widest text-neutral-500",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  lede,
  className,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 md:mb-10", className)}>
      {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
      <h2 id={id} className="text-3xl md:text-4xl font-bold tracking-tight text-white">
        {title}
      </h2>
      {lede && (
        <p className="mt-4 max-w-2xl text-sm text-neutral-400 leading-relaxed">{lede}</p>
      )}
    </header>
  );
}

/** Page section with consistent spacing and an anchor. */
export function GuideSection({
  id,
  children,
  className,
  labelledBy,
}: {
  id: string;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy ?? `${id}-title`}
      className={cn("px-6 py-16 md:py-24 border-t border-white/10", className)}
    >
      <div className="mx-auto max-w-5xl">{children}</div>
    </section>
  );
}

const STATUS_COPY: Partial<Record<Publishability, string>> = {
  pending: "To be confirmed",
  working: "Current plan",
};

/** Small status marker — only for states that help the reader. */
export function StatusTag({
  status,
  className,
  label,
}: {
  status: Publishability;
  className?: string;
  label?: string;
}) {
  const text = label ?? STATUS_COPY[status];
  if (!text) return null;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 border px-2 py-0.5 text-[11px] font-mono uppercase tracking-widest",
        status === "pending"
          ? "border-(--color-event)/50 text-(--color-event)"
          : "border-white/15 text-neutral-400",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          status === "pending" ? "bg-(--color-event)" : "bg-neutral-500",
        )}
      />
      {text}
    </span>
  );
}

const PLACE_LABEL: Record<Place, string> = {
  educity: "EduCity",
  biocity: "BioCity",
  joki: "Joki",
  "biocity-joki": "BioCity + Joki",
  app: "sinceai.app",
};

export function placeLabel(place: Place): string {
  return PLACE_LABEL[place];
}

export function PlaceChip({ place, className }: { place: Place; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border border-white/15 px-2 py-0.5 text-[11px] font-mono uppercase tracking-widest text-neutral-300 whitespace-nowrap",
        place === "app" && "border-(--color-event)/40 text-(--color-event)",
        className,
      )}
    >
      {PLACE_LABEL[place]}
    </span>
  );
}

/** Arrow used in text links, hidden from assistive tech. */
export function Arrow({ external = false }: { external?: boolean }) {
  return (
    <span aria-hidden="true" className="ml-1">
      {external ? "↗" : "→"}
    </span>
  );
}

/** Text link in the site grammar. */
export function TextLink({
  href,
  children,
  external,
  className,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
  className?: string;
}) {
  const isExternal = external ?? /^(https?:|mailto:)/.test(href);
  return (
    <a
      href={href}
      {...(isExternal && href.startsWith("http")
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className={cn(
        "inline-flex items-center text-sm text-neutral-300 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        className,
      )}
    >
      {children}
      {isExternal && href.startsWith("http") && (
        <>
          <Arrow external />
          <span className="sr-only"> (opens in a new tab)</span>
        </>
      )}
    </a>
  );
}

export const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center bg-white text-black rounded-none px-6 py-3 text-sm font-semibold hover:bg-neutral-100 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export const ghostButtonClass =
  "inline-flex min-h-11 items-center justify-center border border-white/20 text-white rounded-none px-6 py-3 text-sm font-semibold hover:border-white transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
