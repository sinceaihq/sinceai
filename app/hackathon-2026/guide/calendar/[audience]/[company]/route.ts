import {
  buildCompanyCalendar,
  CHALLENGE_COMPANIES,
  companyCalendarFileName,
  getCompany,
  getGuide,
  GUIDE_X_ROBOTS_TAG,
} from "@/lib/hackathon-2026";

// One static .ics per challenge company, next to the challenge partner calendar.
export const dynamicParams = false;

const PARTNER_SLUG = getGuide("challenge-partners").slug;

export function generateStaticParams() {
  return CHALLENGE_COMPANIES.map((c) => ({ audience: PARTNER_SLUG, company: c.id }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ audience: string; company: string }> },
) {
  const { audience, company: id } = await params;
  const company = getCompany(id);
  if (audience !== PARTNER_SLUG || !company) return new Response("Not found", { status: 404 });
  return new Response(buildCompanyCalendar(company), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${companyCalendarFileName(company)}"`,
      "X-Robots-Tag": GUIDE_X_ROBOTS_TAG,
    },
  });
}
