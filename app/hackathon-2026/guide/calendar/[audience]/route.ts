import { buildCalendar, calendarFileName, GUIDES, GUIDE_X_ROBOTS_TAG } from "@/lib/hackathon-2026";

// One static .ics per guide audience; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ audience: g.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ audience: string }> }) {
  const { audience: slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) return new Response("Not found", { status: 404 });
  return new Response(buildCalendar(guide.audience), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${calendarFileName(guide.audience)}"`,
      "X-Robots-Tag": GUIDE_X_ROBOTS_TAG,
    },
  });
}
