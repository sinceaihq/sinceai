"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface Faq {
  q: string;
  a: string;
}

/**
 * Collapsible FAQ for /hackathon.
 *
 * The answers were previously rendered as eleven stacked cards, which pushed
 * the page tail well past the fold. Collapsing them keeps every answer in the
 * DOM (so the FAQPage schema still matches visible content) while shortening
 * the scroll to the registration CTA.
 */
export function FaqAccordion({ faqs }: { faqs: readonly Faq[] }) {
  return (
    <Accordion type="single" collapsible className="w-full border-t border-white/10">
      {faqs.map((faq) => (
        <AccordionItem
          key={faq.q}
          value={faq.q}
          className="border-b border-white/10 last:border-b"
        >
          <AccordionTrigger className="text-base font-semibold text-white hover:no-underline hover:text-neutral-300 cursor-pointer py-5">
            {faq.q}
          </AccordionTrigger>
          <AccordionContent className="text-sm text-neutral-400 leading-relaxed max-w-[720px] pb-5">
            {faq.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
