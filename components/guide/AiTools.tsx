import Image from "next/image";
import type { ReactNode } from "react";
import {
  ACCESS_LABEL,
  AI_TOOLS,
  awardHref,
  BUILDER_PERKS,
  FEATURED_TOOLS,
  formatTime,
  logoFor,
  MLH_ATTRIBUTION,
  mlhAwardAnchor,
  mlhAwardFor,
  partnerFor,
  technologyAwardByTitle,
  toolAnchor,
  workshopFor,
  WORKSHOP_PLACE,
  type AccessKind,
  type AiTool,
} from "@/lib/hackathon-2026";
import { TextLink } from "./primitives";

const external = (href: string) => /^https?:/.test(href);
const eyebrow = "font-mono text-[11px] uppercase tracking-widest";

function ToolLogoView({ tool, size = "md" }: { tool: AiTool; size?: "md" | "lg" }) {
  const logo = logoFor(tool);
  const box = size === "lg" ? "h-10" : "h-7";
  if (!logo) {
    // No published logo: a neutral monogram rather than a made-up mark.
    return (
      <span
        aria-hidden="true"
        className={`${box} inline-flex aspect-square items-center justify-center border border-white/20 font-mono text-sm font-bold text-white`}
      >
        {tool.name.slice(0, 1)}
      </span>
    );
  }
  return logo.mark ? (
    <Image src={logo.src} alt="" width={40} height={40} className={`${box} w-auto`} />
  ) : (
    <Image
      src={logo.src}
      alt=""
      width={logo.width}
      height={logo.height}
      className={`${size === "lg" ? "h-7" : "h-5"} w-auto max-w-[9rem] object-contain object-left`}
    />
  );
}

/** A square mark sits beside the name; a wordmark (which already spells it) sits above it. */
function ToolHeading({ tool, size = "md" }: { tool: AiTool; size?: "md" | "lg" }) {
  const heading = (
    <h3 className={`font-bold tracking-tight text-white ${size === "lg" ? "text-lg md:text-xl" : "text-base md:text-lg"}`}>
      {tool.name}
    </h3>
  );
  return logoFor(tool)?.mark || !logoFor(tool) ? (
    <div className="flex items-center gap-3">
      <ToolLogoView tool={tool} size={size} />
      {heading}
    </div>
  ) : (
    <div className="flex flex-col items-start gap-2.5">
      <ToolLogoView tool={tool} size={size} />
      {heading}
    </div>
  );
}

const BADGE: Record<AccessKind, string> = {
  "free-plan": "border-emerald-400/40 text-emerald-300",
  student: "border-sky-400/40 text-sky-300",
  event: "border-(--color-event) text-(--color-event)",
  mlh: "border-white/25 text-neutral-200",
  limited: "border-amber-400/40 text-amber-300",
  trial: "border-white/25 text-neutral-200",
  preregistered: "border-amber-400/40 text-amber-300",
  "open-source": "border-emerald-400/40 text-emerald-300",
  paid: "border-white/20 text-neutral-400",
};

