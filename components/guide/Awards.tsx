import {
  AWARDS_AT_A_GLANCE,
  awardAnchor,
  CONFIDENTIAL_CHALLENGE,
  CONFIDENTIAL_NOTE,
  CONFIDENTIAL_RULES,
  FIWARE_ANTARES_DEMO,
  FIWARE_AWARD,
  FIWARE_EXAMPLES,
  FIWARE_HELP,
  FIWARE_NO_SETUP,
  FIWARE_QUICK_START,
  FIWARE_RESOURCE_GROUPS,
  HOW_TO_ENTER,
  HOW_TO_ENTER_LINK,
  MLH_AWARDS,
  MLH_AWARDS_ANCHOR,
  MLH_AWARDS_NOTE,
  MLH_PRIZE_PAGE,
  MLH_QUESTIONS,
  RED_HAT_AWARD,
  type TechnologyAward,
} from "@/lib/hackathon-2026";
import { TextLink } from "./primitives";

const eyebrow = "font-mono text-[11px] uppercase tracking-widest";

const GLANCE_COLUMNS = [
  { key: "win", label: "What you win" },
  { key: "enter", label: "How to enter" },
  { key: "decided", label: "Decided and announced" },
  { key: "ask", label: "Where to ask" },
] as const;

/**
 * MLH, Red Hat and FIWARE side by side. A grid of rows on wide screens; on a
 * phone each award stacks as a card with its own labels, so nothing scrolls sideways.
 */
