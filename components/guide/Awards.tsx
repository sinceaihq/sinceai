import {
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
  MLH_AWARDS_NOTE,
  MLH_PRIZE_PAGE,
  RED_HAT_AWARD,
  type TechnologyAward,
} from "@/lib/hackathon-2026";
import { TextLink } from "./primitives";

const eyebrow = "font-mono text-[11px] uppercase tracking-widest";

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
    <div data-mlh-awards>
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
      <p className="guide-no-print mt-3">
        <TextLink href={MLH_PRIZE_PAGE}>MLH prize page for Since AI Hackathon</TextLink>
      </p>
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
      id={`award-${award.id}`}
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
        <div className="border-t border-white/10 py-3" data-fiware-benefits>
          <p className={`${eyebrow} text-white/55`}>Prize package</p>
          <ol className="mt-2 space-y-1.5">
            {FIWARE_AWARD.benefits.map((b) => (
              <li key={b.title} className="text-sm text-neutral-300 leading-relaxed">
                <span className="font-semibold text-white">{b.title}.</span> {b.text}
              </li>
            ))}
          </ol>
        </div>
        <List label="Conditions" items={FIWARE_AWARD.conditions} />
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
            <li key={s.step} className="text-sm text-neutral-300">
              <span className="font-semibold text-white">
                {i + 1}. {s.step}
              </span>
              <code className="mt-1 block whitespace-pre-wrap break-all border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-xs text-white">
                {s.code}
              </code>
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
