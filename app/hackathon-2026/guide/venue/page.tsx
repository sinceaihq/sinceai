import Link from "next/link";
import {
  FoodSection,
  ParkingSection,
  GuideHero,
  GuideSection,
  HelpSection,
  RouteCard,
  SectionHeading,
  SectionNav,
  VenueCards,
  VenueExplorer,
} from "@/components/guide";
import StructuredData from "@/components/StructuredData";
import { PhotoGallery } from "@/components/guide/PhotoGallery";
import { Twin } from "@/components/guide/twin/Twin";
import {
  AWARDS_HREF,
  getVenue,
  GUIDE_BASE_PATH,
  keepDots,
  RESOURCES_PATH,
  VENUE_GUIDE,
  VENUE_MAPS,
  VENUE_PHOTOS,
  VENUES,
} from "@/lib/hackathon-2026";
import { ORG } from "@/lib/org";

/** Machine-readable credits for every photo on the page. */
const photoSchema = {
  "@context": "https://schema.org",
  "@graph": VENUE_PHOTOS.map((p) => ({
    "@type": "ImageObject",
    contentUrl: `${ORG.baseUrl}${p.src}`,
    caption: p.caption,
    description: p.alt,
    creditText: p.credit,
    creator: { "@type": "Organization", name: p.creator },
    copyrightHolder: { "@type": "Organization", name: p.copyrightHolder },
    copyrightNotice: `© ${p.copyrightHolder}`,
  })),
};

const MAP_ORDER = [
  "educity-team-formation",
  "educity-1",
  "educity-2",
  "educity-3",
  "biocity-lobby",
  "joki-1",
  "joki-showroom",
  "joki-2-3",
];

export default function VenueExplorerPage() {
  return (
    <>
      <StructuredData data={photoSchema} />
      <GuideHero
        crumbs={[
          { label: "Hackathon 2026", href: "/hackathon" },
          { label: "Field Guide", href: GUIDE_BASE_PATH },
          { label: VENUE_GUIDE.name },
        ]}
        title={VENUE_GUIDE.name}
        lede={VENUE_GUIDE.lede}
      >
        <nav aria-label="Floor plans by building" className="grid grid-cols-3 gap-px border border-white/10 bg-white/10">
          {VENUES.map((venue) => (
            <a
              key={venue.id}
              href={`#maps-${venue.id}`}
              className="flex min-h-14 flex-col justify-center bg-black px-3 py-2 transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
            >
              <span className="font-semibold text-white">{venue.name}</span>
              <span className="text-xs text-neutral-400">Floor plans</span>
            </a>
          ))}
        </nav>
      </GuideHero>

      <SectionNav
        items={[
          { id: "maps", label: "Floor plans" },
          { id: "route", label: "Between venues" },
          { id: "venues", label: "Addresses" },
          { id: "food", label: "Food" },
          { id: "preview-3d", label: "3D campus" },
          { id: "photos", label: "Photos" },
          { id: "parking", label: "Parking" },
          { id: "locations", label: "All locations" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="maps" className="border-t-0 pt-8 md:pt-12">
        <SectionHeading
          id="maps-title"
          eyebrow="// floor plans"
          title="Find a room or stand."
          lede="Pick a building and floor. Tap the plan to zoom and pan — every place on it is listed beside it."
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

      <FoodSection />

      <GuideSection id="preview-3d">
        <SectionHeading
          id="preview-3d-title"
          eyebrow="// optional · the campus in 3D"
          title="Explore the campus in 3D."
          lede="EduCity, BioCity and Joki to scale, from City of Turku open data: walk the arrival routes and find your room or stand. The floor plans above stay the reference."
        />
        <Twin />
      </GuideSection>

      <GuideSection id="photos">
        <SectionHeading
          id="photos-title"
          eyebrow="// what it looks like"
          title="The real spaces."
          lede="Tap a photo to see it full size."
        />
        <PhotoGallery photos={VENUE_PHOTOS} />
      </GuideSection>

      <ParkingSection />

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
                  <h4 className="font-mono text-[11px] uppercase tracking-widest text-white/55">{map.label}</h4>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {map.hotspots.map((h) => (
                      <li key={h.id} className="text-neutral-300">
                        {h.label}
                        {h.description && <span className="text-white/55"> — {keepDots(h.description)}</span>}
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
        <div className="mt-8">
          {/* The Venue Explorer stays about places; tools and awards live in Builder Resources. */}
          <nav
            aria-label="Builder Resources"
            className="flex flex-wrap gap-x-6 gap-y-1 text-sm"
            data-venue-resource-links
          >
            <Link href={RESOURCES_PATH} className="inline-flex min-h-11 items-center text-neutral-300 underline underline-offset-4 decoration-white/30 hover:text-white">
              Builder Resources: tools and credits
            </Link>
            <Link href={AWARDS_HREF} className="inline-flex min-h-11 items-center text-neutral-300 underline underline-offset-4 decoration-white/30 hover:text-white">
              Optional awards: MLH, Red Hat, FIWARE
            </Link>
          </nav>
        </div>
      </GuideSection>
    </>
  );
}
