import Image from "next/image";
import Link from "next/link";
import {
  EVENT_RESOURCES,
  HELP_LABEL,
  RESOURCES_GUIDE,
  RESOURCES_PATH,
  STAND_PARTNERS,
  type AccessState,
  type BuilderResource,
  type ToolLink,
} from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";
import { TextLink } from "./primitives";

const ACCENT: Record<AccessState, boolean> = { closing: true, scheduled: true, ready: true, pending: false };

function AccessTag({ state, label }: { state: AccessState; label: string }) {
  const accent = ACCENT[state];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest",
        accent ? "border-(--color-event)/50 text-(--color-event)" : "border-dashed border-white/25 text-neutral-400",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("inline-block h-1.5 w-1.5 rounded-full", accent ? "bg-(--color-event)" : "bg-neutral-500")}
      />
      {label}
    </span>
  );
}

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

/** One verified event resource: what it is, access, instructions, help and the original-source links. */
export function ResourceCard({ resource }: { resource: BuilderResource }) {
  const r = resource;
  return (
    <li id={`resource-${r.id}`} data-resource={r.id} className="guide-avoid-break flex flex-col border border-white/10 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Logo logo={r.logo} name={r.name} />
        <AccessTag state={r.access.state} label={r.access.label} />
      </div>
      <h3 className="mt-4 text-xl font-bold tracking-tight text-white">{r.name}</h3>
      <p className="mt-2 text-sm text-neutral-300 leading-relaxed">{r.what}</p>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Good for, with ${r.name}`}>
        {r.useCases.map((u) => (
          <li key={u} className="border border-white/15 px-2 py-0.5 text-xs text-neutral-300">
            {u}
          </li>
        ))}
      </ul>
      <dl className="mt-4">
        <Row label="Event access">{r.access.text}</Row>
        <Row label="Your instructions">{r.instructions}</Row>
        <Row label={`Help · ${HELP_LABEL[r.help.kind]}`}>{r.help.text}</Row>
      </dl>
      <div className="guide-no-print mt-auto flex flex-wrap gap-x-5 pt-3">
        <TextLink href={r.quickstart.href} className="font-semibold text-white">
          {r.quickstart.label}
        </TextLink>
        <TextLink href={r.docs.href}>{r.docs.label}</TextLink>
        {r.more?.map((l) => (
          <TextLink key={l.href} href={l.href}>
            {l.label}
          </TextLink>
        ))}
      </div>
    </li>
  );
}

/** A tool or partner with public documentation only. */
export function ToolItem({ tool }: { tool: ToolLink }) {
  return (
    <li className="guide-avoid-break flex flex-col border border-white/10 p-5" data-tool={tool.name}>
      {tool.logo && <Logo logo={tool.logo} name={tool.name} />}
      <h3 className={cn("text-lg font-bold tracking-tight text-white", tool.logo && "mt-4")}>{tool.name}</h3>
      <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{tool.text}</p>
      <TextLink href={tool.docs.href} className="mt-auto self-start pt-2">
        {tool.docs.label}
      </TextLink>
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
        <span className="block font-mono text-xs uppercase tracking-widest text-white/55">Builders · tools & credits</span>
        <span className="mt-3 block text-2xl md:text-3xl font-bold tracking-tight text-white">{RESOURCES_GUIDE.name}</span>
        <span className="mt-3 block max-w-2xl text-sm text-neutral-400 leading-relaxed">
          {EVENT_RESOURCES.map((r) => r.name).join(", ")}: event access, dates, quickstarts and help.
        </span>
      </span>
      <span aria-hidden="true" className="text-2xl text-white/55 transition-colors group-hover:text-white">
        →
      </span>
    </Link>
  );
}
