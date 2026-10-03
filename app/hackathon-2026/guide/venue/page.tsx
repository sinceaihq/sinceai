import {
  GuideHero,
  GuideSection,
  HelpSection,
  RouteCard,
  SectionHeading,
  SectionNav,
  VenueCards,
  VenueExplorer,
} from "@/components/guide";
import { Venue3D } from "@/components/guide/venue3d/Venue3D";
import {
  getVenue,
  GUIDE_BASE_PATH,
  VENUE_GUIDE,
  VENUE_MAPS,
  VENUES,
} from "@/lib/hackathon-2026";

const MAP_ORDER = [
  "educity-flow-1",
  "educity-1",
  "educity-2",
  "educity-flow-2",
  "biocity-lobby",
  "joki-1",
  "joki-showroom",
  "joki-2-3",
];

export default function VenueExplorerPage() {
  return (
    <>
      <GuideHero
        crumbs={[
          { label: "Hackathon 2026", href: "/hackathon" },
          { label: "Field Guide", href: GUIDE_BASE_PATH },
          { label: VENUE_GUIDE.name },
        ]}
        title={VENUE_GUIDE.name}
        lede={VENUE_GUIDE.lede}
      />

      <SectionNav
        items={[
          { id: "preview-3d", label: "3D preview" },
          { id: "maps", label: "Floor plans" },
          { id: "route", label: "Between venues" },
          { id: "venues", label: "Addresses" },
          { id: "locations", label: "All locations" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="preview-3d" className="border-t-0 pt-8 md:pt-12">
        <SectionHeading
          id="preview-3d-title"
          eyebrow="// step inside · illustrative 3D"
          title="See the space before you arrive."
          lede="Explore the Joki Showroom, the Q&A floors and the BioCity build hall as they are being set up. Illustrative and not to scale — the floor plans below are the reference for rooms and stands."
        />
        <Venue3D />
      </GuideSection>

      <GuideSection id="maps">
        <SectionHeading
          id="maps-title"
          eyebrow="// floor plans"
          title="Every floor that matters."
          lede="The 2026 event maps and the venue's official floor plans. Tap a map to zoom and pan; every location is also listed as text."
        />
        <VenueExplorer mapIds={MAP_ORDER} syncHash label="All venue maps" />
      </GuideSection>

      <GuideSection id="route">
        <SectionHeading id="route-title" eyebrow="// between venues" title="EduCity to BioCity and Joki." />
        <RouteCard />
      </GuideSection>

      <GuideSection id="venues">
        <SectionHeading id="venues-title" eyebrow="// addresses" title="Three venues." />
        <VenueCards venues={["educity", "biocity", "joki"]} />
      </GuideSection>

      <GuideSection id="locations">
        <SectionHeading
          id="locations-title"
          eyebrow="// text version"
          title="All locations."
          lede="Everything on the maps, as a list."
        />
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {VENUES.map((venue) => (
            <div key={venue.id}>
              <h3 className="text-xl font-bold tracking-tight text-white">{getVenue(venue.id).name}</h3>
              {VENUE_MAPS.filter((m) => m.venue === venue.id).map((map) => (
                <div key={map.id} className="mt-5">
                  <h4 className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">{map.label}</h4>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {map.hotspots.map((h) => (
                      <li key={h.id} className="text-neutral-300">
                        {h.label}
                        {h.description && <span className="text-neutral-500"> — {h.description}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="help">
        <SectionHeading id="help-title" eyebrow="// help" title="Can't find it?" />
        <HelpSection />
      </GuideSection>
    </>
  );
}
