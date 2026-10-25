import { WIFI, WIFI_ANCHOR } from "@/lib/hackathon-2026";
import { GuideSection, SectionHeading, StatusTag, TextLink } from "./primitives";

function Dash() {
  return (
    <span aria-hidden="true" className="text-white/55">
      —
    </span>
  );
}

/** Wi-Fi at the venues — section id `wifi`, on the hub and the builder guide. */
export function WifiSection() {
  const { educity, buildSpaces } = WIFI;
  return (
    <GuideSection id={WIFI_ANCHOR}>
      <SectionHeading id={`${WIFI_ANCHOR}-title`} eyebrow="// wi-fi" title={WIFI.question} lede={WIFI.answer} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="guide-avoid-break border border-white/10 p-5 md:p-6" data-wifi="educity">
          <p className="font-mono text-[11px] uppercase tracking-widest text-white/55">{educity.when}</p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-white">{educity.title}</h3>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-white/55">Network</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-white">{educity.network}</p>
          <ol className="mt-4 space-y-2 text-sm text-neutral-300 leading-relaxed">
            {educity.steps.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="w-4 shrink-0 font-mono text-(--color-event)">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-white/10 pt-4 text-sm text-neutral-400 leading-relaxed">
            <span className="font-semibold text-white">eduroam.</span> {educity.eduroam}
          </p>
        </div>

        <div className="guide-avoid-break flex flex-col border border-white/10 p-5 md:p-6" data-wifi="build-spaces">
          <p className="font-mono text-[11px] uppercase tracking-widest text-white/55">{buildSpaces.when}</p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-white">{buildSpaces.title}</h3>
          <div className="mt-4">
            <StatusTag status="pending" label="Instructions to be confirmed" />
          </div>
          <p className="mt-4 text-sm text-neutral-300 leading-relaxed">{buildSpaces.text}</p>
          <p className="mt-3 text-sm text-neutral-400 leading-relaxed">{buildSpaces.pending}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[3fr_2fr]">
        <div className="guide-avoid-break border border-white/10 p-5">
          <h3 className="text-lg font-bold tracking-tight text-white">Before you arrive</h3>
          <ul className="mt-3 space-y-2 text-sm text-neutral-300 leading-relaxed">
            {WIFI.beforeArriving.map((t) => (
              <li key={t} className="flex gap-2">
                <Dash />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="guide-avoid-break border border-white/10 p-5">
          <h3 className="text-lg font-bold tracking-tight text-white">Connection problems?</h3>
          <p className="mt-3 text-sm text-neutral-300 leading-relaxed">{WIFI.problems}</p>
        </div>
      </div>

      <p className="mt-4 flex flex-wrap items-center gap-x-5 text-sm text-neutral-400">
        <span className="font-mono text-[11px] uppercase tracking-widest text-white/55">Official information</span>
        {WIFI.links.map((l) => (
          <TextLink key={l.href} href={l.href}>
            {l.label}
          </TextLink>
        ))}
      </p>
    </GuideSection>
  );
}
