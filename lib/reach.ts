import counts from "./reach-counts.json";

/**
 * Where Since AI's builders are — aggregated per-country counts behind the
 * homepage map and the "countries" figures on /impact. No personal data: the
 * exports are reduced to country → number before they enter the repository.
 *
 * - members: sinceai.app accounts, by the country on the profile
 * - applicants: Since AI Hackathon 2026 registrations, by country of residence
 */
export type ReachLayer = "members" | "applicants";

export interface CountryCount {
  name: string;
  count: number;
}

const rank = (o: Record<string, number>): CountryCount[] =>
  Object.entries(o)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

const members = rank(counts.members);
const applicants = rank(counts.applicants);
const sum = (list: CountryCount[]) => list.reduce((n, c) => n + c.count, 0);
const outside = (list: CountryCount[]) => sum(list.filter((c) => c.name !== "Finland")) / sum(list);

export const REACH = {
  /** Date of the exports, ISO. */
  asOf: counts.asOf,
  asOfLabel: new Date(`${counts.asOf}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
  members: {
    ranked: members,
    countries: members.length,
    /** All accounts, including the few without a country. */
    total: counts.membersTotal,
    outsideFinland: outside(members),
  },
  applicants: {
    ranked: applicants,
    countries: applicants.length,
    total: counts.applicantsTotal,
    outsideFinland: outside(applicants),
    /** Applicants who said they would travel to Turku from abroad. */
    travelling: counts.applicantsTravelling,
  },
} as const;

/** "1,392" — the site's number style. */
export const fmt = (n: number) => n.toLocaleString("en-US");

/** "58%" */
export const pct = (x: number) => `${Math.round(x * 100)}%`;
