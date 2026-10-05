"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  briefingRoomLabel,
  companyMapIds,
  getMap,
  GUIDE_BASE_PATH,
  keepDots,
  qaLocationLabel,
  type ChallengeCompany,
  type VenueMap,
} from "@/lib/hackathon-2026";
import { CompanyLogo } from "./CompanyLogo";
import { MapViewer } from "./maps/MapViewer";

const normalise = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * All 15 challenge companies: Friday room, Saturday Q&A and maps. Search is a
 * progressive enhancement — the full list renders on the server.
 */
export function CompanyDirectory({ companies }: { companies: readonly ChallengeCompany[] }) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  // Text typed before hydration (slow phones) is in the DOM but not in state yet: pick it up.
  useEffect(() => {
    if (input.current?.value) setQuery(input.current.value);
  }, []);
  const [viewer, setViewer] = useState<{ map: VenueMap; highlight: string[]; opener: HTMLElement } | null>(null);

  const visible = useMemo(() => {
    const q = normalise(query.trim());
    if (!q) return companies;
    return companies.filter((c) => normalise(`${c.name} ${briefingRoomLabel(c)} ${qaLocationLabel(c)}`).includes(q));
  }, [companies, query]);

  return (
    <div>
      <label className="guide-no-print relative mb-6 block max-w-md">
        <span className="sr-only">Find your company</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55"
        />
        <input
          ref={input}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find your company or room"
          autoComplete="off"
          className="h-12 w-full rounded-none border border-white/20 bg-transparent pl-11 pr-4 text-sm text-white placeholder:text-white/55 focus:border-white focus:outline-none"
        />
      </label>

      <p className="sr-only" aria-live="polite">
        {visible.length} of {companies.length} companies shown
      </p>

      <ul className="border-t border-white/10">
        {visible.map((company) => {
          const maps = companyMapIds(company);
          return (
            <li
              key={company.id}
              id={`company-${company.id}`}
              className="guide-target guide-avoid-break grid grid-cols-2 gap-x-4 gap-y-3 border-b border-white/10 py-5 md:grid-cols-[11rem_1fr_1fr_auto] md:items-center md:gap-6"
            >
              <div className="col-span-2 flex min-h-8 items-center gap-4 md:col-span-1 md:block">
                {company.logo && (
                  <span className="guide-no-print block h-8 w-28 md:h-9 md:w-32">
                    <CompanyLogo name={company.name} logo={company.logo} sizes="128px" decorative />
                  </span>
                )}
                <span
                  className={
                    company.logo
                      ? "text-sm font-semibold text-white md:mt-2 md:block md:text-xs md:font-normal md:text-white/55"
                      : "text-lg font-bold tracking-tight text-white"
                  }
                >
                  {company.name}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-mono uppercase tracking-widest text-white/55">
                  Fri briefing&nbsp;· EduCity floor {company.briefing.floor}
                </p>
                <p className="mt-1 font-semibold text-white">{briefingRoomLabel(company)}</p>
                <button
                  type="button"
                  onClick={(e) =>
                    setViewer({ map: getMap(maps.briefing), highlight: [company.id], opener: e.currentTarget })
                  }
                  className="guide-no-print -my-1 inline-flex min-h-11 items-center text-xs text-neutral-400 underline underline-offset-4 hover:text-white cursor-pointer"
                >
                  Room on map
                </button>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-mono uppercase tracking-widest text-white/55">Sat Q&amp;A</p>
                <p className="mt-1 font-semibold text-white">{keepDots(qaLocationLabel(company))}</p>
                <button
                  type="button"
                  onClick={(e) => setViewer({ map: getMap(maps.qa), highlight: [company.id], opener: e.currentTarget })}
                  className="guide-no-print -my-1 inline-flex min-h-11 items-center text-xs text-neutral-400 underline underline-offset-4 hover:text-white cursor-pointer"
                >
                  Stand on map
                </button>
              </div>
              <Link
                href={`${GUIDE_BASE_PATH}/challenge-partners/${company.id}`}
                className="guide-no-print col-span-2 inline-flex min-h-11 items-center justify-center border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:col-span-1"
              >
                {company.name} page
                <span aria-hidden="true" className="ml-2">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {visible.length === 0 && (
        <p className="py-8 text-sm text-neutral-400">No match. Clear the search to see all 15 companies.</p>
      )}

      {viewer && (
        <MapViewer
          map={viewer.map}
          highlight={viewer.highlight}
          returnFocusTo={viewer.opener}
          open
          onOpenChange={(open) => {
            if (!open) setViewer(null);
          }}
        />
      )}
    </div>
  );
}
