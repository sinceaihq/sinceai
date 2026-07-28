import React from "react";
import Image from "next/image";
import { judges, type Judge } from "@/lib/judges";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Splits `text` on each highlight term and wraps the matches in <strong>. */
function highlightBio(text: string, terms: string[]) {
  if (terms.length === 0) return text;

  // Longest first so overlapping terms match the most specific one.
  const pattern = [...terms]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const parts = text.split(new RegExp(`(${pattern})`, "g"));

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-white">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

function JudgeCard({ judge }: { judge: Judge }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
      {/* Image Column */}
      <div className="lg:col-span-4 flex flex-col items-center lg:items-start">
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-full lg:h-auto lg:aspect-square max-w-[280px]">
          <Image
            src={judge.image}
            alt={`${judge.name} headshot`}
            fill
            className="object-cover grayscale"
            sizes="(max-width: 640px) 192px, (max-width: 1024px) 224px, 280px"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-6">
          {judge.links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-neutral-500 hover:text-white transition-colors duration-300"
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      </div>

      {/* Content Column */}
      <div className="lg:col-span-8">
        <div className="mb-6">
          <h3 className="text-3xl font-bold tracking-tight text-white">
            {judge.name}
          </h3>
          <p className="text-sm text-neutral-400 mt-2">
            {judge.title}, {judge.organization}
          </p>
        </div>

        <div className="space-y-4">
          {judge.bio.map((paragraph, i) => (
            <p key={i} className="text-sm text-neutral-400 leading-relaxed">
              {highlightBio(paragraph, judge.highlights)}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Judges() {
  return (
    <section className="py-24 px-6 border-t border-white/10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3">
          {"// judges"}
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-white mb-10">
          Judging panel.
        </h2>

        <div className="space-y-16">
          {judges.map((judge) => (
            <JudgeCard key={judge.name} judge={judge} />
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-sm text-neutral-400">
            Additional judges will be announced before the event.
          </p>
        </div>
      </div>
    </section>
  );
}