/** What you get, at a glance: a short label of the kind of access, then the offer itself. */
function AccessList({ tool }: { tool: AiTool }) {
  return (
    <ul className="mt-3 space-y-1.5" aria-label={`How to get ${tool.name}`} data-tool-access>
      {tool.access.map((a) => (
        <li key={a.text} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-neutral-200">
          <span className={`border px-1.5 py-px font-mono text-[10px] uppercase tracking-widest ${BADGE[a.kind]}`}>
            {ACCESS_LABEL[a.kind]}
          </span>
          <span>{a.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-white/10 py-2.5 text-sm">
      <dt className={`${eyebrow} text-white/55`}>{label}</dt>
      <dd className="mt-1 text-neutral-300 leading-relaxed">{children}</dd>
    </div>
  );
}

/** Everything else about a tool, on demand: the benefit's exact terms, how to claim it, help and awards. */
function ToolDetails({ tool }: { tool: AiTool }) {
  const partner = partnerFor(tool);
  const mlh = mlhAwardFor(tool);
  const award = partner?.award ? technologyAwardByTitle(partner.award) : undefined;
  const workshop = workshopFor(tool);
  return (
    <details className="guide-details group mt-3 border-t border-white/10">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-white">
        What you get &amp; how to start
        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" className="guide-chevron shrink-0 transition-transform">
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </summary>
      <dl className="pb-2">
        {partner && (
          <>
            {partner.benefit && <Detail label="Since AI participant benefit">{partner.benefit}</Detail>}
            <Detail label="How to get it">{partner.access}</Detail>
          </>
        )}
        {mlh && (
          <Detail label="Free to use">
            <ul className="space-y-1">
              {mlh.free.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            {mlh.note && <p className="mt-1.5 text-neutral-400">{mlh.note}</p>}
            <ol className="mt-2 list-decimal space-y-1 pl-5 marker:text-white/55">
              {mlh.steps.map((step) => (
                <li key={typeof step === "string" ? step : step.href}>
                  {typeof step === "string" ? step : <TextLink href={step.href} className="min-h-0">{step.label}</TextLink>}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-white/55" data-mlh-attribution>
              {MLH_ATTRIBUTION}
            </p>
          </Detail>
        )}
        {tool.more?.map((m) => (
          <Detail key={m} label="Good to know">
            {m}
          </Detail>
        ))}
        {workshop && (
          <Detail label="Optional workshop">
            {workshop.title}, Fri {formatTime(workshop.start)}–{formatTime(workshop.end)}, BioCity · {WORKSHOP_PLACE}. You
            don&apos;t need to attend to use it.
          </Detail>
        )}
        {partner && <Detail label="Help">{partner.help}</Detail>}
        {(award || mlh) && (
          <Detail label="Optional award">
            {award && (
              <a
                href={awardHref(award.id)}
                className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
              >
                {award.title}
              </a>
            )}
            {award && <span data-award-short> · {award.prizeShort}</span>}
            {mlh && (
              <a
                href={`#${mlhAwardAnchor(mlh.id)}`}
                className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
              >
                {mlh.title}
              </a>
            )}
          </Detail>
        )}
      </dl>
    </details>
  );
}

function Cta({ tool, primary }: { tool: AiTool; primary?: boolean }) {
  const ext = external(tool.cta.href);
  return (
    <a
      href={tool.cta.href}
      {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={
        primary
          ? "inline-flex min-h-11 w-full items-center justify-center bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          : "inline-flex min-h-11 items-center border border-white/25 px-4 text-sm font-semibold text-white transition-colors hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      }
      data-tool-cta
    >
      {tool.cta.label}
      {ext && (
        <>
          <span aria-hidden="true" className="ml-1.5">
            ↗
          </span>
          <span className="sr-only"> (opens in a new tab)</span>
        </>
      )}
    </a>
  );
}

/** One of the six at the top: big logo, one sentence, what you get, one button. */
export function FeaturedToolCard({ tool }: { tool: AiTool }) {
  const workshop = workshopFor(tool);
  return (
    <li
      id={toolAnchor(tool.id)}
      data-tool={tool.id}
      data-featured-tool={tool.id}
      {...(tool.partnerId ? { "data-resource": tool.partnerId } : {})}
      className="guide-target flex flex-col border-b border-r border-white/10 p-5 md:p-6"
    >
      {tool.partnerId && <span id={`resource-${tool.partnerId}`} className="block scroll-mt-32" />}
      <ToolHeading tool={tool} size="lg" />
      <p className="mt-3 text-sm text-neutral-300 leading-relaxed">{tool.summary}</p>
      <AccessList tool={tool} />
      {workshop && (
        <p className="mt-3 text-xs text-neutral-400">
          Optional workshop: Fri {formatTime(workshop.start)}, BioCity.
        </p>
      )}
      <div className="mt-auto pt-5">
        <Cta tool={tool} primary />
        {tool.setup && (
          <p className="mt-2 text-center text-sm">
            <TextLink href={tool.setup.href} className="min-h-0 text-neutral-300">
              {tool.setup.label}
            </TextLink>
          </p>
        )}
        <ToolDetails tool={tool} />
      </div>
    </li>
  );
}

/** One tool in a category: logo, name, one sentence, what you get, a button and the details on demand. */
export function ToolCard({ tool }: { tool: AiTool }) {
  return (
    <li
      id={toolAnchor(tool.id)}
      data-tool={tool.id}
      {...(tool.partnerId ? { "data-resource": tool.partnerId } : {})}
      className="guide-target guide-avoid-break flex flex-col border-b border-r border-white/10 p-5"
    >
      {/* The partner card's earlier anchor (#resource-<id>) still lands on it. */}
      {tool.partnerId && <span id={`resource-${tool.partnerId}`} className="block scroll-mt-32" />}
      <ToolHeading tool={tool} />
      <p className="mt-2 text-sm text-neutral-300 leading-relaxed">{tool.summary}</p>
      <AccessList tool={tool} />
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
        <Cta tool={tool} />
        {tool.setup && (
          <TextLink href={tool.setup.href} className="min-h-0 text-sm text-neutral-300">
            {tool.setup.label}
          </TextLink>
        )}
      </div>
      <ToolDetails tool={tool} />
    </li>
  );
}

/** A row of the six featured tools, each a link to its card — for the hub and the Builder Guide. */
export function FeaturedToolStrip({ resourcesPath }: { resourcesPath: string }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Featured AI tools" data-featured-strip>
      {FEATURED_TOOLS.map((tool) => (
        <li key={tool.id}>
          <a
            href={`${resourcesPath}#${toolAnchor(tool.id)}`}
            className="inline-flex min-h-11 items-center gap-2 border border-white/15 px-3 text-sm font-semibold text-white transition-colors hover:border-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {logoFor(tool)?.mark && (
              <Image src={logoFor(tool)!.src} alt="" width={20} height={20} className="h-5 w-5" />
            )}
            {tool.name}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * The free plans and credits, at a glance and biggest first — each tile a link
 * to its tool card for the terms and how to claim. Used at the top of AI Tools
 * & Resources and on the hub.
 */
export function BuilderPerks({ resourcesPath = "" }: { resourcesPath?: string }) {
  return (
    <ul
      className="grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Free plans and credits for Since AI builders"
      data-builder-perks
    >
      {BUILDER_PERKS.map((perk) => {
        const tool = AI_TOOLS.find((t) => t.id === perk.toolId)!;
        const logo = logoFor(tool);
        return (
          <li key={perk.toolId} className="border-b border-r border-white/10" data-perk={perk.toolId}>
            <a
              href={`${resourcesPath}#${toolAnchor(tool.id)}`}
              className="group flex h-full flex-col p-4 transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white md:p-5"
            >
              <span className="flex items-center justify-between gap-3">
                <span className={`border px-1.5 py-px font-mono text-[10px] uppercase tracking-widest ${BADGE[perk.kind]}`}>
                  {ACCESS_LABEL[perk.kind]}
                </span>
                {logo?.mark && <Image src={logo.src} alt="" width={20} height={20} className="h-5 w-5 opacity-80" />}
              </span>
              <span className="mt-3 block text-xl font-bold tracking-tight text-white md:text-2xl">{perk.value}</span>
              <span className="mt-1 block text-sm text-neutral-200">{perk.what}</span>
              <span className="mt-2 block text-xs text-neutral-400">{perk.who}</span>
              <span className="mt-auto pt-3 text-xs font-semibold text-white/70 group-hover:text-white">
                How to claim <span aria-hidden="true">→</span>
                <span className="sr-only"> — {tool.name}</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
