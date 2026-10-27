import Link from "next/link";
import {
  AI_POLICY,
  AWARDS_HREF,
  BUILDING_ANCHOR,
  BUILDING_FAQ,
  BUILDING_HREF,
  SUBMISSION,
  RESOURCES_GUIDE,
  RESOURCES_PATH,
  SUBMIT_ANCHOR,
  type SubmissionField,
} from "@/lib/hackathon-2026";
import { Details } from "./Details";
import { Arrow, ghostButtonClass, GuideSection, SectionHeading } from "./primitives";

const inlineLink =
  "text-white underline decoration-white/30 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

function Dash() {
  return (
    <span aria-hidden="true" className="text-white/55">
      —
    </span>
  );
}

function FieldList({ fields }: { fields: readonly SubmissionField[] }) {
  return (
    <ul className="mt-3">
      {fields.map((f) => (
        <li key={f.name} className="border-t border-white/10 py-2.5 text-sm">
          <span className="font-semibold text-white">{f.name}</span>
          {f.note && <span className="block text-neutral-400 leading-relaxed">{f.note}</span>}
          {f.link && (
            <Link href={f.link.href} className={inlineLink}>
              {f.link.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

/** AI tools policy: what is encouraged, what the team stays responsible for. */
function AiPolicy() {
  return (
    <div className="guide-avoid-break grid grid-cols-1 border border-white/10 md:grid-cols-2" data-ai-policy>
      <div className="p-5 md:p-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-(--color-event)">AI tools · permitted and encouraged</p>
        <h3 className="mt-3 text-2xl font-bold tracking-tight text-white">{AI_POLICY.headline}</h3>
        <p className="mt-3 text-sm text-neutral-300 leading-relaxed">{AI_POLICY.message}</p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Examples of AI tools you can use">
          {AI_POLICY.tools.map((tool) => (
            <li
              key={tool}
              className="border border-white/15 px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-neutral-300"
            >
              {tool}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-neutral-400 leading-relaxed">{AI_POLICY.toolsNote}</p>
        <p className="mt-3 text-sm text-neutral-400 leading-relaxed">{AI_POLICY.notRequired}</p>
      </div>
      <div className="border-t border-white/10 p-5 md:border-l md:border-t-0 md:p-6">
        <h3 className="text-lg font-bold tracking-tight text-white">Your team stays responsible</h3>
        <ul className="mt-3 space-y-2 text-sm text-neutral-300 leading-relaxed">
          {AI_POLICY.responsibilities.map((t) => (
            <li key={t} className="flex gap-2">
              <Dash />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** How to submit: platform and deadline, fields, files, steps. */
function HowToSubmit() {
  return (
    <div id={SUBMIT_ANCHOR} className="mt-12 scroll-mt-32">
      <h3 id={`${SUBMIT_ANCHOR}-title`} className="text-2xl md:text-3xl font-bold tracking-tight text-white">
        How to submit your project
      </h3>

      <div className="guide-avoid-break mt-6 grid grid-cols-1 gap-4 border border-(--color-event)/50 bg-(--color-event)/[0.05] p-5 md:grid-cols-2 md:gap-10 md:p-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-white/55">Official platform</p>
          <p className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-white">{SUBMISSION.platform}</p>
          <p className="mt-2 text-sm text-neutral-300 leading-relaxed">{SUBMISSION.notDevpost}</p>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-white/55">Deadline · fixed</p>
          <p className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-white">
            <time dateTime={SUBMISSION.deadline}>{SUBMISSION.deadlineLabel}</time>
          </p>
          <p className="mt-2 text-sm text-neutral-300 leading-relaxed">{SUBMISSION.whereToSubmit}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="guide-avoid-break border border-white/10 p-5">
          <h4 className="text-lg font-bold tracking-tight text-white">Required</h4>
          <FieldList fields={SUBMISSION.required} />
        </div>
        <div className="guide-avoid-break border border-white/10 p-5">
          <h4 className="text-lg font-bold tracking-tight text-white">Optional</h4>
          <FieldList fields={SUBMISSION.optional} />
        </div>
        <div className="guide-avoid-break border border-white/10 p-5">
          <h4 className="text-lg font-bold tracking-tight text-white">Files</h4>
          <dl className="mt-3">
            {SUBMISSION.files.map((f) => (
              <div key={f.kind} className="border-t border-white/10 py-2.5 text-sm" data-file-kind={f.kind}>
                <dt className="font-semibold text-white">{f.kind}</dt>
                <dd className="text-neutral-300">{f.formats.join(", ")}</dd>
                {"note" in f && f.note && <dd className="text-neutral-400 leading-relaxed">{f.note}</dd>}
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-neutral-400 leading-relaxed">{SUBMISSION.filesNote}</p>
        </div>
      </div>

      <ol className="mt-4 grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {SUBMISSION.steps.map((step, i) => (
          <li key={step.title} className="guide-avoid-break border-b border-r border-white/10 p-5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-(--color-event)">Step {i + 1}</p>
            <h4 className="mt-3 text-lg font-bold tracking-tight text-white">{step.title}</h4>
            <p className="mt-3 text-sm text-neutral-400 leading-relaxed">{step.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-neutral-400 leading-relaxed" data-submit-awards>
        <span className="font-semibold text-white">Optional awards:</span> tick MLH categories on the same submission and
        enter Red Hat or FIWARE in sinceai.app —{" "}
        <Link href={AWARDS_HREF} className={inlineLink}>
          how to enter the optional awards
        </Link>
        .
      </p>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <h4 className="text-lg font-bold tracking-tight text-white">What makes a strong entry</h4>
          <ul className="mt-3 space-y-2 text-sm text-neutral-300 leading-relaxed">
            {SUBMISSION.strongEntry.map((t) => (
              <li key={t} className="flex gap-2">
                <Dash />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <a
          href={SUBMISSION.dashboardHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`guide-no-print ${ghostButtonClass} w-full md:w-auto`}
        >
          Open your sinceai.app dashboard
          <Arrow external />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </div>
  );
}

/** Builder guide section — id `building`: AI tools policy, how to submit, and the building FAQ. */
export function BuildingSection() {
  return (
    <GuideSection id={BUILDING_ANCHOR}>
      <SectionHeading
        id={`${BUILDING_ANCHOR}-title`}
        eyebrow="// building & submissions"
        title="Build with AI. Submit in sinceai.app."
        lede={`What you can use, what you stay responsible for, and exactly how your team submits by ${SUBMISSION.deadlineLabel}.`}
      />
      <AiPolicy />
      <p className="mt-4 text-sm text-neutral-400 leading-relaxed">
        <span className="font-semibold text-white">Partner tools and benefits:</span> computing, AI models, app
        builders and developer tools from our technology partners, with quickstarts and where to get help, in{" "}
        <Link href={RESOURCES_PATH} className={inlineLink}>
          {RESOURCES_GUIDE.name}
        </Link>
        .
      </p>
      <HowToSubmit />
      <div className="mt-12">
        <h3 id="building-faq-title" className="mb-4 text-2xl font-bold tracking-tight text-white">
          Building & submitting: questions
        </h3>
        <Details items={BUILDING_FAQ} />
      </div>
    </GuideSection>
  );
}

/** Hub card pointing builders to the section. */
export function BuildingHubLink() {
  return (
    <Link
      href={BUILDING_HREF}
      className="group flex h-full items-center justify-between gap-6 border border-white/10 p-6 transition-colors hover:border-white/30 hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:p-8"
    >
      <span>
        <span className="block font-mono text-xs uppercase tracking-widest text-white/55">
          Builders · before {SUBMISSION.deadlineLabel}
        </span>
        <span className="mt-3 block text-2xl md:text-3xl font-bold tracking-tight text-white">
          Build with AI. Submit in sinceai.app.
        </span>
        <span className="mt-3 block max-w-2xl text-sm text-neutral-400 leading-relaxed">
          The AI tools policy, required submission fields, supported file formats and the builder FAQ — sinceai.app
          is the official platform, not Devpost.
        </span>
      </span>
      <span aria-hidden="true" className="text-2xl text-white/55 transition-colors group-hover:text-white">
        →
      </span>
    </Link>
  );
}
