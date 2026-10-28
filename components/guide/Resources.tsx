import Image from "next/image";
import Link from "next/link";
import {
  awardHref,
  RESOURCES_GUIDE,
  RESOURCES_PATH,
  STAND_PARTNERS,
  technologyAwardByTitle,
  type PartnerResource,
  type ToolLink,
} from "@/lib/hackathon-2026";
import { TextLink } from "./primitives";

function Logo({ logo, name }: { logo: { src: string; width: number; height: number }; name: string }) {
  return (
    <Image
      src={logo.src}
      alt={`${name} logo`}
      width={logo.width}
      height={logo.height}
      className="h-6 w-auto max-w-[9rem] object-contain object-left"
    />
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/10 py-2.5 text-sm">
      <dt className="font-mono text-[11px] uppercase tracking-widest text-white/55">{label}</dt>
      <dd className="mt-1 text-neutral-300 leading-relaxed">{children}</dd>
    </div>
  );
}

/** One partner resource: what it is, what to build, the benefit, where access details come from, help and links. */
export function ResourceCard({ resource }: { resource: PartnerResource }) {
  const r = resource;
  const award = r.award ? technologyAwardByTitle(r.award) : undefined;
  return (
    <li id={`resource-${r.id}`} data-resource={r.id} className="guide-avoid-break flex flex-col border border-white/10 p-5 md:p-6">
      <div className="flex flex-col items-start gap-3">
        <Logo logo={r.logo} name={r.name} />
        <span className="border border-white/15 px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-neutral-400">
          {r.relationship}
        </span>
      </div>
      <h3 className="mt-4 text-xl font-bold tracking-tight text-white">{r.name}</h3>
      <p className="mt-2 text-sm text-neutral-300 leading-relaxed">{r.description}</p>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label={`What you can build with ${r.name}`}>
        {r.buildIdeas.map((idea) => (
          <li key={idea} className="border border-white/15 px-2 py-0.5 text-xs text-neutral-300">
            {idea}
          </li>
        ))}
      </ul>
      <dl className="mt-4">
        {r.benefit && <Row label="Participant benefit">{r.benefit}</Row>}
        <Row label="Access">{r.access}</Row>
        <Row label="Help">{r.help}</Row>
        {award && (
          <Row label="Optional award">
            <a
              href={awardHref(award.id)}
              className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {award.title}
            </a>{" "}
            <span data-award-short>· {award.prizeShort}</span>
          </Row>
        )}
      </dl>
      <div className="guide-no-print mt-auto flex flex-wrap gap-x-5 pt-3">
        <TextLink href={r.getStarted.href} className="font-semibold text-white">
          {r.getStarted.label}
        </TextLink>
        {r.partnerGuide && <TextLink href={r.partnerGuide.href}>{r.partnerGuide.label}</TextLink>}
        {r.docs && <TextLink href={r.docs.href}>{r.docs.label}</TextLink>}
      </div>
    </li>
  );
}

/** A popular developer tool: name, one line and its documentation. */
export function ToolItem({ tool }: { tool: ToolLink }) {
  return (
    <li className="flex flex-col border-b border-r border-white/10 p-4" data-tool={tool.name}>
      <TextLink href={tool.href} className="min-h-0 font-semibold text-white">
        {tool.name}
      </TextLink>
      <p className="mt-1 text-sm text-neutral-400 leading-relaxed">{tool.text}</p>
    </li>
  );
}

/** The partner corner at BioCity, from the stand registry — each partner's confirmed role only. */
export function OnSitePartners() {
  return (
    <ul className="grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3">
      {STAND_PARTNERS.map((p) => (
        <li key={p.id} className="flex flex-col gap-3 border-b border-r border-white/10 p-5" data-stand-partner={p.id}>
          {p.logo && <Logo logo={p.logo} name={p.name} />}
          <div>
            <p className="font-semibold text-white">{p.name}</p>
            <p className="text-sm text-neutral-400">{p.role}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Hub card pointing builders to the resources page. */
export function ResourcesHubLink() {
  return (
    <Link
      href={RESOURCES_PATH}
      className="group flex h-full items-center justify-between gap-6 border border-white/10 p-6 transition-colors hover:border-white/30 hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:p-8"
    >
      <span>
        <span className="block font-mono text-xs uppercase tracking-widest text-white/55">Builders · partners & tools</span>
        <span className="mt-3 block text-2xl md:text-3xl font-bold tracking-tight text-white">{RESOURCES_GUIDE.name}</span>
        <span className="mt-3 block max-w-2xl text-sm text-neutral-400 leading-relaxed">
          Computing, AI models, app builders, FIWARE and developer tools — quickstarts, participant benefits, the
          optional MLH, Red Hat and FIWARE awards and where to get help.
        </span>
      </span>
      <span aria-hidden="true" className="text-2xl text-white/55 transition-colors group-hover:text-white">
        →
      </span>
    </Link>
  );
}
