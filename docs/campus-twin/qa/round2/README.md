# Campus twin — QA round 2 (5 Oct 2026)

Eight owners (core-engine, core-render, core-ui, ground-context, biocity, joki, educity, vehicles-event) worked the
round-1 lists (`../round1/*.json`, 8 critical / 58 high / 67 medium) in parallel under [`BRIEF.md`](BRIEF.md) on the
GPU-less server (Mesa lavapipe). All critical and high issues are fixed and were re-shot by their owners; the lead
reviewed a final desktop (1280×800 high) and phone (Pixel 7, low) sweep on the production build with no module or
console errors. Each commit `feat(twin-<owner>)` on 5 Oct lists what changed.

Known remaining items, worst first (from the owners' reports):

1. Real-device frame rates and memory are unmeasured (the server renders in software); the phone budget is enforced
   from estimates (≈289 MB of 300 MB on low).
2. Eye-level line of sight ignores glass partitions (a room label can show through glass in EduCity).
3. The Showroom reads very dark apart from the LED wall; on phones its view shows four of the six counters.
4. Floors 2–3 companies: routes end in the Showroom and then settle on the stand; the tower-stair legs
   (`int-joki-showroom-to-f2/f3`) exist but are not yet wired into tours.
5. Low tier sits at ≈0.69–0.80 M triangles in the busiest views (budget 0.7 M).
6. Unverified facts: BioCity's SE-end glass field position, the step count at its south end (terrain says ≈11).