export function AwardsAtAGlance() {
  return (
    <div data-awards-glance>
      <div
        aria-hidden="true"
        className="hidden border-l border-t border-white/10 md:grid md:grid-cols-[minmax(0,1.1fr)_repeat(4,minmax(0,1fr))]"
      >
        <p className={`${eyebrow} border-b border-r border-white/10 px-4 py-2 text-white/55`}>Award</p>
        {GLANCE_COLUMNS.map((c) => (
          <p key={c.key} className={`${eyebrow} border-b border-r border-white/10 px-4 py-2 text-white/55`}>
            {c.label}
          </p>
        ))}
      </div>
      <ul className="grid grid-cols-1 border-l border-t border-white/10 md:border-t-0">
        {AWARDS_AT_A_GLANCE.map((row) => (
          <li
            key={row.id}
            data-awards-glance-row={row.id}
            className="guide-avoid-break grid grid-cols-1 border-b border-r border-white/10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,4fr)] md:border-r-0"
          >
            <p className="p-4 pb-2 md:border-r md:border-white/10 md:pb-4">
              <a
                href={row.href}
                className="font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {row.name}
              </a>
            </p>
            <dl className="grid grid-cols-1 pb-2.5 md:grid-cols-4 md:pb-0">
              {GLANCE_COLUMNS.map((c) => (
                <div key={c.key} className="px-4 py-1.5 md:border-r md:border-white/10 md:py-4">
                  <dt className={`${eyebrow} text-white/55 md:sr-only`}>{c.label}</dt>
                  <dd className="mt-0.5 text-sm text-neutral-300 leading-relaxed md:mt-0">{row[c.key]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "Questions?" — where to ask about an award, only support already published in the guide. */
function Questions({ text, link }: { text: string; link?: { label: string; href: string } }) {
  return (
    <p className="border-t border-white/10 py-3 text-sm text-neutral-300 leading-relaxed" data-award-questions>
      <span className="font-semibold text-white">Questions?</span> {text}
      {link && (
        <>
          {" "}
          <TextLink href={link.href} className="min-h-0">
            {link.label}
          </TextLink>
        </>
      )}
    </p>
  );
}

/** Three steps: everything is entered in sinceai.app, the main submission stays the source of truth. */
export function HowToEnter() {
  return (
    <div data-how-to-enter>
      <ol className="grid grid-cols-1 border-l border-t border-white/10 md:grid-cols-3">
        {HOW_TO_ENTER.map((step, i) => (
          <li key={step.title} className="guide-avoid-break border-b border-r border-white/10 p-5">
            <p className={`${eyebrow} text-(--color-event)`}>Step {i + 1}</p>
            <h4 className="mt-2 text-lg font-bold tracking-tight text-white">{step.title}</h4>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{step.text}</p>
          </li>
        ))}
      </ol>
      <p className="guide-no-print mt-3">
        <TextLink href={HOW_TO_ENTER_LINK.href} className="font-semibold text-white">
          {HOW_TO_ENTER_LINK.label}
        </TextLink>
      </p>
    </div>
  );
}

/** The seven MLH categories, labelled as prizes provided through MLH. */
export function MlhAwards() {
  return (
    <div id={MLH_AWARDS_ANCHOR} data-mlh-awards>
      <p className="max-w-3xl text-sm text-neutral-300 leading-relaxed">{MLH_AWARDS_NOTE}</p>
      <ul className="mt-5 grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {MLH_AWARDS.map((a) => (
          <li key={a.id} data-mlh-award={a.id} className="flex flex-col border-b border-r border-white/10 p-4">
            <p className={`${eyebrow} text-white/55`}>Through MLH</p>
            <h4 className="mt-2 font-bold tracking-tight text-white">{a.title}</h4>
            <p className="mt-1 text-sm text-(--color-event)">Prize: {a.prize}</p>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{a.description}</p>
            <p className="guide-no-print mt-auto pt-2">
              <TextLink href={a.href}>
                Get started<span className="sr-only"> with {a.title}</span>
              </TextLink>
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-3 max-w-3xl">
        <Questions text={MLH_QUESTIONS} link={{ label: "MLH prize page for Since AI Hackathon", href: MLH_PRIZE_PAGE }} />
      </div>
    </div>
  );
}

function List({ label, items }: { label: string; items: readonly string[] }) {
  return (
    <div className="border-t border-white/10 py-3">
      <p className={`${eyebrow} text-white/55`}>{label}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-neutral-300 leading-relaxed">
            <span aria-hidden="true" className="text-white/55">
              —
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Criteria({ award }: { award: TechnologyAward }) {
  return (
    <div className="border-t border-white/10 py-3">
      <p className={`${eyebrow} text-white/55`}>Evaluation criteria</p>
      <table className="mt-2 w-full text-sm">
        <caption className="sr-only">{award.title} evaluation criteria and weights</caption>
        <tbody>
          {award.criteria.map((c) => (
            <tr key={c.name} className="border-b border-white/5 align-top last:border-0">
              <th scope="row" className="py-1.5 pr-3 text-left font-normal text-neutral-300">
                {c.name}
                {c.text && <span className="block text-xs text-neutral-400">{c.text}</span>}
              </th>
              <td className="py-1.5 text-right font-mono text-white">{c.weight}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Closed by default, opened for printing (PrintButton and the print stylesheet). */
function Disclosure({
  label,
  children,
  ...data
}: { label: string; children: React.ReactNode } & Record<`data-${string}`, boolean>) {
  return (
    <details className="guide-details group border-t border-white/10" {...data}>
      <summary className="flex min-h-11 items-center justify-between gap-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        <span className={`${eyebrow} text-white/55 group-hover:text-white`}>{label}</span>
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className="guide-chevron shrink-0 text-white/55 transition-transform duration-200"
        >
          <path d="M1.5 4l4.5 4.5L10.5 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  );
}

/** One technology award: provider, prize, eligibility, evidence, criteria and docs. */
export function TechnologyAwardCard({
  award,
  intro,
  children,
}: {
  award: TechnologyAward;
  /** Shown right after the prize (e.g. FIWARE's two routes). */
  intro?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <article
      id={awardAnchor(award.id)}
      data-award={award.id}
      aria-labelledby={`award-${award.id}-title`}
      className="guide-avoid-break flex flex-col border border-white/10 p-5 md:p-6"
    >
      <p className={`${eyebrow} text-white/55`}>Optional award · {award.provider}</p>
      <h4 id={`award-${award.id}-title`} className="mt-2 text-xl font-bold tracking-tight text-white">
        {award.title}
      </h4>
      <p className="mt-2 text-sm font-semibold text-(--color-event)" data-award-prize>
        {award.prize}
      </p>
      <div className="mt-4">
        {intro}
        <List label="Eligibility" items={award.eligibility} />
        <List label="Evidence to submit" items={award.evidence} />
        <Criteria award={award} />
        <p className="border-t border-white/10 py-3 text-sm text-neutral-400 leading-relaxed">{award.evaluation}</p>
        {children}
        <Questions text={award.questions.text} link={award.questions.link} />
      </div>
      <div className="guide-no-print mt-auto flex flex-wrap gap-x-5">
        {award.docs.map((d) => (
          <TextLink key={d.href} href={d.href}>
            {d.label}
          </TextLink>
        ))}
      </div>
    </article>
  );
}

/** Red Hat and FIWARE side by side; FIWARE adds its two routes, prize package and conditions. */
export function TechnologyAwards() {
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <TechnologyAwardCard award={RED_HAT_AWARD} />
      <TechnologyAwardCard
        award={FIWARE_AWARD}
        intro={
          <div className="border-t border-white/10 py-3">
            <p className={`${eyebrow} text-white/55`}>Two ways to enter</p>
            <ul className="mt-2 space-y-2">
              {FIWARE_AWARD.routes.map((r) => (
                <li key={r.letter} className="flex gap-3 text-sm leading-relaxed">
                  <span className="font-mono font-bold text-(--color-event)">{r.letter}</span>
                  <span className="text-neutral-300">
                    <span className="font-semibold text-white">{r.title}.</span> {r.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <Disclosure label="Prize package" data-fiware-benefits>
          <ol className="space-y-1.5">
            {FIWARE_AWARD.benefits.map((b) => (
              <li key={b.title} className="text-sm text-neutral-300 leading-relaxed">
                <span className="font-semibold text-white">{b.title}.</span> {b.text}
              </li>
            ))}
          </ol>
        </Disclosure>
        <Disclosure label="Conditions" data-fiware-conditions>
          <ul className="space-y-1.5">
            {FIWARE_AWARD.conditions.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-neutral-300 leading-relaxed">
                <span aria-hidden="true" className="text-white/55">
                  —
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Disclosure>
        <p className="border-t border-white/10 py-3 text-sm text-neutral-400 leading-relaxed">{FIWARE_AWARD.mentor}</p>
      </TechnologyAwardCard>
    </div>
  );
}

/** Builder Pack technical resources: a ten-minute start, links by topic and the example projects. */
export function FiwareResources() {
  return (
    <div data-fiware-resources>
      <div className="border border-white/10 p-5 md:p-6">
        <p className={`${eyebrow} text-(--color-event)`}>Start in under ten minutes</p>
        <ol className="mt-3 space-y-3">
          {FIWARE_QUICK_START.map((s, i) => (
            <li key={s.step} className="min-w-0 text-sm text-neutral-300">
              <span className="font-semibold text-white">
                {i + 1}. {s.step}
              </span>
              {/* One command per line, never wrapped mid-flag: a phone scrolls the block sideways (keyboard too), not the page. */}
              <pre
                tabIndex={0}
                className="mt-1 overflow-x-auto whitespace-pre border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-xs leading-relaxed text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <code>{s.code}</code>
              </pre>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-neutral-400">
          {FIWARE_NO_SETUP}{" "}
          <TextLink href={FIWARE_ANTARES_DEMO} className="min-h-0">
            Antares demo broker
          </TextLink>
        </p>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
        {FIWARE_RESOURCE_GROUPS.map((g) => (
          <section key={g.title} aria-label={g.title}>
            <h3 className={`${eyebrow} text-white/55`}>{g.title}</h3>
            <ul className="mt-1">
              {g.items.map((item) => (
                <li key={item.label} className="text-sm">
                  {item.href ? <TextLink href={item.href}>{item.label}</TextLink> : item.label}
                  {item.text && <span className="block pb-2 text-xs text-neutral-400 leading-relaxed">{item.text}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <h3 className="mt-8 text-lg font-bold tracking-tight text-white">Example projects</h3>
      <p className="mt-1 max-w-3xl text-sm text-neutral-400">
        Ideas from FIWARE&apos;s partners — adopt one, or bring your own FIWARE idea.
      </p>
      <ul className="mt-4 grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {FIWARE_EXAMPLES.map((e) => (
          <li key={e.title} className="border-b border-r border-white/10 p-4">
            <p className="font-semibold text-white">{e.title}</p>
            <p className="mt-1 text-sm text-neutral-400 leading-relaxed">{e.text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-3xl text-sm text-neutral-300 leading-relaxed">
        <span className="font-semibold text-white">Help.</span> {FIWARE_HELP}
      </p>
    </div>
  );
}

/** What a confidential challenge (FORCIT) means for a team, as five rules. */
export function ConfidentialRules() {
  return (
    <div data-confidential-rules>
      <p className="max-w-3xl text-sm text-neutral-300 leading-relaxed">
        <span className="font-semibold text-white">
          {CONFIDENTIAL_CHALLENGE.company} — {CONFIDENTIAL_CHALLENGE.challenge}
        </span>{" "}
        requires a confidentiality agreement before its detailed industrial dataset is shared.
      </p>
      <ul className="mt-5 grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {CONFIDENTIAL_RULES.map((r) => (
          <li key={r.title} className="guide-avoid-break border-b border-r border-white/10 p-5">
            <h3 className="text-base font-bold tracking-tight text-white">{r.title}</h3>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{r.text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 max-w-3xl text-sm text-neutral-400 leading-relaxed">{CONFIDENTIAL_NOTE}</p>
    </div>
  );
}
