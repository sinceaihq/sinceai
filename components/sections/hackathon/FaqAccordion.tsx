export interface Faq {
  q: string;
  a: string;
}

/**
 * Collapsible FAQ for /hackathon — native <details>, so every answer stays in
 * the HTML (the FAQPage schema matches visible content), it works without
 * JavaScript, and the browser handles keyboard and screen-reader behaviour.
 */
export function FaqAccordion({ faqs }: { faqs: readonly Faq[] }) {
  return (
    <div className="w-full border-t border-white/10">
      {faqs.map((faq) => (
        <details key={faq.q} className="faq-item group border-b border-white/10">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-base font-semibold text-white hover:text-neutral-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [&::-webkit-details-marker]:hidden">
            {faq.q}
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              className="shrink-0 text-white/55 transition-transform duration-200 group-open:rotate-180"
            >
              <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </summary>
          <p className="max-w-[720px] pb-5 text-sm text-neutral-400 leading-relaxed">{faq.a}</p>
        </details>
      ))}
    </div>
  );
}
