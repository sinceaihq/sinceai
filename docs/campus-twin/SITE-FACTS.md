> Site research for the campus twin (4 Oct 2026). Coordinates are in the twin frame (metres; origin BioCity's OSM centroid; +x east, +z south, +y up; y = N2000 height − 23.20). File references to `ref/`, `ortho/` and photo sets point to the research material that is not in the repository; the data the pipeline needs is in `data/campus-twin/sources`.

# SPEC — Since AI Hackathon 2026 campus digital twin (modelling specification)

Version 1.0 · 4 Oct 2026 · lead technical artist (merged from the research team: geo, turku-open-data, ref-biocity,
ref-joki, ref-educity, ref-streetscape, plans, assets). This is the site-facts contract referenced by
`../twin/DESIGN.md` (intro: "Site facts live in research/SPEC.md").

Tags: **[V]** verified (source named) · **[M]** measured by the research team from data/photos · **[E]** estimate
(method given) · **[D]** design decision by the lead TA (where sources conflict or are silent).

**Precedence when sources disagree:** official vector CAD plans (TTK 4.6.2026, `interiors.json`) > City of Turku
LOD2/laser 2021/base map (`turku/heights.json`, DTM/DSM) > OSM (`campus.json`) > photo measurements (`ref/*`) >
organiser schematic maps. Owner statements (4 Oct 2026) and the organiser's annotated plans win on *event use*.

All paths below are relative to `research/` unless absolute.

**Read-first: decisions that resolve conflicts between the research reports [D]**
1. Datum `y = h_N2000 − 23.20`; plan frames B/J/E (§1.3) are canonical for everything at the hero buildings.
2. **Syvänne = BioCity's Tykistökatu entrance recess** (organiser plan shows two "Auto" labels there), not the
   Electrocity yard; 2 cars (+1 optional under the glass-tower pilotis), placements in §5.3.
3. BioCity is **7 storeys to y 26.8 + a 4.5 m light-grey technical storey to y 30.7 + a barrel vault to y 33.9**
   (LOD2 + laser); the "≈27 m" photo estimate is the facade, the "≈31 m" figures are the rooftop storey.
4. Joki levels from the construction section: Aula −1.70, tower F1 −1.10, F2 +2.90, F3 +6.90 (4.0 m floor-to-floor,
   not 4.3–4.6); fin tops ≈+11.9; tower centre = J origin (58.894, 15.934), ±0.4 m vs OSM/ortho/DSM.
5. EduCity: 1F lobby = deck level y +3.40 (5.0 m above Joukahaisenkatu); both main entrances are in the pavilion at
   deck level; companies use the SE-facade door B → room 1002; step-free = ICT-City gateway lifts.
6. "≈50 m outdoors" is false: EduCity → BioCity event entrance ≈200–210 m / ≈3 min (repo copy already being fixed, §10).
7. Fixes for the existing `venue3d` scenes when upgrading: Showroom LED wall r **8.45** (not 8.95), J-bearings
   194.2–346.8°; counters at J 186.7/218/250/281/312/341° (not 212° + 25.2°k); Joki F2–F3 content rotated **+16.36°**
   (already applied in `interiors-walls.json`/`interiors.json`); BioCity tables do not fit as drawn (§7.1).
8. Context buildings come from `turku/heights.json` LOD2 roof polygons — never from OSM levels × 3.6 m.

---

## 1. Coordinate frame & data files

### 1.1 Shared frame [V]

```
origin  = BioCity OSM centroid  lat 60.44932, lon 22.29326
x (east)  = (lon − 22.29326) · 54902.3      // = 111320·cos(60.44932°)
z (south) = −(lat − 60.44932) · 110540      // north = −z
y (up)    = h_N2000 − 23.20                 // [D] datum, see 1.2
```
- Compass bearing β (0 = north, clockwise) → horizontal unit vector `(sin β, 0, −cos β)`.
- three.js: a model whose nose/front is **−z** gets `rotation.y = −β·π/180`; a model whose front is **+x** gets
  `rotation.y = (90° − β)·π/180`.
- The frame is slightly anisotropic vs true metres: x is 0.25 % short, z 0.79 % short. CAD plans are true metres, so
  rigid plan transforms leave ≤ 0.4 m mismatch across one building — accepted.

### 1.2 Height datum [D]
`y = h_N2000 − 23.20` (two researchers proposed 23.15 / 23.20; 23.20 = Tykistökatu sidewalk at the BioCity entrance,
puts the BioCity lobby at +0.06). DTM PNG decoding: `y = value/1000 − 8.20` (PNG stores `N2000 = 15 + value/1000`).

| Reference level | N2000 | y | Source |
|---|---|---|---|
| Tykistökatu kerb at BioCity entrance | 23.09–23.27 | −0.11…+0.07 | [V] DTM 2021 + spot heights |
| BioCity entrance recess floor | 23.10–23.20 | −0.10…0.00 | [V] laser |
| **BioCity ground floor (lobby)** | 23.264 | **+0.06** | [V] TTK setup plan level mark |
| Jussin aukio lower (by BioCity / tower N side) | 23.5–23.7 | +0.3…+0.5 | [V] laser + 2024 spot 23.709 |
| Jussin aukio upper / deck start | 25.30–25.33 | +2.1 | [V] |
| Joki NE deck at tower door | 25.4–25.72 | +2.2…+2.5 | [V] section 25.72 / laser |
| **EduCity 1F lobby = deck door** | 26.60–26.63 | **+3.40** | [V] spot height at OSM n648173656 |
| Lemminkäisenkatu at BioCity SW facade | 21.86–22.09 | −1.1…−1.3 | [V] |
| Lemminkäisenkatu at Joki street door | 21.29–21.33 | −1.9 | [V] |
| Joukahaisenkatu at EduCity NE facade / zebra (236,47) | 21.6–22.2 | −1.6…−1.0 | [V] |
| EduCity SW surface lot | 19.9 | −3.3 | [V] |
| ParkCity street doors | 22.25–22.28 | −0.95 | [V] DTM |
| Kupittaa station hall street door / bus stop 870 | 26.06 / 25.26 | +2.9 / +2.1 | [V] DTM |
| Kupittaa island platform | ≈19.5 ±0.8 | ≈−3.7 | [E] tracks 18.3–19.6 (geo) / platform "≈20.4" (streetscape); DTM under the canopy is interpolated |

### 1.3 Building plan frames (use these for everything inside/attached to a hero building) [V]
Convention (plans researcher): `x_l = x·cosθ − z·sinθ + tx ; z_l = x·sinθ + z·cosθ + tz`.
three.js: put plan content (plan x, y-up, plan z) inside `group` with **`group.rotation.y = −θ` (rad),
`group.position = (tx, 0, tz)`**. Plan "up" (−z) points to compass bearing θ. Bearings inside a plan ("J-bearing")
are clockwise from plan-up: point = `(r·sin b, r·−cos b)`; compass = J-bearing + θ.

| Frame | Building | θ | (tx, tz) | Origin | Fit |
|---|---|---|---|---|---|
| **B** | BioCity GF (TTK PDF p1, 1:250) | **55.141°** | **(−6.928, 12.619)** | lobby centre line = origin of current `venue3d/.../biocity.ts` | 16 OSM vertices RMS 0.45 m; LOD2 roof polygons come out axis-aligned in B (x = −40.3/−30.6/29.5…, z = −31.5/−4.5/6.1/15.1/17.4) → excellent |
| **J** | Joki F1 (p2, 1:200) and F2–F3 (p3, 1:125, sheet rotated +16.36° about plate centres F2 (14.142,19.345) F3 (37.151,19.430)) | **38.781°** | **(58.894, 15.934)** = tower centre | round-tower centre | derived via the BioCity/Joki shared wall; LOD2 Joki hall roof is axis-aligned in J; true-ortho fin ring centre measured (58.7, 15.9), DSM fit (58.57, 15.83) |
| **E** | EduCity (TUAS wayfinding maps scaled to OSM) | **38.983°** | **(217.472, 51.220)** | outer N corner of main block; +x → SE facade, +z → SW (pavilion) | 6 OSM vertices RMS 0.20 m; LOD2 roof polygons axis-aligned in E |

Legacy frames (do **not** mix without converting):
- ref-biocity `(s,t)`: `s ≈ x_B + 33.99`, `t ≈ 17.40 − z_B` (±0.3 m), but its georeferenced positions differ from the CAD
  by up to 1.7 m (e.g. revolving door, column lines). **CAD (B) wins**; use ref-biocity only for facade/colour facts.
- ref-educity `(a,b)` ≈ E frame (a ≈ x_E, b ≈ z_E, within 0.1 m / 0.2°). Same y convention: `y_E = y − 3.40`.
- ref-joki (`ref/joki/*.json`) used the OSM circle centre (58.29, 15.60) and page-up 39.0°: **add (+0.60, +0.33)** to
  its local coordinates to land in the J-frame world (verified on counters/stands/stair, residual ≤ 0.3 m).

### 1.4 Data files

| File | Content | Use |
|---|---|---|
| `campus.json` | OSM-derived geometry (90 buildings + parts, 197 roads w/ centreline+width, 340 paths, 361 areas, 90 entrances, trees, lamps, benches, bike parking, bus stops, crossings, barriers, railway), `keyPlaces`, `syvanneCandidates`, 40 `routes`, `turkuBaseMap` (196 spot heights, 130 kerb lines, 212 footway edges, 154 step lines, 57 retaining-wall tops, 367 trees) | source of `engine/data/campus.ts` (DESIGN §10). **Ignore `heightEstimate`** (levels×3.6 rule) for anything in §3.4 |
| `turku/heights.json` | City of Turku CityGML LOD2: 62 buildings with `footprint_local`, `ground_n2000`, `roof_levels[].polygons_local` (flat z or zmin/zmax+slope) | **massing of every context building** (§3.4) and cross-check of hero massing |
| `turku/terrain_dtm2021_050m_uint16.png` (+`.json`, measured mask) / `turku/turku_dtm2021_local_050.npz` | 0.5 m bare-earth DTM, x −178.98…342.59, z −207.82…278.56 (laser 18 Apr 2021) | terrain mesh (§2.2) |
| `turku/turku_dsm2021_local_025.npz` | 0.25 m DSM + RGB | QA of roof heights |
| `turku/ortho.jpg` (2025 leaf-off, 0.1 m/px), `turku/ortho_trueortho2022.jpg` | aerials, georef in `turku/ortho.json` (plate carrée = linear in local frame) | tracing/QA only (see 1.5) |
| `street/streetscape_geodata_local.json` | 338 street-area polygons (part type + material), 2457 kerb/edge lines with Z, 186 lamp poles, 158 register trees, 157 furniture items, 341 signs, stairs/walls/fences, spot heights | streets, kerbs, furniture (§4) |
| `interiors.json` + `interiors-walls.json` | CAD-derived rooms/points (every item `plan` + `local`) and 723 extrudable wall/column polygons (BioCity 487, Joki F1 190, F2 23, F3 23) | interiors (§7) |
| `educity/educity_massing.json` | EduCity massing in local + y_E (mantle, terraces, plant room, atrium, pavilion, bridges, windows lists, zones) | EduCity (§3.3, §7.4) |
| `ref/biocity/biocity_model_data.json`, `ref/joki/joki_geometry_local.json`, `ref/joki/joki_rooms_local.json` | facade/feature data (frames: see 1.3 legacy) | facade details |
| **`spec_routes.json`** (new, this spec) | 27 tour legs (outdoor 2D + interior 3D) and 10 audience tours | routes (§6); merge into `CAMPUS.routes` |
| `spec_work/*.png` | QA renders made for this spec (DSM in B frame, recess overlays, routes) | reference |
| `assets/manifest.json` | 26 CC0 texture sets (127 WebP), 6 HDRIs, 15 GLBs, toolbox notes | §9 |
| `street/sun_2026-11-06_08.json`, `assets/api/sun_turku_nov2026.json`, `street/fmi_turku_november.json` | sun / weather | §8 |

### 1.5 Licences & attribution (must be honoured in the UI credit line)
- OSM: ODbL — "Map data © OpenStreetMap contributors".
- City of Turku base map / CityGML / laser / DTM-derived geometry: CC BY 4.0 [V avoindata.fi] — required mark
  **"© Turun kaupunki, käyttölupa CC BY 4.0"** (for modified maps: "Pohjakartta © Turun kaupunki, käyttölupa CC BY 4.0").
  The twin's terrain and context massing derive from it → **add it to DESIGN §8 credits**. 3D Tiles textures: licence
  presumed, unconfirmed → do not ship them.
- NLS data (only if used): "Contains data from the National Land Survey of Finland <dataset> <MM/YYYY>".
- Textures/HDRIs/GLBs in `assets/`: CC0 (verified per asset).
- All photos (TTK, Haroma/Wellu Hämäläinen, Vesa Loikas, Arosuo, Pentagon, RajuLive, Finna, Commons BY-SA) and the
  aerial orthophotos: **internal modelling reference only**; never ship as textures. No trademarks/logos (car makers,
  tenants, "WORLD TRADE CENTER") — §3.1.6.

---

## 2. Site layout & terrain

### 2.1 Extent and level of detail [D]
- **Hero zone** (full detail, walkable): x −60…275, z −80…150 — BioCity, Joki, EduCity, Jussin aukio, Ströget deck,
  Tykistökatu frontage x −60…+20, ParkCity west face, Joukahaisenkatu at EduCity.
- **Arrival zone** (street detail, simplified facades): x −60…340, z −260…150 — Kupittaa station, Kalevansilta,
  ParkCity, Tykistökatu to the station, bus stops 870/846.
- **Context ring** (massing from LOD2 + styled facades): the DTM extent x −179…343, z −208…279.
- Two street grids [V]: BioCity/Electrocity/Eurocity/Pharmacity long axes at bearing 145.3°/325.3° (Tykistökatu runs
  ≈34°/214°); ICT-City/DataCity/EduCity/ParkCity/CivilCity **and Joki** at bearing 128.8°/308.8° (16.5° apart; OSM
  `orientation` strings use degrees CCW from east: 124.7° and 141.2°). Plan frames: B up = 55.14° (plan +x → 145.14°),
  J up = 38.78° (+x → 128.78°), E up = 38.98° (+x → 128.98°).

### 2.2 Terrain [V unless marked]
- Build the ground from the 0.5 m DTM, decimated to 1 m (2 m in the context ring), with **breaklines** at kerbs
  (`street/...edge_lines` carriageway_edge with Z1/Z2) and retaining-wall tops. Kerb upstand **0.12 m** [E Finnish
  practice 100–150 mm], granite, 0.30 m wide; flush (0.04 m) at zebra crossings.
- General fall NW→SE ≈ 4.5 m over 350 m (≈1.3 %). Tykistökatu along BioCity is flat (y −0.1…+0.3);
  Lemminkäisenkatu falls from y −1.1 (BioCity) to −1.9 (Joki door), −2.3 (DataCity), −3.4 (EduCity lot), −3.7
  (Untamonkatu).
- **Split levels and structures the DTM does not represent well — model as objects:**

| Feature | Geometry | y |
|---|---|---|
| Jussin aukio lower plaza | est. outline `campus.json areas[est-jussin-aukio]` (432 m², x 32…63, z −4…24), grey concrete | +0.3…+0.5 |
| Jussin aukio upper plaza / deck | OSM pedestrian area w1212594779 (2622 m², layer 1, paving stones) from the tower NE side to the Ströget | +2.1 |
| Level edge | low wall with **white coping** along (56,2)→(81,−20) | +2.1 top |
| Main stair lower↔upper | 6.9 × 3.6 m centred (60.8, 3.7), ≈10 risers × 0.17 | +0.4 → +2.1 |
| Long low steps | at (82.5, −19.6) | — |
| Ströget deck (to EduCity) | OSM way 365063306 / deck area, (69,21)→(135,75)→(160,96)→(176.1,108.8), ≈140 m along ICT-City's SW side, over lower-level parking | +2.1 → +3.4 (linear) |
| EduCity SE deck / walkway | `educity_massing.json` SE_walkway poly + plaza at pavilion SE door | +3.4 (deck 25.6–26.6) |
| Electrocity sunken light-well walk | band (49,−1)→(62,−11), 3–5 m wide, stairs at (50.1,−0.2) and (63.1,−8.9), white coping | −1.5 (21.6–21.7) [M medium] |
| "BioCity" underground garage ramp (Aimo) | from Joukahaisenkatu (108,−57) down to (84,−27) between retaining walls | → −3.0 (20.2) |
| Railway cutting | tracks ≈17–19 m along `campus.json railway` (Rantarata, bearing ≈145°) | −6…−4 |
| Joki roof walkway | on the hall roof, OSM w625297905 (16.6,47.8)→(39,32.8)→(63.3,26.4)→(68.3,21.9) | +2.85 |
| Joki NE deck (over service yard) | pale pavers #d2c7bd, bollards | +2.2…+2.5 |
| Joki service yard / loading dock (E of tower) | (65…73, 25…34) | −3.0 (20.2) |

- 2021 laser predates ParkCity (2022–23), CivilCity, Station North/East blocks and the 2022–24 Jussin aukio works;
  use buildings/areas from OSM+LOD over those spots.

---

## 3. Buildings — exteriors

### 3.1 BioCity (Tykistökatu 6; OSM w48381050; LOD2 PRT 103454363H + 103454368N + SW block) — hero

**Identity [V TTK]:** completed 1991–92, architect Benito Casagrande; black recladding 2020 by Haroma & Partners;
31,000 m² gross; 7 storeys + rooftop technical storey.

#### 3.1.1 Massing (B frame; heights from LOD2 + 2021 laser) [V], storey levels [E]
Laser/LOD2 overturn two earlier estimates: the street facades top out at **y 26.8** (ref-biocity photo estimate ≈27 m
was right for the facades), and there **is a 4.5 m rooftop technical storey + barrel vault** above them (the "31 m"
figures were this, not the facade).

| Volume | B-frame extent | y bottom → top | Notes |
|---|---|---|---|
| Main 7-storey block | CAD envelope (`interiors.json biocity.outline`) ≈ OSM mainVolume (3731 m²) | 0.06 → **26.15** roof (LOD2 49.35/49.56/49.30) | parapet / glass-crown top **26.8** on the SW, NW and SE facades (laser 50.0) |
| Rooftop technical storey, NE bar | x −40.3…+30.0, z −31.5…−4.5, minus notch x<−30.6 & z>−8.3 | 26.15 → **30.68** (LOD2 53.88), parapet 30.95 | flush with the NE (courtyard) facade (0–1 m, §11.5); none over the N-corner block (B x < −40.3) |
| Technical storey, SW bar | x −24.6…+23.6, z +6.1…+15.1 (notch x −24.6…−21.6 for z < 11.0) | 26.15 → **30.68** | set back ≈2.3 m from the SW facade (z 17.4); ends ≈5–6 m short of the glass-tower roof (x −29.9) and of the E-end block (x 29.5) |
| Atrium barrel vault | x −29.8…+29.5, z −4.6…+6.3 (span 10.9 m, crown line z ≈ +0.5) | eaves **30.64** (53.84) → crown **33.87** (57.07) | segmental: slopes 55°/44°/33°/18°/6° (LOD2 strips at z −4.6/−4.3/−3.7/−2.3/−0.9 and mirror) |
| Penthouse 1 / 2 | x −22.3…−17.8, z −27.0…−21.7 / x 19.4…23.9, z −26.9…−21.5 | → 33.76 / 33.71 | light grey |
| Rooftop units | DSM boxes: x −38…−22, z −30…−24; x 19…24, z −27…−22; pairs at x −15…−12 & 6…10, z −11…−10 | → 32.5–33.9 | grey fan banks; low detail |
| N-corner block (no technical storey) | x −55.3…−40.1, z −31.6…−4.6 (+ strip to x −30.6 at z −8.3…−4.5) | → 26.15 | its crown band continues over the recess mouth as a glazed bridge (§5.2) |
| E end strip | x 30.0…36.1, z −31.4…−4.4 (LOD2 49.30); x 29.5…35.8, z 5.6…17.4 (49.56) | → 26.1 / 26.36 | |
| E-end 1-storey connector to Joki | x 29.5…35.8, z −4.4…5.6 | → ≈3.5 (laser 26.7) | atrium end wall above is glazed (y 3.5 → vault) |
| NE 1-storey wing: Presidentti auditorium fan | x −29.1…−11.4, z −48.0…−31.6 (arc centre (−11.31,−29.87), r 17.4/18.3) | → **5.39** (28.59) | curved wall carries the Biodiversiteetti mural (5 × 25 m, Hakanen 2014) |
| NE wing: Aulagalleria + Maunon sali | arc centre (0, −14.4), glass r 19.82–20.56; Maunon sali to (25.3, −39.9) | → **4.57** (27.77) | roof decks/planters/skylight with PV on top |
| Event-entrance vestibule | x −1.75…+1.80, z −36.1…−34.55 | → **3.14** (26.34) | glazed box on the gallery arc |
| SW facade slots (2) | x −24.0…−18.9 and 17.6…22.9, z 15.0…17.4 | low roofs 3.13 / 1.85, open above | recessed full-height glazed slots |

Storey levels [E fitted under the LOD2 roof; ±0.3 m]: GF 0.06 · F2 4.20 · F3 7.85 · F4 11.50 · F5 15.15 · F6 18.80 ·
F7 22.45 · roof structure 26.10 · membrane 26.15–26.36 · parapet 26.8. Arcade soffit ≈3.2–3.7 (photo: ≈3.1 m clear).
Basement: parking levels −1/−2 [V] (not modelled).

#### 3.1.2 Facade system [V photos Haroma 2020 / TTK / Commons 2022; sizes M/E]
- **Black panel facades (SW, NW N-block, NE, SE):** flat satin dark-charcoal panels on ≈3.6 m modules (one storey),
  `#2B2A2E` (sunlit #27262B–#3C3C40, overcast #323030). F2–F6 **ribbon windows** in groups of 1.2 m units, 1.3–1.5 m
  tall, sill +0.9 m above floor → ribbons at y 5.1–6.5 / 8.75–10.15 / 12.4–13.8 / 16.05–17.45 / 19.7–21.1; black frames
  `#1E1E22`; a **0.6 m black blade louvre** over every ribbon. Implement as one facade-shader style "ribbon" (DESIGN §4).
- **Glass crown band (F7, y 22.45–26.8)** on SW, NW and SE: continuous curtain wall, 1.2 m modules, 3 pane rows,
  dark mullions; it **bridges the entrance recess** (§5.2). On the NE facade the top storey reads as ordinary ribbons
  plus a glass box at the E corner.
- **Glass corner tower (W corner):** OSM part w1328195311 polygon (−32.6,1.7)…(−40.6,−5.4)…(−35.5,−13.6)…(−28.7,−9.0);
  full curtain wall y ≈5.8 → 26.8, 1.2 m columns, 3 rows/storey (≈1.05/1.3/1.4 m), reflective blue-grey glass base
  `#2F3D4A`, dark mullions. **Open ground floor (pilotis)** under it, ≈6 m clear at the corner [M Haroma photo 08]:
  round black columns Ø0.6 at (−39.62,−4.86), (−37.74,−2.15) and at the recess corner ≈(−35.0,−12.9) [E], black tile
  back wall `#222527` with small "BIOCITY / Mauno Koivisto -keskus" lettering, soffit downlights.
- **Arcades:** SW (Lemminkäisenkatu) arcade ≈2.5 m deep (shop facade at B z 14.6–15.1, round black columns Ø0.5 on
  z 17.05 at x = 0.16 + 6k), black steel railing on a beige granite plinth `#A39885` because the street falls away;
  ≈5 steps at the S end next to Joki's portal. NW (N-block) arcade ≈3.0–3.5 m (OSM part w580071163, min_level 1) with
  K-Market shopfronts.
- **N-block Tykistökatu face (≈29.5 m):** black corner band with vertical "BIOCITY" letters (≈7 m), curtain-wall field
  ≈9–10 m wide over F2–F6, black mesh tenant-sign panel ≈7 × 15 m, ≈3 m black margin.
- **Recess side wall (N-block SW face):** white panels `#E8EAED`, 5 ribbons with black louvres.
- **SE end (towards Joki):** black ≈3.6 m square panels, glass field ≈7 modules wide × 5 floors, three-row crown, and
  **three black corrugated duct cylinders Ø≈1.5 m** rising above the roof under a white louvred box (Haroma 09).
- **Technical storey:** light-grey vertical corrugated metal `#C8CCCE` (#D9DEE0 sunlit), roughness 0.5, metalness 0
  (visible above the black facades in the Joki dusk photo and through the recess).
- **Atrium vault:** glass with white steel bars `#E9EBEC` on ≈1.2 × 1.35 m grid; atrium end walls silver-framed glass
  `#A8B0B6` (Tykistökatu gable rises from the recess floor to the vault arch; E gable from y 3.5).
- **Roof:** light-grey membrane `#A8A8A2`, coping `#DADDE0`.

#### 3.1.3 Colours (BioCity) [M photos; ±10–15 %]
Black panels #2B2A2E · frames/louvres/canopy/columns #1E1E22 · glass base #2F3D4A (reads #4677A8 clear sky, #BAC0C9
overcast) · silver frames #A8B0B6 · white recess wall #E8EAED · black tile #222527 · granite plinth #A39885 · paving
#7F7D79 · SCIENCE PARK letters #5FAA4E day / #D2F06A lit · roof membrane #A8A8A2 · coping #DADDE0 · vault bars
#E9EBEC · technical storey #C8CCCE · duct cylinders #1F1F22.

#### 3.1.4 Entrances (local coordinates) 
| Entrance | Position | Facing | Notes |
|---|---|---|---|
| **Tykistökatu "BioCity A" (companies/partners, supercars)** | threshold on lobby glass line **(−24.51, −11.75)** (OSM n11432405620 at (−24.6,−11.3)); revolving drum centre **(−23.4, −10.0)** Ø2.9 m inside an octagonal enclosure 3.45 m | compass **325°** (NW) | level access [V]; flat black canopy B x −31.6…−30.0, z −1.47…2.04 → local corners (−23.78,−14.15) (−22.87,−12.84) (−25.75,−10.83) (−26.66,−12.14), underside ≈2.6, top ≈2.9 [M laser]; green "A" sign + "Turun Tiedepuisto – BioCity A" map board |
| **Event entrance "Sisäänkäynti Jussinaukiolta"** (builders) | vestibule centre **(22.05, −7.54)**, outer double doors centre **(22.69, −8.01)** | compass **55°** (NE) | vestibule 3.55 × 1.55 m, roof y 3.14; faces a timber terrace at y ≈0.25–0.35 with 2 short step flights at (23–27, −8…−5) [V base map; riser count E 1–2] |
| Passage to Joki (indoor) | opening B x 36.66, z −1.08…2.13 → **(13.59, 43.0)**, 3.21 m wide | — | stair B x 33.0–36.41, 10 treads × 0.30, y 0.06 → −1.70 (11 risers × 0.16) |

(OSM n7887550473 at (32.8, 30.7), listed by some researchers as a "BioCity SE-end door", is **Joki's Aula NW door**
(J (−11.1, 27.9)) — §3.2.3; not an event entrance.) Service doors: Mauno kitchen E wall (B x 36.2), Maunon sali
courtyard doors on B z −40.05 at x ≈11.8 and 21.0 (not event entrances).

#### 3.1.5 Entrance recess ("syvänne") — see §5 for the full spec.

#### 3.1.6 Signage [D]
- Rooftop "SCIENCE PARK" (green, ≈1.2 m tall, slim vertical "TURKU" in place of the I) on the glass tower NW edge —
  TTK campus brand (venue owner and Since AI partner): **allowed** as plain extruded text, lit at night.
- "WORLD TRADE CENTER" (white, SW edge), tenant sign panel logos (BIOVIAN, Turku Bioscience, mauno, Kinnarps,
  Euro-BioImaging, K-Market): **do not reproduce** (trademarks) — render the mesh panel blank black with a faint
  emissive texture at night.

### 3.2 Joki — Vierailu- ja innovaatiokeskus Joki (Lemminkäisenkatu 12b; OSM w625297895 + tower part w1244050596)

**Identity [V]:** opened 8 Dec 2017; architect Arosuo Arkkitehdit (Vesa Arosuo); contractor Lundén; structure Sweco;
Pentagon Design = visitor concept/exhibitions/brand only. Showroom LED wall launched 11 Jan 2023. 1755–1979 m².
Form: one-storey low part (Aula, Cave, ramp; its roof is the public walkway) + three-storey round tower at the NE end.
The tower stands free above floor 1 (≈8.7 m from BioCity's NE facade; no bridges).

#### 3.2.1 Levels [V section unless E]
Aula/Cave **−1.70** (21.50) · tower F1 **−1.10** (22.10) · F2 **+2.90** (26.10) · F3 **+6.90** (30.10) · F3 ceiling
+9.90 (33.10) · tower roof membrane +10.90 (34.10, laser) · roof edge/parapet ring **+11.4** (34.6, laser p50) · fin
tops **+11.9 ±0.3** (35.1; laser p95 35.0–35.3, CityGML edge 35.31) [M] · hall roof membrane +2.87 (26.07), hall roof
edge +3.22 (26.42) · walkway ≈+2.85.

#### 3.2.2 Tower (J frame, centre (58.894, 15.934)) [V CAD unless noted]
- **F1 drum:** solid concrete ring r 8.62–9.19, board-formed `#8f8a82`; below deck level and windowless; exposed ≈2.6 m
  above Pihakansi on the W/SW side (y +0.3 → +2.9). Openings: ramp/Showroom entrance at J-bearing ≈173–187° (S);
  top exit at J ≈0° to the external stair going east.
- **F2–F3 curtain wall:** r 9.15–9.23, 64 facets × 0.90 m (5.625°), floor-to-ceiling; mullion caps dark grey `#33373b`
  outside, silver inside; some top-hung vents. Mullions at compass 5.25° + k·5.625° (J −33.53° + k·5.625°).
- **16 black steel columns** Ø0.20–0.21 (`#151a1e`) at r 8.80, J-bearings **33.76° + 22.5°·k**.
- **Fin screen:** ring r **10.07–10.20** (≈0.85 m gap to the glass), polygonal (64 straight 0.99 m panels);
  448 vertical elements = 384 flat fins 90 × 20 mm + 64 posts 120 mm deep (every 7th, on the mullion lines);
  pitch 0.8036° ≈ 0.142 m. Satin silver-white aluminium, base `#dcdfe2` (overcast reads #a5b4be, uplit dusk
  #d5bcaa). Triangulated brackets at the F3 slab and roof. Light F3 slab-edge band visible through the fins at
  y ≈+6.6…+6.9 (29.8–30.1). → **InstancedMesh** (448 instances, one box each; posts deeper).
- **Fin bottom edge:** y ≈ **+3.1** (0.2 m above F2) except two "smile" cut-outs where fins shorten progressively:
  centred over the **F2 NE door (compass 39.3° / J 0.5°)** and around the **SSW door/roof walkway (compass ≈212° ±15°,
  door at 196.8° / J 158°)**, half-width ≈55°, apex y ≈+5.8 (29.0). Profile [E]:
  `y_bottom = 3.1 + 2.7·max(0, cos(90°·Δb/55°))` (Δb = angular distance to the cut-out centre). Ring interrupted at
  the F3 SE door (compass 129.3° / J 90.5°).
- **Fin tops** y ≈ +11.9 — a fine comb ≈0.4–0.5 m above the roof edge ring (+11.4) against the sky.
- **Doors:** F2 NE double door 1.7 m at compass 39.3° (local ≈(64.7, 8.9)), 3–4 galvanised checker-plate steps
  (≈0.6 m) down to the NE deck, stainless rails — **OSM entrance=exit**; F2 SSW door at compass 196.8° (local
  ≈(56.3, 24.7)) level with the roof walkway; F3 SE door at compass 129.3° (local ≈(66.0, 21.7)) to the external stair;
  F1 NE emergency exit (compass ≈40°) via a 1.4 m vestibule and an 11-tread stair down to the service yard;
  amphitheatre service door (compass ≈142°) to the loading dock.
- **External F3 exit stair:** from (66.2, 22.1) [ref-joki +0.6/+0.33 → (66.8, 22.4)] descending along compass 129°,
  1.6 m wide, 0.30 m goings, ≈4 m drop to a landing ≈(72, 26.8) [E], then a short flight to the deck. Solid parapets in
  bolted light silver-grey aluminium panels `#c3c6c8`, galvanised treads, stainless rails.
- **Roof:** flat dark membrane `#8a8d8f`, light coping ring, 2–3 hatches, plant cluster ≈6–8 × 2.5 × 1 m NE of centre.

#### 3.2.3 Low part, street portal, rainbow stair
- **Hall roof polygon** (LOD2, J frame): (14.5,−1.3) (9.4,−1.3) (9.4,1.6) … tower arc … (−2.2,10.2) (−7.6,28.9)
  (−12.5,27.3) (−23.1,62.7) (−14.7,62.7) (−14.5,52.5) (−13.0,49.0) (−11.1,48.9) (−11.1,44.0) (13.9,44.0) (14.2,8.3);
  roof y +3.22 edge / +2.87 membrane, grey, ≈10 small dark roof lights ≈1 m, yellow "SHIFT" letters ≈8.5 m long at
  local x 50–58, z 35–39 (TTK event brand — optional, low priority).
- **Lemminkäisenkatu 12b door** (J (−17.3, 58.8) → local **(8.58, 50.94)**; OSM node (5.3, 53.2) is at the canopy
  front): glass line (5.04,48.11)–(12.35,54.03) facing compass 219.5°, three bays, silver frames, central automatic
  sliding double door, ≈3 m wind lobby. **Canopy:** deep box of bolted white/light-grey aluminium panels (outer
  `#c8cacc`, soffit `#8c8c8e`), ≈9.4 m wide at the glass, 10.7 m at the street edge (1.47,50.46)–(9.79,57.20),
  ≈4 m deep, front ≈4.5–4.9 m high sloping to ≈3 m at the glass, recessed downlights. "JOKI" totem by the door.
  **Event status: cordoned ("Alue rajataan / Ei ulos-/sisäänkäyntiä") [V organiser Joki map].**
- **Rainbow stair ("sateenkaariportaat Jussinaukiolle")** directly SE of the canopy: bottom (8.8, 56.7) → top
  (15.4, 48.0), ≈1.85 m wide, rising NE to the roof walkway. **26 risers faced with coloured tiles, light-grey treads**
  [M photo `ref/joki/img/vkj_Joki-kadulta-kesa.jpg`]; bottom→top: orange, red, violet, blue, green, yellow, repeating
  (bottom riser orange, top riser red). Albedo [M ref-joki]: red `#c0353a`, orange `#d8763a`, yellow `#e0c83c`, green
  (yellow-green) `#8f9f4a`, blue `#2f5db0`, violet `#6b4a8a`. Bolted aluminium parapet walls, stainless rails, small
  wall lights in the parapet.
- **Aula NW doors** (≈(31.3, 33.0)) → external stepped ramp 3.2 m wide, ≈15 deep treads, (33.95,31.37)→(45.08,24.97),
  up to Pihakansi (y +0.3…+0.8, paving + tree planters W of the tower). Not an event entrance.
- Spiral stair to DataCity's 2nd-floor meeting centre "Lähde" at J (−7.6, 47.5) (≈(23.0, 47.9)).

### 3.3 EduCity (Joukahaisenkatu 7; OSM w731925812; LOD2 PRT 103650280D)

**Identity [V]:** Arkkitehtitoimisto Sigge (Pekka Mäki, Johan Roman), interior Leena Arola; client TTK; completed
2020 (LOD2 completion 13 Dec 2018); 28,343 m² gross; LEED Platinum 2021; main user TUAS. Facade brick: handmade
Petersen **Kolumba** 528 × 108 × 37 mm.

#### 3.3.1 Levels — `y = y_E + 3.40` [V section + LOD2]
Street storey (Joukahaisenkatu) y_E −5.0 (y −1.60) · **1F lobby/deck y_E 0 (y +3.40)** · 2F +5.0 (8.40) · 3F +9.0
(12.40) · 4F +13.0 (16.40) · 5F +17.0 (20.40) · 6F +21.0 (24.40) · main roof +25.0 (28.40) · brick parapet NE
**+26.04 (29.44; LOD2 52.64)** · plant-room top **+33.94 (37.34; LOD2 60.54)**. From Joukahaisenkatu the NE facade reads
7 storeys (glazed street storey + 6 brick).

#### 3.3.2 Massing (E frame; LOD2 polygons verified) 
| Volume | E extent | y_E top | Notes |
|---|---|---|---|
| Main block | x 0…51.8, z 0…65.2 (local corners N (217.6,51.2) E (257.9,83.7) S (216.8,134.3) W (176.5,101.9)) | see rows | |
| NE roof strip (in front of plant room) | x 0…52, z −0.2…6.4 | +26.04 | brick parapet line |
| **Plant room (U)** | NE bar x 0…52, z 6.4…17.2; NW arm x 0…18.4, z 17.2…49.5; SE arm x 33.7…52, z 17.2…30.5 | **+33.94** | Al-Mg vertical panels ≈1.2 m module, satin silver `#c9d0d2` (#d9e2e3 sun); dark louvre bands `#3a3d40` at ends; part of SE end glazed; PV + AHUs on top |
| **Atrium glass roof** | x 18.4…33.8, z 17.2…49.3 | +28.39 (z 17.2) → +13.22 (z 49.3), 25° | silk-screen fritted glass (white short horizontal dashes), light-grey steel beams, maintenance rail along SE edge |
| NW-wing terraces | x 0…18.3: z 49.4–54.5 / 54.4–59.8 / 59.8–65.3 | +25.1 / +21.1 / +17.1 | |
| SE-wing terraces | x 33.8…51.9: z 30.5–36.7 / 36.7–41.9 / 41.9–49.3 | +25.1 / +21.1 / +17.1 | |
| Terrace R | x 18.3…51.9, z 49.3…54.4 + x 18.3…33.8, z 54.4…65.3 | +13.2 | ≈11 × 9 m sedum square + decking |
| S-corner terrace | x 33.8…51.8, z 54.4…59.7 | +9.1 | |
| 2F terrace (TERASSI) | x 33.7…51.8, z 59.6…65.3 | +5.2 | inside a free-standing brick screen wall with window openings [E] |
| **Entrance pavilion** | x 4.0…48.5, z 65.2…80.2 (CAD annex x 5.4–47.1, z 65.2–80.05; OSM 1–1.8 m wider) | **+5.21** (LOD2 31.81) | 1 storey over the deck; its SW face stands ≈11.9 m above the SW lot (y −3.3 → 8.61); sedum roof, 3 pyramidal skylights (white upstands) at (15,74.4) (25.3,72) (36.6,74.4), bases 3.2/4.4/3.2 m; dark-framed curtain walls under a ≈2.5 m canopy with 1.3 m brushed-aluminium fascia `#aab2bc` |

- **Brick mantle with inclined top** (outer walls continue as screen walls where floors step back) [V SE elevation]:
  `y_E,top = min(25.9, 65.2 − 0.726·z_E − 0.245·x_E)` → flat on NE; SE facade flat to z 36.7 then slopes 36° to +5.2
  at the S corner; SW (above the pavilion) ≈14° from +17.9 (W corner) to +5.2; NW flat to z ≈54 then to +17.9.
- Terraces: light-grey render walls `#c6c9c7`, galvanised bar railings `#9aa0a3` / glass balustrades, pale decking
  `#c9c7c0–#e5e3dc`, red-brown sedum `#85523d–#aa755f`.
- **Glazed link bridges to ICT-City** over the 12 m gateway: plan (188.6,67.5)–(198.1,75.2)–(195.5,78.4)–(186.0,70.8),
  12.2 × 4.2 m at z_E 30.8–35. Lower at 1F (floor y 3.4, roof ≈7.4, underside ≈2.6 → ≈4 m clearance over the
  passage, OSM maxheight 4); upper at **4F per architect plan (floor y 16.4)** [D] (OSM says level 3). Glass tint per
  OSM blue (lower) / red (upper) — unverified, use neutral glass with a faint tint.

#### 3.3.3 Facades
- **Brick:** long, low Kolumba units, 50 mm courses, dark grey-brown mix; perceived average `#5f5854` overcast /
  `#6a6564` sun; darks `#3e3633–#4a3f3c`; light speckles `#9f9693–#cbc1ba`; dark-grey mortar; night under street
  light `#3c3429`. Vertical movement joints on the NE facade at x_E ≈11.5, 21.2, 38.3.
- **Windows (scatter style):** square, irregular per storey; outer sizes S 1.1–1.3 m (≈50 %), M 2.1–2.3 m (≈33 %),
  L 2.8–3.1 m (≈15 %, rare 3.7); ≈11 per storey on the NE facade; frames black-bronze `#1c1716`, 70 mm sightline,
  0.10–0.15 m reveal, no mullions; glazing ratio 18–24 %. Position lists: `educity_massing.json`
  (SE from the architect elevation; NE 46/65 auto-detected ±1 m).
- **NE street storey:** storefront glazing x_E ≈1–45, ≈3 m tall, grey-panel section x_E 31–39, white "EduCity"
  letters (≈2 m) near the N corner. Sidewalk at z_E ≈−1.5, deciduous tree row z_E ≈−3.7, cycleway z_E ≈−6.3.

#### 3.3.4 Entrances (local) 
| Door | Position | Level | Event role |
|---|---|---|---|
| **West main entrance** (pavilion NW end, revolving) | **(177.8, 115.1)** [CAD ±3 m]; OSM deck door n648173656 (176.1, 108.8) | y 3.40 | builders arriving along the Ströget; transfer start to BioCity |
| **East main entrance** (pavilion SE end) | **(204.0, 136.5)** (photo shows an automatic sliding double door at the SE face) | y 3.40 | builders from the station/ParkCity via the Main Stairs → registration |
| **Door "B"** (SE facade, recessed brick portal with lift/stair core; "B" sign per ref-educity — the organiser map only says "YRITYS → 1002") | **(237.3, 109.0)** (OSM n7884070178; CAD (51.8, 32.7)_E) | y 3.40 | **challenge-partner arrivals → room 1002** |
| ICT-City gateway door (street level, lifts) | (196.9, 76.8) (OSM n11167040749) | y −1.55 | **step-free entrance** [V TUAS] |
| Main Stairs (outdoor) | foot (260.9, 85.1) y −1.8 → top (251.3, 96.8) y +3.4; ≈15 m long, ≈6 m wide, ≈30 precast steps, sawtooth brick plinth with step lights | — | from Joukahaisenkatu to the SE walkway (x_E 51.8–59.5) |

### 3.4 Context buildings
**Method [D]:** for every `turku/heights.json buildings_all[]` record not claimed by a hero module, extrude each
`roof_levels[].polygons_local` from `ground_n2000.min − 23.20 − 0.3` up to `z_n2000 − 23.20` (sloped parts: build the
plane through zmin→zmax). Skip in the DataCity record (PRT 103454371S) the Joki polygons (z 35.31 centroid (59.0,16.2)
and z 26.42 centroid (44.2,32.9)). Facades via the facade shader styles below. Buildings without LOD2: ParkCity (LOD1
**57.91 → y 34.7**), CivilCity (LOD2 60.7), Station North/East (OSM footprint, 12 levels × 3.3 m [E]).

| Building | Height (y of main / max roof) | Facade & colour [M/E] |
|---|---|---|
| Electrocity (Tykistökatu 4) | 28.95 / 35.7 (52.15 / 58.91) | white metal panels `#E6E7E4`, vertical blue "ELECTROCITY" letters; magenta `#B0307A`, violet `#6B3F8F` and green `#7DB33A` horizontal stripe bands on parts (3D-tiles texture, Joki night photo); blue glass |
| Eurocity (Joukahaisenkatu 1) | 29.1 / 32.3 (sloped glazed parts 49.8–55.5) | white/light-grey metal `#D8DCDF`, blue-tinted glass, round glass tower element; level-1 skybridge over Joukahaisenkatu |
| ICT-City (Joukahaisenkatu 3) | 29.0 / 29.0; stepped 23.2 / 15.5 / 7.1 | silver-grey corrugated/flat metal `#B8BEC2` + oxblood red metal-clad volumes `#7A2E26`, tall glazed shafts; NW canopy doors at (86.8,−7.9) (92.1,−14.2) |
| DataCity (Lemminkäisenkatu 14) | 22.0–23.3 / 28.8 | red-brown brick `#8a4b3c` (dark `#7d3227`), 1988 Casagrande & Haroma; dark plant volume with steel duct pipes facing Joki |
| Pharmacity | 26.5 / 33.7 | light panels + glazing (low detail) |
| ParkCity (Joukahaisenkatu 8, 2023) | 34.7 (LOD1) | "barcode" of vertical tubular fins: white `#f8f8f5`, light grey `#cfcfce`, sky blue `#5ea0d4`, royal blue `#1e306f`, orange `#d58e1e` on grey concrete; open GF colonnade |
| CivilCity | 37.5 | salmon concrete panels |
| Intelligate I+II, Neo hospital, Joukahaisenkatu 9, Dentalia, Teutori, housing S of Lemminkäisenkatu | per LOD2 | generic grid / ribbon styles, light colours |
| Kupittaa station building (w81894007) | 2 storeys over the tracks at (190–219, −143…−117) | white metal, glazing |

---

## 4. Streets, landscape, furniture

### 4.1 Tykistökatu (secondary, 40 km/h) [V street register 2021, aerial 2025]
- Axis bearing ≈ 34° (213.9°). **Use kerb lines, not the OSM centreline** (OSM centreline sits 2.8–6.4 m from the
  BioCity-side kerb). In the NW-facade frame (origin W corner (−40.6,−5.4), s along the facade towards the N corner,
  d<0 = towards the street): near (SE) kerb at **d −3.7…−6.2**, far kerb at d −16.7…−18.2.
- Cross-section at BioCity mid (−32,−45), NW→SE: slab footway 1.9 · asphalt cycle path 1.8 · paver strip 1.0 (lamp
  poles) · **carriageway 12.9** · paver strip 0.6 · **two-way asphalt cycle path 2.5** · slab footway 0.7 · BioCity
  facade/arcade. At the recess (−44,−27): 2.9 · 2.6 · 2.6 · 13.1 · 1.65 · 2.4 · 0.4 · forecourt. At the yard mouth
  (−6,−60): carriageway 10.9 (3 lanes). At Electrocity: ≈10 m.
- Lanes: along BioCity **4 (2+2), double solid centre line**, no median, no lay-by; SW-bound pair (NW side) approaching
  the junction = left | through+right arrows. 3 lanes (1 SW + 2 NE) from the yard mouth to Electrocity; 6 lanes
  (18.1 m) at the Joukahaisenkatu junction. NE-bound traffic (BioCity side) leaves the junction past the recess.
- Markings (Traficom, all white since 2020): lane line 0.10 m, dashes 1 m / gap 3 m (≤50 km/h); solid lines 0.10 m;
  stop line 0.3–0.5 m; zebra bars 0.5 m with 0.5 m gaps, ≥2.5 m long, parallel to traffic; cycle-crossing 0.5 m
  squares; give-way triangles 0.5 × 0.6 m. Draw as geometry with polygonOffset; `road_marking_paint` only as wear mask.
- **Signalised zebra with refuge island at the BioCity W corner (−44,−21)** (OSM landing (−38.6,−13.0)); next
  crossing 135 m NE at the Joukahaisenkatu junction (30,−135)/(37,−125). Signals at (−61,−23) and (−46,0).
- Signs: C38 no-parking at the recess (−38,−18) (brief stops allowed — no lay-by) and at the yard mouth (−11,−57)
  with a station direction sign; two-way cycle-path plates (H23.2) at the junction.
- Lamp poles [V positions, E form]: ≈10 m galvanised masts, single 1–1.5 m arm, flat LED head, ≈3000 K; SE side
  (−36.1,−12.9) (at the recess corner), (−11.0,−56.6), (12.3,−87.4); NW side (−47.0,−31.5), (−24.5,−64.7),
  (−4.3,−97.7); ≈39 m spacing, 1–2 m behind kerbs. Full list: `street/...light_poles` (186).
- No street trees on the BioCity/Electrocity side. NW side (Dentalia lot): 7–9 large deciduous trees, crown r 5.5–8 m at
  (−23.8,−76.6) (−29.1,−72.9) (−34.6,−69.1) (−43.5,−102) (−51.3,−41.4) (−54.5,−46.4) (−59,−52.7) + lawn.

### 4.2 Other streets [V]
- **Lemminkäisenkatu** (collector, 40/50 km/h): at BioCity SW (−20,40): Pharmacity · slab 2.2 · asphalt 2.0 · strip
  1.0 · carriageway 11.2 · slab 1.8 (BioCity arcade) — 18.2 m facade to facade. At DataCity stop (45,102): 1.9 · 3.0 ·
  11.0 (stop bays + parallel parking) · 1.85. North of the junction: **red iron-oxide asphalt cycle lane 2.55 m**
  (weathered grey-brown) + granite sett strip 1.4. Zebras (0,65), (45,102). Paid parking machines (−5.5,48), (54.5,100).
- **Joukahaisenkatu** (30 km/h): at Eurocity 8.1 + 3.9 paver median + 7.1; at ParkCity carriageway 13.3–13.4, 2.2 m bus
  platform (2025, unused by Föli on 6 Nov 2026), ICT-City side asphalt path 3.2. Zebras with islands (117,−49) and
  **(236,47) ParkCity ↔ EduCity**. EduCity gravel guest field (260–312, 17–79). Construction section (273–322, 79–119)
  [V OSM 2026-07].
- Materials (street register → texture): Ajorata asphalt → `asphalt_road_wet`; Jalkakäytävä concrete slab →
  `pavers_concrete_slab` scaled to **0.4 m slabs (tile 1.2 m)**; Yhdistetty kevyen liikenteen väylä asphalt →
  `asphalt_footway` (slab variant → slabs); Välikaista betonikivi/kenttäkivi/noppakivi → `pavers_granite_setts` tinted
  grey; Pyöräkaista red AB16 → asphalt tinted `#6e4a42`; Tonttiliittymä → asphalt; Silta → asphalt/concrete/timber.

### 4.3 Jussin aukio & courtyard (TTK private land) [V aerial/photo unless E]
- Lower plaza grey concrete; upper plaza **light beige concrete pavers ≈40 × 40 cm, straight grid** `#d2c7bd`; dark
  walkway pavers `#5d5c5e`; metal-clad low walls with white coping; black bollard lights ≈0.8 m on the NE deck;
  pole-top lanterns ≈4 m, warm.
- **Timber terrace** with curved planters between BioCity's NE wing and the tower, ≈(20–49, −24…22), y ≈+0.25…+0.4
  (DTM), weathered boards ≈`#8a7560` [E]; planters with low shrubs/grasses (2025 aerial).
- Two small trees at (45.5,11.1) and (42.3,19.1); green steel bike racks along Electrocity's SE facade; Meanderi
  bike-rack sculpture (galvanised, Pulkkinen & Rautiainen 2020) at **(165.0,106.5)** by EduCity's west entrance.
- OSM records no benches on the aukio; Vestre "Bloc" benches at Lenkkipolku (−38…−67, 82…100).

### 4.4 BioCity–Electrocity yard (overflow display area, not the syvänne)
Mouth 24.5 m between BioCity N corner (−12.7,−51.0) and Electrocity W corner (0.4,−71.8); ≈29–31 m deep; polygon
`campus.json syvanneCandidates[0]`; asphalt + small grey pavers, y +0.1…+0.2; contents: green bike racks + roofed
shelter (−3…5, −56…−45), e-scooter bay "Biocity" 10 places (−7,−49), waste/recycling containers (0…10, −49…−34),
Electrocity steps/ramp (13–21, −46…−35) = Tykistökatu 4 B entrance. Business Turku tells visitors to enter "from the
courtyard between ElectroCity and BioCity". No registered vehicle access across the cycle path.

### 4.5 Station, Kalevansilta, ParkCity, buses [V]
- **Kupittaa station:** island platform ≈416 × 8–9 m at bearing ≈145° in a cutting; canopy on **rust-red steel
  columns** with light soffit; warm-grey concrete pavers with darker edge band; green-glass shelters; navy VR name
  signs. Station building on a bridge over the tracks (190–219, −143…−117); escalators (202,−137)→(190,−154) and
  (219,−112)→(211,−125); lifts (162,−196), (206,−131). Waiting room Mon–Fri 05:00–23:15.
- **Kalevansilta:** covered footbridge (2005, 85 m) — white steel Warren side trusses with glazed sides, a light ribbed metal roof and a timber deck (KartaView photos, 2022/2025 orthophotos; round-2 correction — not a timber bridge); covered stair down to the platform, open steel street stair with pram channels; 2021 DSM roof 7.5 (ParkCity end) → 8.9 mid-span, so the deck runs ≈3.4 → 4.6 (modelled flat at 4.3) (264,−15)→(334,−65) from the platform's SE end (stairs
  at (265.5,−43.9)) to ParkCity (bridge door (256.3,−15.7)) and Itäharju; deck ≈y +4.3 [E], roof y ≈8 (laser 31.0–31.5).
- **ParkCity** (Aimo, opened 19 Jan 2023, Schauman Arkkitehdit/YIT): 10 floors, 990 places, clearance 2.2 m, guests on
  floors 1–3 (€1.60/30 min, €15/24 h), entry 06–24, exit 24/7. Vehicle portals (201,−32) [driveway from (169,−8)] and
  (245,6) [from (228,40)]; pedestrian doors SW (198.5,−7.4) and (215.5,6.2).
- Trains Fri 6 Nov: Helsinki dep hh:35 → Kupittaa arr hh:33 (e.g. IC 953 12:35→**14:33**, S 955 13:35→**15:33**).
  Sun 8 Nov to Helsinki 13:40, 15:40, 16:40, 17:40.
- Föli (Fri 6 Nov): Kupittaan asema 870 (104.8,−161.1) / 846 (71.4,−179.5) lines 3/3A every 10 min each (city centre
  8 min); Datacity 1046 (39,88) / 1032 (50,116) ring 10/10A every 15 min + 27/27A; lines 10/10A/39 pass BioCity
  without stopping (≈14 buses/h/direction 15–17 h). Buses yellow `#F2C200` with black window band.
- Taxi: only the station stand (forecourt lot x 80–170, z −170…−115).

### 4.6 Trees & vegetation, early November [E phenology]
Deciduous trees bare or nearly bare (a few yellow leaves on limes/birches/whitebeams; oaks keep brown leaves);
leaf litter on grass and kerbs (`leaves_scattered_ground` decals); lawns green-brown (`grass_autumn` × `grass_worn`).
Register trees: station stops 5 *Tilia platyphyllos 'Fastigiata'* + 1 *Acer platanoides 'PARAD'* (2025, 5–7 m);
Lenkkipolku 11 *Sorbus aria 'Gigantea'* (crown 4–6 m) + 1 *Quercus rubra*; common nearby: limes, wych elms, silver
birches. Use procedural trees (`@dgreenheck/ez-tree`) with leafless crowns; Quaternius trees are placeholders only.

---

## 5. The syvänne + supercar display

### 5.1 Resolution [V]
**The "syvänne" is the open-to-sky Tykistökatu entrance recess of BioCity** (between the glass corner tower and the
N block), not a terrain dip and not the Electrocity yard:
1. The organiser's annotated TTK plan (`pack/…/10_RAW_USER_UPLOADS/BioCity.png`, 4.6.2026 base) has **two red "Auto"
   labels inside this recess**, left of "SISÄÄNKÄYNTI TYKISTÖKADULTA"; label 2 is drawn rotated along the recess's S
   edge. (The geo and streetscape researchers, who ranked the BioCity–Electrocity yard first, did not use this file.)
2. Owner (4 Oct): "next to Tykistökatu is the BioCity entrance where the companies come in … by the road, in the
   syvänne next to BioCity, a few supercars".
3. Terrain: recess floor 23.10–23.20 (y −0.10…0.00), flush with the sidewalk — "syvänne" = recess in plan.
The yard (§4.4) is an **overflow option only** if the owner wants more than 3 cars.

### 5.2 Recess geometry (B frame → local)
- Floor polygon (CAD): B (−42.8,−4.6) (−30.05,−4.9) (−30.05,5.6) (−30.6,5.6) (−37.5,8.3) → **local (−27.62,−25.13)
  (−20.08,−14.84) (−28.70,−8.84) (−29.01,−9.29) (−35.17,−13.41)**; ≈121–131 m²; mouth 14.0–14.4 m on the street
  line; depth 12.75 m on the NE side, ≈7–9 m on the SW side. Paving light-grey slabs `#7F7D79`; white bicycle
  symbols on the adjacent two-way cycle path.
- Walls: NE = white N-block side wall (§3.1.2); back (SE) = full-height silver-framed atrium gable with the canopy +
  revolving door; SW = glass-tower pilotis edge (open, black columns) — the recess connects to the ≈68 m² pilotis
  (B x −34…−29.7, z 5.4…17.4 + triangle to the NW facade line).
- **Overhead:** the F7 glass crown band spans the mouth as a ≈1.3 m-deep glazed bridge, underside y ≈22.4, top 26.8
  [V photos + laser line at 50.0]; otherwise open to the sky up to the technical storey and vault behind.
- **Flagpoles:** five round elements at 2 m spacing ≈0.6 m inside the mouth, B (−38.58,5.46) (−39.39,3.63)
  (−40.19,1.80) (−40.99,−0.04) (−41.79,−1.87) → local (−33.46,−15.92) (−32.42,−17.63) (−31.37,−19.33) (−30.33,−21.04)
  (−29.28,−22.74) [M 2025 aerial]; photos show **three thin white flagpoles ≈10 m** [E] → model poles at elements 1, 3, 5
  and flush sockets at 2, 4 (verify on site). Event option [D-owner]: Since AI flags.
- Lamp pole (−36.1,−12.9) at the recess's SW street corner; signal pole + blue cycle-path sign at the corner;
  no-parking sign (−38,−18); "Turun Tiedepuisto – BioCity A" map board on the black tile wall.
- Vehicle access (unverified): no dropped kerb registered; cars must cross kerb + 0.6 m strip + 2.5 m two-way cycle
  path + 0.7 m footway and pass the pole row through the ≈2.9–3.1 m gaps at either end. Not modelled; cars are
  static.

### 5.3 Car placement [D, from the organiser's "Auto" labels; clear of the door corridor and poles]
Door corridor kept free: B z −1.25…+2.25 from the mouth to the canopy (≥3.5 m; actual clear 5.7 m between cars at the
door). Cars ≥0.5 m from walls/edges, ≥1.4 m from flagpoles.

| Car | Centre local (x, z), y 0.0 | Heading (compass) | `rotation.y` (front −z) / (front +x) | Footprint corners local | Basis |
|---|---|---|---|---|---|
| **A — Mercedes-Benz G-Class (black)**, NE bay | **(−25.67, −19.54)** (B (−37.1,−3.0)) | **325.1°** (nose to Tykistökatu) | **0.609** / 2.179 rad | (−26.25,−22.10) (−27.88,−20.97) (−25.09,−16.97) (−23.47,−18.11) | "Auto 1" label (Δ 1.4 m), long axis ∥ NE wall |
| **B — second supercar**, SW bay | **(−31.19, −12.52)** (B (−34.49,5.54)) | **303.7°** (∥ recess S edge, nose to the junction) | **0.982** / 2.553 rad | (−32.66,−14.69) (−33.76,−13.04) (−29.71,−10.34) (−28.61,−11.99) | "Auto 2" label (Δ 0.9 m), drawn rotated along the S edge |
| C — optional third car under the glass-tower pilotis | (−35.00, −7.56) (B (−32.6,11.5)) | 235.1° (nose to the W corner) | 2.179 / 3.750 rad | (−37.56,−6.98) (−36.43,−5.35) (−32.43,−8.14) (−33.57,−9.76) | not in the organiser plan — only if the owner confirms; check columns (≥0.5 m) |

Footprints use 4.87 × 1.98 m (G-Class incl. spare wheel, mirrors folded). Overflow: up to 4 more in the yard (§4.4)
on a 3.0 × 6.0 m grid, nose to Tykistökatu, after removing containers (owner decision).

### 5.4 G-Class procedural model [V dimensions carexpert.com.au 2025 model; D styling]
No CC0 G-Class exists → build procedurally, **no badges, no three-pointed star, no "G" emblems**.
- Body length 4.606 m (4.82–4.87 incl. tailgate spare wheel [E]), width 1.931 m (2.187 with mirrors), height 1.969 m,
  wheelbase 2.890 m, track 1.637/1.638 m, ground clearance 0.241 m, kerb weight 2,555 kg.
- Signature shape cues: slab sides, near-vertical flat windscreen (≈10° rake), flat roof, round headlights with LED
  ring, indicator pods on the bonnet edges, exposed door hinges, protective side strips, flat bonnet, external
  spare wheel with cover on the side-hinged tailgate, boxy flared arches, 20–22" multi-spoke wheels (tyres
  275/50 R20 [E]), rectangular side-exit exhaust pipes ahead of the rear wheels (AMG look, optional).
- Materials: `carPaintBlack` = MeshPhysicalMaterial base `#0b0c0e`, metalness 0.6, roughness 0.35, clearcoat 1.0,
  clearcoatRoughness 0.04 (obsidian metallic); chrome trim; `carGlass` `#0e1216` roughness 0.02, tinted rear; black
  plastic `#151617`; tyre rubber `#1a1a1a` r 0.9; brake calipers grey.
- Car B: generic low two-door sports coupé (≈4.5 × 1.95 × 1.25 m), silver `#b8bcc0` or white `#f2f2f0`, no badges;
  `car_sports_quaternius.glb` is a stylised placeholder only (owner to name the models).

### 5.5 Display dressing & light [D]
Day: cars clean, glossy, with subtle reflections of the white recess wall and atrium gable. Dusk/night: event uplights
wash the white N-block wall (3000 K) [D]; two event spot lights per car (4000 K, ≈30° cone) from the canopy/bridge
soffit; violet event accent `#8b7bff` only as a thin line light on the ground at the recess mouth or on totems (DESIGN
§1). Target id: `supercars`; view "biocity:supercars" from the opposite (NW) sidewalk: camera (−49.0, 1.65, −28.1),
target (−27.5, 1.0, −16.5) — shows the cars, the flagpoles, the glass tower and the bridge band in one frame.

---

## 6. Arrival routes

### 6.1 Who comes in where [V guide + owner + organiser maps]
| Audience | When | Arrives via | Enters |
|---|---|---|---|
| Builders | Fri 15:00 registration, opening 17:00 | train (Kupittaa), bus 3/3A (Kupittaan asema), on foot | **EduCity east or west main entrance** (pavilion, deck level) → registration (east side) |
| Challenge partners (companies) | Fri 15:30 arrival, briefings 18:30–19:30 | car (ParkCity), train | **EduCity door B** (SE facade) → room 1002 ("YRITYS → 1002") |
| Builders transfer | Fri ≈19:30 → build start | walk | EduCity west main entrance → Ströget deck → Jussin aukio → **BioCity event entrance** (courtyard) |
| Companies / challenge & visibility partners | Fri 18:00 stand set-up, Sat 09–18 Q&A | car drop-off, ParkCity, train | **BioCity Tykistökatu entrance** (recess with supercars) → lobby → Joki passage → Showroom / tower |
| Everyone | Sun 13:00 closing | walk | BioCity → EduCity (reverse transfer) |
| Step-free | any | — | EduCity via the ICT-City gateway lifts; BioCity Tykistökatu entrance (level); Joki only through BioCity's passage (**stairs, no ramp on the plan** — accessibility gap, see §11) |

### 6.2 Tours (in `spec_routes.json`; legs = outdoor 2D polylines `yMode: snap` + interior 3D `yMode: explicit`)
Times = length / 1.3 m/s, no stair/traffic-light penalty. Mapping to DESIGN §10: `out-*` legs → `CAMPUS.routes`
(V2[], generated into `engine/data/campus.ts`); `int-bio-*` → `buildings/biocity.ts routeLegs`, `int-joki-*` →
`buildings/joki.ts`, `int-edu-*` → `buildings/educity.ts` (V3[]); `tours[]` → `lib/hackathon-2026/twin.ts TOURS_3D`
(`to` = target id; `reverse: true` = play legs backwards).

| Tour id | Legs | Length | Time | Steps on route |
|---|---|---|---|---|
| `builders-train-checkin` | out-arr-train-edu-east + int-edu-east-to-registration | 391 m | 5.0 min | platform SE-end stairs up to Kalevansilta and down; Main Stairs ≈30 steps |
| `builders-station-hall-checkin` (alt., bus/hall) | out-arr-stdoor-edu-east + int-edu-east-to-registration | 564 m | 7.2 min | Main Stairs |
| `partners-fri-parkcity-edu` | out-arr-parkcity-edu-b + int-edu-doorB-to-1002 | 192 m | 2.5 min | Main Stairs |
| `partners-fri-stepfree-edu` | out-b-sw2-gw (ParkCity → gateway lifts) | 115 m | 1.5 min | none |
| `builders-transfer-to-build` | out-xfer-edu-west-bio-event + int-bio-event-to-lobby | 264 m (208 outdoor) | 3.4 min | Jussin aukio main stair ≈10 down; terrace steps 1–2 |
| `builders-build-to-joki` | int-bio-tyk-to-joki + int-joki-aula-to-showroom | 123 m | 1.6 min | passage stair 10 treads down; ramp +0.6 m |
| `companies-tykistokatu-to-showroom` | out-co-kerb-bio-main + int-bio-tyk-to-joki + int-joki-aula-to-showroom | 139 m | 1.8 min | passage stair |
| `companies-parkcity-to-biocity` | out-co-parkcity-bio-main + int-bio-tyk-to-joki | 426 m | 5.5 min | passage stair |
| `companies-train-to-biocity` | out-co-stdoor-bio-main + int-bio-tyk-to-joki | 362 m | 4.6 min | passage stair |
| `builders-back-to-educity` | reverse of transfer | 264 m | 3.4 min | |

Other legs available (all in `spec_routes.json legs`): `out-c-deck` 201.4 m (OSM deck node → BioCity courtyard,
geo), `out-e-sw1` 357.6, `out-x-st-bio` 293.4, `out-d` 15.7, `out-f-yard-tower` 51.5, `out-a2-gw` 276.6 (platform →
gateway, step-free except platform stairs), `out-b-sw2-gw` 114.7, `out-arr-train-edu-west` 421.7,
`out-arr-bus870-edu-east` 440.7, `out-arr-parkcity-edu-east` 200.6, `out-arr-train-edu-b` 298.3,
`out-xfer-edu-east-bio-event` 270.9, `out-co-train-bio-main` 397.8, `out-co-bus-datacity-joki` 53.9,
`int-edu-west-to-taidon` 37.1. The geo researcher's full set of 40 routes stays in `campus.json routes`.

### 6.3 Key leg geometry (local; full polylines in the JSON)
- `out-co-kerb-bio-main` (15.7 m): kerb (−35.6,−22.0) → (−33.7,−20.8) → threshold (−24.6,−11.3). Drop-off is in
  the NE-bound lane right after the junction; passengers cross the two-way cycle path.
- `int-bio-tyk-to-joki` (68.1 m): (−24.51, 0.06, −11.75) → drum (−23.40, 0.06, −10.01) → lobby walkway
  (−21.13, 0.06, −8.56) → (10.02, 0.06, 36.16) → (9.69, 0.06, 37.36) → stair top (11.52, 0.06, 39.98) → stair foot
  (13.47, −1.70, 42.78) → Joki Aula (14.04, −1.70, 43.59).
- `int-joki-aula-to-showroom` (55.2 m): (14.04,−1.70,43.59) → (20.81,−1.70,41.78) → (25.49,−1.70,42.33) →
  (31.74,−1.70,40.94) → (39.64,−1.70,35.10) → ramp foot (46.84,−1.70,29.34) → (51.18,−1.35,25.77) → ramp top / drum
  opening (53.62,−1.10,22.73) → (54.75,−1.10,20.30) → Showroom centre (55.54,−1.10,14.52).
- `int-bio-event-to-lobby` (55.9 m): vestibule (22.05,0.06,−7.54) → (19.99,−6.13) → (19.57,−2.18) → (23.08,3.91) →
  (24.62,8.92) → (26.14,14.08) → east ring corridor (20.86,17.52) → (14.29,22.09) → lobby (4.82,28.69) → (1.44,23.85),
  all y 0.06. Wall-checked against the CAD walls (no intersections, ≥0.3 m clearance).
- `out-xfer-edu-west-bio-event` (208.3 m): (177.8,115.1) → deck door (176.1,108.8) → Ströget (95.9,37.7) →
  (62.9,3.9) top of the main stair → (59.5,3.0) → (56.1,3.5) → (53.3,4.6) → (50.0,7.0) → (43.6,−2.2) → terrace →
  (22.1,−7.5).
- `out-arr-train-edu-east` (343.9 m): platform (218.9,−111.5) → SE end (265.7,−47.9) → stairs (265.5,−43.9) →
  Kalevansilta (278.5,−25.2) → (264.3,−15.1) → down past ParkCity (274.9,1.1) → (260.2,17.1) → zebra (238.9,43.8)
  → NE sidewalk (227.2,57.2) → (261.5,84.5) → Main Stairs (260.7,85.3)→(251.2,97.0) → SE walkway → (219.6,137.9) →
  east main entrance (204.0,136.5).
- EduCity interior legs (frame E, ±1 m, y 3.40) built from the Since AI flow map: registration at **(212.1, 116.4)**,
  team-formation area (1F north aula) **(219.3, 96.5)**, snack point ≈(13–17, 48–51)_E.

### 6.4 Answers for the guide / tour captions [V route data]
- Station → EduCity: ≈350 m / 5 min via the covered footbridge (Kalevansilta) and the wide outdoor stairs at
  EduCity's east corner; via the station hall street door ≈520 m / 7 min.
- ParkCity → EduCity door B ≈155 m / 2 min; → step-free gateway ≈115 m / 1.5 min.
- **EduCity → BioCity event entrance ≈200–210 m / ≈3 min outdoors** (raised deck + ≈10-step stair down at Jussin
  aukio); → Joki through BioCity +70 m indoors (+1 min).
- Tykistökatu kerb → BioCity entrance 16 m; ParkCity → BioCity entrance ≈360 m / 4.6 min; station → BioCity ≈290 m /
  3.8 min; Datacity bus stop → Joki street door 54 m (door closed during the event).

---

## 7. Interiors (walk levels, dimensions, placements)

### 7.0 Walk levels (`LevelId` → floor y) [V/E as noted]
| LevelId | y | Notes |
|---|---|---|
| outdoor | terrain/decks | snap to surfaces |
| biocity-1 | **0.06** | ceiling of side bays ≈3.5 [E]; atrium open to the vault (33.87) |
| joki-1 | Aula/Cave **−1.70**; tower F1 **−1.10** | ramp between (walk area with `slope`) |
| joki-2 | **+2.90** | clear ≈3.5 [M] |
| joki-3 | **+6.90** | clear 3.0 [V] |
| educity-1 | **+3.40** | |
| educity-2 | **+8.40** | |

Connectors: BioCity passage stair (B x 33.0→36.41, z −1.25…1.95), Joki tower stair (J x −0.40…1.30, z 1.6 → −6.1,
rising north, ≈25 risers × 0.16 = 4.0 m; stacked for F2→F3), Joki lift (J x 1.6…3.4, z 3.7…5.6, F1–F3), EduCity
Taidon portaat (E x 17.76…34.0, z 44 → 35.3, 5.0 m), EduCity lifts (E x 0.35…5.33, z 34.3…37.5 and x 46.2…51.0,
z 34.4…36.3), EduCity gateway lift (street −1.55 → 3.40, near (196.9,76.8)).

### 7.1 BioCity ground floor (frame B; walls `interiors-walls.json biocity_ground_floor`, 487 polygons)
- **Column grid:** x = 0.16 + 6.0k (−29.84…36.16), rows z −30.95, −23.7, −12.2, −4.95, 6.15, 17.05; lobby columns
  0.38 m square (black `#26252A`); double column at x −6.04/−5.65 (movement joint); oval core columns ≈0.85 × 1.3 m on
  rows −23.7/−12.2; SW arcade round Ø0.5 on z 17.05.
- **Main lobby / build hall:** x −30.05…30.1, z −4.96…6.0 (≈609 m²). Retail glass at z 4.05 for x −11.05…13.95
  (clear depth 9.0 m). Islands: A-stair (−25.55…−20.6 × 1.6…5.15; open steel D-stair + two panoramic glass lifts in a
  black braced steel tower), lifts H3/H4 (−18.0…−15.45 × 0.93…5.38), kiosk (14.45…17.9 × 2.95…5.3), lifts H5/H6
  (18.4…21.2 × 0.9…5.9), B-stair (23.9…28.7 × 1.6…5.15). Floor light-grey 600 mm tiles `#CFCDC8`; atrium walls white
  panels `#E6E6E8` with white-framed window bands; bridges with glass balustrades near the SE end on ≥3 levels; glass
  lean-to on the SW side [E location]; *The World Dance* wire-mesh sculpture (Lilius 1995, two 3.5 m figures) hung near
  the B lifts [E]. Restaurant indoor terrace reserved at x −30…−20.6, z −4.96…−0.5 [E, 3 Oct setup plan].
- **Build tables [D layout satisfying all CAD clearances]:** 1.8 × 0.8 m, long axis along plan z, 5 chairs each
  (3 + 2 on the long sides). Rows (centres) **z −3.74, −1.94 | central walkway z −1.04…+0.40 (1.44 m) | z +1.30,
  +3.10**; columns **x = −13.4 + 2.2k, k = 0…12** (13 × 4 = 52 = the drawing's count) **+ 4 tables at x −15.6 and +15.2
  on the −z rows → 56 = the legend's count (280 seats)**. Checked: ≥0.12 m from the lobby column faces (z −4.76), 0.05 m
  from the retail glass (z 4.05), clear of kiosk/lifts/stairs; ring-corridor mouths (x −20.3…−17.8 and 17.5…21.0) stay
  clear. Both the as-drawn (x = −13.42 + 2.47k) and legend (x = −12.83 + 2.2k) variants collide with the z −4.95 columns
  and the kiosk; the planned 1.8 m walkway does not fit with 1.8 m tables (the drawing's base plan lacks the shop fronts).
- **Aulagalleria (arrival hall):** curved glass r 19.82–20.56 from B (0, −14.4), exterior only between ±20.9°;
  ring corridors down both sides of the meeting-room core (x −20.3…−17.8 and 17.5…21.0) into the lobby. Rooms (CAD
  areas): Presidenttiauditorio 241.3 (258 seats), Manu 1–4 181.4, Ministeri 96.5, Tellervo 49.7, Projektihuone 40.7,
  Kulmahuone 33.6, Olotila 62.1; Infopiste (weekdays 8–16; desk timber `#B0774E`, moss wall `#878D2C` [unverified]).
- **Meals (Mauno):** Maunon sali (7.1,−33.0)…(28.4,−30.95) — dark-grey 600 mm tiles `#6E6A67`, white slat ceiling
  `#E9E6E0` 3.5–4 m, white "artichoke" pendants, white tables, green/white lattice chairs `#8FB57D`, full-height
  glazing with charcoal curtains `#494647`; serving line 2 counters 26.9…28.2 × −21.6…−17.6 (+ hood 29.5…30.5);
  serving line 1 at (16.6…19.7, −29.5) [label only]; bistro x 20.4…36.4, z −15.2…−5.0 (U-bar 21.4…26.4 × −15.3…−8.5);
  kitchen 113.6 m² (no access).
- **Visibility/tech partner stands** (hotspots from maps.ts; footprint 2.0 × 1.0 m assumed [E]):
  | Stand | Hotspot B | Local | Placement [D] |
  |---|---|---|---|
  | bc-1 Red Hat (rank 1, facing the event entrance) | (6.41, −31.39) | (22.49, −0.06) | 0.46 m from column (6.16,−30.95): centre **B (6.4, −31.75)** → local (22.78,−0.28), long axis along B x, back to the column, facing the vestibule; only ≈0.9 m left to the curved glass (z −33.16) — flag to venue |
  | bc-2 Solita (rank 2, lobby E end at the Joki passage) | (26.35, −2.81) | (10.44, 32.63) | clear; face the lobby (−x) |
  | bc-3 open (W side of the event entrance) | (−6.40, −31.39) | (15.17, −10.57) | mirror of bc-1: **B (−6.4, −31.75)** → (15.47,−10.78); double column (−6.04/−5.65) behind |
  | bc-4 open (lobby W end) | (−24.46, −3.62) | (−17.94, −9.52) | **inside the reserved restaurant terrace** — render as "open stand" marker only; organiser to resolve |
- **Supercar recess / pilotis:** §5.

### 7.2 Joki floor 1 (frame J; walls `interiors-walls.json joki_floor1`, 190 polygons; clear height Aula/Cave 3.1 m [V])
- **Aula** 426.5 m², wedge ≈40 m long (5–15 m wide) from the street vestibule to the ramp; light seamless polished
  floor `#d3cec6` satin; white acoustic tile ceiling `#e6e4df` with round downlights + continuous linear LED lines;
  white round columns Ø≈0.6 `#e8e6e1` (double pair near the counter); board-formed concrete walls/piers `#8f8a82`;
  cloakroom/locker volumes in black vertical timber slats `#1a1c1f`; reception counter beige wood/travertine look
  `#c8b79c`; round sofa Ø2.4 at ≈(33.9,44.7); 3 digital tables, wall projector, screens, grand piano; ≈11.5 m glazed NW
  wall. Light 3500–4000 K. **Event: 33 tables 180 × 80** (positions `interiors.json joki.floor1.aula_table_setup`,
  ±0.5 m).
- **Cave-sali** 245 m², ≈13.1 × 18.5 m, J x 1.59…14.67, z 8.75…27.08, long axis compass 39°/219°; black box: black
  ceiling with downlights + 3 hung projectors, charcoal walls, dark carpet, curved silver screen ≈11 × 2.2 m over a
  ≈3 m-deep full-width low stage at the SW end (stage z 24.2–27.1) [E sizes]; movable wall/doors on the NW side.
  **Event: 42 tables in 6 rows × 7 (alternating 120×60 / 140×60), 210 chairs (3 N + 2 S)**, rows ≈1.0 m apart, 0.8 m
  walkway along the W wall, route across the stage.
- **LUISKA ramp:** J polygon (−3.23,18.07)…(1.30,18.07)…(1.30,8.57)…(−1.0,8.57)…(−1.0,10.46)…(−2.8,16.5); 2.3 m wide at
  the top, ≈9.5 m long, rises north from −1.70 to −1.10 (6.3 %; "1:12.5 in two runs" [ref-joki]).
- **Showroom** 126.3 m² (30 people): the drum's west half (west of the divider J x 1.30–1.50) minus the stair block;
  entrance from the ramp at J-bearing 180° (local (53.44, 22.97)). Black open ceiling (ducts, trays, panels black) at
  ≈y +2.3 (3.4 above F1) [E] with **white linear LEDs in zig-zag/triangle patterns**, black track spots 3000 K,
  projectors; charcoal "patchwork" carpet tiles `#3e4146` with patches `#2f3236` / `#5b5e63`. Two wall displays on the
  stair's west wall (J x −0.75, z −3.0…−1.2 and −0.9…1.2).
- **LED wall:** 22.5 × 3.0 m, P2.5, ≈9000 × 1200 px [V Rajulive]; model at **r 8.45, J-bearings 194.2° → 346.8°**
  (centre 270.5° = local (52.35, 10.59); drawn band r 8.40–8.50, 190.3–350.7°); bottom 0.05 m and top 3.05 m above F1
  (y −1.05 → +1.95) meeting a black curved bulkhead. Current repo scene uses r 8.95 / 202–346° → fix.
- **Six counters** (order from the entrance; logo centres r ≈7.1; counter ≈1.8 × 0.6 m with its back 0.6 m in front
  of the LED wall, i.e. centre r ≈7.5, facing the centre [E]): Meyer Turku 186.7° · DNA 218° · Apetit 250° · Elisa 281°
  · Turku Energia 312° · Bayer 341° (J-bearings; compass = +38.8°). Local counter centres: Meyer (53.55,21.19), DNA
  (51.59,17.65), Apetit (51.79,13.52), Elisa (54.05,10.21), Turku Energia (57.69,8.53), Bayer (61.43,8.88). Current
  repo scene spaces them 25.2° from 212° → fix to these bearings. Dressing [V mood render]: black counters `#0b0b0d`
  with violet edge light, two bar stools each.
- **Company Lounge = "Koulutustila amfiteatteri"** 63.9 m², 30 people [V]: sunken round seating centred **J (5.15,
  −2.2) → local (64.29, 17.44)**; pit floor r 1.12; three 0.5 m tiers between r 1.12 and 2.62, each stepping down 0.30
  (pit floor −0.9) [E ±0.3]; rim r 2.62–2.82 flush; aisles centred J-bearings ≈0°/180° (compass 39°/219°), 36° wide,
  with steps and a central stainless rail; seats = thick upholstered pads navy `#2f3d57`, teal `#0b8794`, petrol
  `#1b576b`, dark green `#3d5f48`, light blue-grey `#9db5bb` on birch-ply tiers `#d9c9a8`; loose rectangular back
  cushions dusty pink `#c9918f` with navy piping on curved brushed-stainless tube rails (`#c0c2c3`) at r ≈1.72 and
  2.72; grey carpet in the pit, dark board-formed concrete drum wall, black ceiling, warm light, wall TV.
- **Core:** stair (see 7.0) with glass balustrade on its west side; X-marked shaft J x 1.45…2.38, z −6.3…1.4; lift
  J x 1.6…3.4, z 3.7…5.6 (local ≈(57.9, 21.1)); storage block S of the core towards the loading dock (VARASTOTILAT
  76.7 m², no access).
- **Connections:** BioCity passage opening J (−17.66,48.01)–(−18.56,51.10) ("Sisään ja uloskäynti" = the event
  connection); street vestibule cordoned; DataCity through the glazed Aula S wall at J z 44.85 (lift lobby A, J x
  20…26, z 49…57); spiral stair to "Lähde" (DataCity 2nd floor) J (−7.6, 47.5).

### 7.3 Joki tower floors 2–3 (frame J; walls `joki_floor2/3`, converted with the +16.36° sheet rotation)
- Open round plates ≈18 m across inside the glass, 16 black columns at r 8.80 (§3.2.2); core (stair J x −0.4…1.3 +
  shaft 1.45…2.38 + lift 1.6…3.4, WC 2.5 m² beside the lift) runs along the J-up axis, z −6.3…5.6, same footprint on
  every floor; no partitions (booking split only). Look: daylit full-height curved glass
  with striped fin shadows; light-grey wood-wool acoustic ceiling `#d0d2d2`; exposed galvanised spiral ducts `#c5c8ca`;
  black track spots 3000 K; grey patchwork carpet `#8a8b8f`; core walls mid-grey `#787c82` with screens. Clear height
  F2 ≈3.5, F3 3.0.
- **F2:** west half "Näyttelytila 2 (EI VARATTAVUUDESSA)" 121 m² = **Turku Futurescapes permanent exhibition**
  (3 digital tables, partition wall with screen, charcoal walls `#2b2c30` with aerial-map graphics, white kiosks, VR
  chairs) — the event's **Chill Zone** is this area, west of the line J (−0.07,−8.99)→(−0.57,9.23): keep the fixtures,
  add a few poufs [D]. East half "Näyttelytila 1" (138.5 m² gross / 109.8 net) = Partner Expo: **Revvity J (5.29,−4.43)
  → local (65.79,15.79); Valmet (6.27,−1.01) → (64.41,19.07); Traficom (6.08,2.07) → (62.34,21.36)**. Exit stair NW.
- **F3:** "Workshop 1" (E, 138.5) and "Workshop 2" (W, 121; four 3-step dark-wood bleachers `#4a3a30` at r ≈7.8,
  ottomans lime `#b1b13b` / violet-blue `#5a5ccc` / teal `#255d69` / grey, lecture-chair arc r 4.5–5.5). **Stands:
  Takomo Golf, Forcit Group, Saarioinen on the three F2 east spots; Lindström J (−3.45,−5.71) → (59.78,9.32);
  Bo LKV (−5.45,−1.32) → (55.47,11.49); Business Turku (−3.39,4.27) → (53.58,17.14)**. The west stands collide with the
  lecture-chair arc → omit the chairs in the twin [D]; Forcit is ≈3 m from the F3 SE exit (keep ≥1.2 m clear).
- Stand dressing [E]: counter 1.8 × 0.6 × 1.05 m + roll-up 0.85 × 2.0 m with the company logo (repo logos only).

### 7.4 EduCity floors 1–2 (frame E; schematic maps ±0.3–0.5 m; rooms in `interiors.json educity`)
- **1F (y 3.40):** exposed concrete column grid x_E ≈5.4/17.3/22.3/29.3/34.2/39.3, z_E ≈8.8/16.4/24.5/30/48.8/54.1/
  59.5/64.9; white 600 mm ceiling tiles with square LED panels; corridors polished concrete `#a9a9b3`; Bolon Studio
  Triangle floors (≈1 m triangles: `#cfd5d8 #aab0b5 #87949b #697278 #3d515a #bbd4ef #dfd4d5`).
  Briefing rooms: **1001 Dromberg (Elisa) x 0.35–17.5, z 0.35–8.4; 1002 Moriaberg (Bayer) x 17.5–39.2, z 0.35–8.4
  (centre local (236.7,72.5)); 1090 Ringsberg (Revvity) x 17.7–33.9, z 10.4–16.45; 1091 Hammarbacka (Traficom)
  x 17.7–33.9, z 16.65–24.9** (movable walls x 17.5 and z 16.55). Ravintola Kisälli dining x 13–39.3, z 47.5–65
  (kitchen/serving along x ≈13); Kaivomestari pub in the pavilion NW (x 5.6–13, z 65.4–72.2); pavilion lift, slide and
  stair to the lower lobby; timber-slatted skylight funnels (one with Noora Schroderus' mobile *PIQUE-NIQUE*).
- **Taidon portaat:** x 17.76–34.0 (16.4 m wide), rising **north** from z ≈44 (1F, y 3.40) to z ≈35.3 (2F, y 8.40):
  ≈10 staggered seating tiers ≈0.5 × 0.9 m + ≈30-riser side flights (0.167 × 0.30) [E]; smooth light-grey cast
  concrete `#cacec8` (risers `#999b90`); black steel handrails; black square step lights; tactile studs on a blue band
  `#367790` at the foot; cushions `#13494f #078898 #c8808c #e7a8b0 #c0a4a4 #a6706b #583736`; birch-ply box tables
  0.6 × 0.6 × 0.45 m. Faceted storage front under the upper half faces the 1F north aula. **Event:** opening ceremony —
  audience on the steps facing south to the hand-drawn stage ("koroke") x 21.5–31.0, z 44.7–47.3 with a screen
  ("sermi") at z ≈47.4 (Kisälli behind).
- **Event points:** registration ≈E (36.8,54.0) → local (212.1,116.4); team-formation area E (29.9,34.0) → (219.3,96.5)
  (1F north aula, z 25–35); snacks ≈E (13–17, 48–51).
- **Atrium (above 2F):** void x 17.6–34 × z 16.8–48.5 (16.4 × 31.7 m); exposed light-grey concrete frame `#d0d2ce`;
  full-height black-framed glass walls; frameless glass balustrades; 5–6 cantilevered timber "dice" boxes (4–7 m wide,
  2–4 m cantilever, ≈45 mm vertical slats/20 mm gaps `#d6ccbe`, shade `#b2aba3`); **two matte charcoal bridges `#2f3438`
  at 3F (y 12.4) and 4F (y 16.4) around z 31–34.5** with white core / lilac halo `#d0a8db` LED lines; steel gantry under
  the glass.
- **2F (y 8.40):** 2001 Elias (Bo LKV) x 0.27–12.3; 2002 Ivar (Takomo Golf) 12.3–22.4; 2003 Erik (Forcit) 22.5–32.2;
  2004 Johannes (Lindström) 32.2–42.4 (all z 0.3–8.4); 2067 (Saarioinen) x 0.27–7.4, z 8.8–20.6; 2006/2007 (Valmet)
  L x 44.2–51.6, z 5.5–20.6; **2072 Työkahvila Aurinkokylpy (Business Turku) x 14.15–37.24, z 16.8–35.3 with KAIVO 2073
  round slatted drum Ø≈5.4 (pink stepped seating inside) at (28.95,25.76)**; 2026 Orvokki (DNA) L x 34.2–51.6,
  z 35.5–48.7; 2029/2031 (Turku Energia) x 14.2–34.9, z 48.9–55.2; 2030 Evert (Meyer Turku) x 9.2–20.7, z 56.8–65;
  2027 Frans (Apetit) x 24.5–34.8, z 56.8–65; terrace (TERASSI) x 35–52, z 49–65 (y_E +5.2). Faceted upholstered
  niches (blue `#1e2f65 #687eb9`, teal `#15292d #3c6168 #629ead`, plum/rose `#3f2128 #70374a #d9968d`) with LED coves;
  pale green lockers `#bcd7c0`; donut sofa `#3f464e`; poufs `#d5b1b2 #312636 #2f5a6c`.

---

## 8. Lighting & atmosphere (Turku, 6–8 Nov 2026, EET = UTC+2)

### 8.1 Sun [V computed with the engine's NOAA algorithm (`twin/engine/sky/sun.ts`), refraction-corrected]
| Day | Sunrise (az) | Solar noon (elev) | Sunset (az) | Civil dusk | Nautical | Astronomical |
|---|---|---|---|---|---|---|
| Fri 6 Nov | 08:06 (121.7°) | 12:14 (13.9°) | **16:23 (238.3°)** | **17:10** | 18:01 | 18:50 |
| Sat 7 Nov | 08:09 | 12:14 (13.6°) | 16:21 | 17:08 | 17:59 | 18:48 |
| Sun 8 Nov | 08:11 | 12:14 (13.3°) | 16:18 | 17:06 | 17:57 | 18:46 |

| Preset (DESIGN §4 + Sunday) | Elevation | Azimuth | Sun direction (x, y, z) |
|---|---|---|---|
| Fri 15:00 registration opens | 7.00° | 219.8° | (−0.636, 0.122, 0.762) |
| **Fri 15:30 arrival (default)** | **4.52°** | **226.6°** | **(−0.724, 0.079, 0.685)** |
| Fri 16:30 dusk | −1.37° | 239.8° | (−0.864, −0.024, 0.503) |
| Fri 17:00 opening | −4.81° | 246.2° | (−0.912, −0.084, 0.402) |
| Fri 18:00 evening | −11.9° | 258.9° | (−0.960, −0.206, 0.188) |
| Fri 19:30 transfer | −23.0° | 278.5° | night |
| Sat 01:00 night | −44.7° | 15.4° | night |
| Sat 11:00 | 12.13° | 161.7° | (0.307, 0.210, 0.928) |
| Sun 13:00 closing | 12.73° | 191.1° | (−0.188, 0.220, 0.957) |
- Art-direction consequences: at 15:30 a 30 m building casts a ≈390 m shadow → **all street level is in shade**;
  only roofs/tops facing SW catch warm light (BioCity technical storey and vault, EduCity plant room, ParkCity top).
  The sun lines up with Tykistökatu (213.9°) at ≈14:45. Moon: waning crescent 9–12 % lit, below the horizon in the
  evening → no moonlight.

### 8.2 Weather & sky [V FMI Turku Artukainen 2016–2025]
November mean 2.9 °C, 63 mm; on 6 Nov 15–17 h: median ≈+7 °C (−4…+12), **overcast 7–8/8 in 5 of 10 years**,
clear/partly clear 4/10, RH 53–98 %, wind 0–4 m/s from W/SW, mist (4.5–7 km) 2/10, light rain 2/10, snow cover 1/10
(2016); some precipitation on 6 Nov in 7 of 12 years.
- **Default look [D]:** "November afternoon, broken overcast with a low sun break": `Sky` turbidity 8–10, rayleigh
  2.5, mieCoefficient 0.008, mieDirectionalG 0.85; exposure −0.3 EV vs clear; fog exp2 density ≈0.0012 (visibility
  ≈10 km), colour from the sky horizon; **damp ground**: asphalt roughness ×0.8 (wet preset ×0.6 + puddle mask in
  low spots), concrete ×0.85. Optional "clear cold" preset (turbidity 3, crisp shadows) and "overcast" preset
  (`kloofendal_overcast_puresky` env, no directional shadows, sun intensity 0.15).
- Vegetation per §4.6. Breath of life: few pedestrians (Friday 15–17 h campus), parked cars on Lemminkäisenkatu bays,
  ParkCity traffic, buses every few minutes on Tykistökatu.

### 8.3 Night look [V photos unless E]
- Streets: LED ≈3000 K (4000 K possible on main roads) [E], ≈10 m poles; pools of light ≈15–20 lux; wet asphalt
  reflections; switch on at sunset → full by civil dusk (17:10).
- BioCity: atrium glows warm-neutral through the vault and Tykistökatu gable; crown band mostly dark with some lit
  offices; **SCIENCE PARK letters lit `#D2F06A`**; K-Market shopfront lit; black panels near-black; pilotis
  downlights; event uplights on the white recess wall (3000 K) [D].
- Joki: fins **uplit warm white (~3000 K) from a strip at their base**, interior F2–F3 bright through the glass; deck
  bollards; rainbow stair lit by the canopy.
- EduCity: nearly all windows lit neutral white `#e2e3de` (~4000 K, ~60 of 65 NE windows); plant room glowing warm
  (`#e7d2b8` at the base → `#bc9d7c` up) [E uplit]; pavilion and storefront lit; twin-globe pole lamps on Joukahaisenkatu,
  slim black box-head poles on the deck.
- ParkCity: lit decks behind the tube fins; Electrocity/ICT-City: scattered lit windows (hash, 30–50 % on Fri evening).
- Interiors: BioCity lobby 3000–3500 K; Joki Aula 3500–4000 K; Showroom dark with violet LED-wall content and 3000 K
  spots; EduCity 4000 K.
- Event dressing only in Since AI violet `#8b7bff` / `#6d4dff` (route ribbons, entrance markers, stand line lights, LED
  wall glow).

### 8.4 HDRIs
Use `Sky` + PMREM for exteriors (DESIGN §4). HDRIs (Poly Haven CC0): `kloppenheim_01_puresky` (sun break, az 125.3°/el
3.3°), `kloofendal_overcast_puresky`, `qwantani_dusk_1_puresky`, `rathaus` (wet night reflections, intensity
0.3–0.6), `paul_lobe_haus` (interiors under glass roofs), `schadowplatz` (overcast plaza). Rotate to the real sun:
`environmentRotation.y = backgroundRotation.y = (az_hdri − az_target)·π/180` (kloppenheim → 15:30 Fri: (125.3 −
226.6)° = **−1.768 rad**). Sign derived from the three.js source, unverified → check with a chrome sphere once.

---

## 9. Asset manifest & three.js toolbox (`assets/manifest.json`; all CC0)

### 9.1 Material library (`MaterialName` → set; tile = metres per texture repeat) [V manifest; colours D]
| MaterialName | Texture set (tile) | Base / roughness / metalness | Use |
|---|---|---|---|
| asphalt | asphalt_road_wet (2.0; 2K) | albedo dry ≈#4a4a4a–#5c5c5a, map r 0.44 (damp), m 0 | carriageways |
| roadMarking | geometry; road_marking_paint (0.22×0.89) as wear | #e8e8e3, r 0.55 (wet 0.3), polygonOffset −2/−2 | markings |
| pavers | pavers_concrete_slab (**1.2** for 0.4 m slabs; 2K) / pavers_granite_setts (2.2×1.1) | slab tint #e8edf0 → ≈#8e8b85–#a19d96; r 0.88 | sidewalks, plazas, strips |
| granite / kerb | granite_kerb (0.4) | #b5b1ad, r 0.70–0.90 | kerbs, plinths |
| grass / soil | grass_autumn (2.0) × grass_worn (2.51) noise blend; soil_dark, mulch_bark | | lawns, planters |
| gravel | **missing** — add ambientCG Gravel CC0 or tint soil_dark | | EduCity guest field |
| brickDark | brick_dark (1.91; 2K): **EduCity anisotropic tile u 4.8 m × v 1.1 m** → Kolumba 0.53 × 0.05 m courses; colour ×0.8, −20 % sat → ≈#5f5854; DataCity standard tile tinted #8a4b3c | r 0.92 | brick facades |
| panelBlack | metal_black_panel (0.5) | #2B2A2E, r 0.22–0.38, **m 0** (painted) | BioCity facades |
| panelGrey | metal_white_painted tinted | #C8CCCE (BioCity tech storey), #c3c6c8/#c8cacc (Joki aluminium) | |
| metalWhite | metal_white_painted (0.5) | #dcdfe2 satin r 0.35 (Joki fins); #c9d0d2 (EduCity plant room) | |
| metalDark | metal_black_panel | #1E1E22 | frames, louvres, canopies, columns |
| concreteFacade | concrete_polished (3.0) tinted | #8f8a82 board-formed (Joki), #c6c9c7 render (EduCity terraces) | |
| glassFacade | MeshPhysicalMaterial | base #2F3D4A, r 0.03–0.06, m 0, env 1.0–1.5; transmission only on ultra hero panes | curtain walls |
| glassInterior | glass_smudge (1.0×0.74) | transmission 1, ior 1.5, thickness 0.01 | partitions, balustrades |
| concreteFloor | concrete_polished (3.0; 2K) | polished r ×0.6–0.7; Joki Aula tint #d3cec6; EduCity corridors #a9a9b3 | |
| stoneFloor | concrete_polished tinted #CFCDC8 + 0.6 m grout grid | r 0.45 | BioCity lobby tiles |
| terrazzo | terrazzo (0.6) | r 0.30 | optional floors |
| birch / oak | wood_birch_lamella (1.4; 2K) / wood_oak_pale (1.0; 2K) | birch #d9c9a8–#d1a976; oak #e2cbb4, slats #d6ccbe | tiers, slats, counters |
| carpetDark / carpetGrey | carpet_dark (0.5) anthracite variant | #3e4146 (Showroom) / tint #8a8b8f (Joki F2–3) | |
| fabricPink / fabricTeal | fabric_upholstery (0.3) + sheen 0.3–0.5 | material.color #ffb1b1 → albedo ≈#c08080; #127e99 → ≈#0a5a6e | lounge, Taidon cushions |
| steel / chrome | metal_brushed_steel (0.5), anisotropy 0.5–0.8 | m 1, r 0.40–0.54 / chrome r 0.08 | rails |
| plasterWhite / plasterGrey / ceiling | flat | #E6E6E8 / #787c82 / #e6e4df | |
| carPaintBlack / carGlass | §5.4 | | supercars |
| bark / foliage | bark_birch (1.0) / bark_pine (2.0) / leaves_autumn_yellow (alphaTest 0.5) | | trees |
| screen | canvas emissive | | LED wall, signs |
| decals | leaves_scattered_ground, manhole_cover (polygonOffset) | | |
WebP normal maps of grass/carpet/fabric/mulch/birch-bark lose 11–17° (chroma subsampling) → use lossless WebP or KTX2 if
close-ups need detail. No AO maps for granite_kerb, metal_*, terrazzo, leaves, glass_smudge (by design).

### 9.2 Models & gaps
- People: Quaternius CC0 rigged (mannequin ×0.32, man suit ×0.37, woman ×0.36, casual ×0.37, business man ×0.96 →
  ≈1.75 m; measure after `mixer.update()`); stylised placeholders.
- Cars: Quaternius SUV 2.11×1.51×4.21, sedan, hatchback, sports 1.87×1.19×3.93 (traffic/parked only); Kenney boxy SUV
  = fallback. **G-Class: procedural (§5.4).**
- Furniture: Poly Haven `modular_street_seating_bench` (realistic, 25k tris); Quaternius bench/lamp/pine/birch ×5
  (recentre birches; file has them at x 152–170) = placeholders → prefer `@dgreenheck/ez-tree`.
- Gaps: gravel texture; photoreal people (keep instanced, low-poly, small on screen); bus/train models (optional,
  procedural boxes acceptable at distance).

### 9.3 three.js r186 toolbox [V assets researcher; smoke-tested in headless Chromium]
- three 0.186.1 + @types/three 0.186.0. Addons: `objects/Sky.js` (WebGL), `postprocessing/` GTAOPass, SAOPass,
  SSAOPass, SMAAPass, TAARenderPass, UnrealBloomPass, OutputPass, SSRPass; `csm/CSM.js`; **`lights/SunLight.js` (new
  in r186: sun light with two built-in shadow cascades — preferred over CSM)**; controls PointerLock/Map/Orbit;
  loaders **HDRLoader** (RGBELoader deprecated r180), EXR, KTX2, DRACO, GLTF, SVG; `environments/RoomEnvironment.js`;
  `objects/Reflector.js`, `Water.js`, `Water2.js`; `lights/LightProbeGenerator.js`; `utils/BufferGeometryUtils.js`
  (mergeGeometries, mergeVertices); `math/MeshSurfaceSampler.js`; `geometries/TextGeometry.js`.
- Deprecated/removed: `THREE.Clock` → `THREE.Timer`; `PCFSoftShadowMap` removed (falls back to PCF);
  `SVGLoader.createShapes` (r185); `KTX2Loader.detectSupportAsync` (r181).
- Decoders to copy to `/public`: Basis `examples/jsm/libs/basis/basis_transcoder.js|.wasm`; Draco
  `examples/jsm/libs/draco/draco_decoder.wasm`, `draco_wasm_wrapper.js` (gltf/ variant smaller); meshopt decoder.
- npm (none installed yet): three-mesh-bvh 0.9.15 (MIT; walk raycasts), camera-controls 3.1.2, postprocessing 6.39.5
  (peer `<0.187` blocks a three upgrade), n8ao 2.0.1 (needs postprocessing), three-gpu-pathtracer 0.0.26 (poster
  renders only), @tweenjs/tween.js 25 (three bundles 23.1.1), @dgreenheck/ez-tree 1.1.0.

---

## 10. Guide copy that must be corrected (repo `lib/hackathon-2026/*`, `components/guide/*`)

Status checked against the working tree at 4 Oct 2026 (another session has started editing — **uncommitted** changes in
`venues.ts`, `photos.ts`, `maps.ts`, `companies.ts`). ✅ = already corrected in the working tree (verify wording
against the facts column before commit) · ⬜ = still open.

| | Where | Current text | Problem | Correct text / facts |
|---|---|---|---|---|
| ✅ | `venues.ts` TRANSFER_ROUTE.`approxOutdoorDistance` (was "approx. 50 m outdoors (organiser estimate)") | "about 200 m outdoors · 3 min" | 50 m was **false for any outdoor walk**: EduCity and BioCity walls are 153.9 m apart (Joki 124.4 m) with the 133 m-long ICT-City between; ~30–80 m outdoors only after ≈130 m indoors through ICT-City (weekend opening unverified) | EduCity west entrance → BioCity event entrance **201–208 m / 2.6–2.7 min**; Joki = through BioCity + ≈70 m indoors (≈1 min) |
| ✅ | `venues.ts` TRANSFER_ROUTE `summary` / `steps` / doc comment | deck + "wide outdoor stairs down (about 10 steps)" + "south-east end … 10 steps" | — | matches §6 (Jussin aukio main stair ≈10 risers; passage stair 10 treads / 11 risers) |
| ✅ | `photos.ts` biocity-exterior caption; `venues.ts` BioCity image alt | west-corner wording | photo = west corner from the Tykistökatu–Lemminkäisenkatu junction | as now in the working tree |
| ✅ | `venues.ts` BioCity entrances | "Company entrance — Tykistökatu 6 … recess next to the glass corner tower (level access)" added | owner 4 Oct | correct (§3.1.4) |
| ✅ | `photos.ts` joki-tower-dusk caption | "two glass storeys are Q&A floors 2 and 3; … floor 1, below the deck — … up the ramp" | — | correct: F1 −1.10 is 0.6 m above the Aula (ramp up) and ≈3.3 m below the NE deck |
| ✅ | `venues.ts` Joki street door | "closed during the event — enter Joki through BioCity" | Joki event map: "Alue rajataan / Ei ulos-/sisäänkäyntiä" | correct; note it is Joki's only step-free door (§11.3) |
| ✅ | `venues.ts` EduCity entrances | pavilion at deck level + east-corner stairs or step-free gateway lifts | — | correct (§3.3.4) |
| ✅ | `maps.ts` joki-1 `joki1-stairs-2` + glossary | "Spiral stair to meeting rooms — DataCity floor 2 — not the Q&A floors" | — | correct (J (−7.6, 47.5)) |
| ✅ | `companies.ts` qaStandSentence | "Joki floor 1 (up the ramp from the Aula)" | — | correct |
| ✅ | `maps.ts` biocity-lobby `alt` | "north-east entrance … south-east end" | — | correct |
| ✅ | `photos.ts` joki-lobby alt | "light wood-look reception counter" | — | correct (`#c8b79c`) |
| ⬜ | `maps.ts` L366 biocity-lobby `caption`; L402 hotspot `bio-joki-passage` description | "…Joki connects at its east end." / "Passage to Joki at the east end" | inconsistent with the corrected alt/venue text | "…Joki connects at its south-east end (short stair down)." / "Passage to Joki at the south-east end (10 steps down)" |
| ⬜ | `components/guide/CampusSchematic.tsx` L125–128 (`<desc>`) | "A short outdoor walk across the campus courtyard leads to BioCity's courtyard-side event entrance… Joki… with its round Showroom tower at the courtyard." | same false "short walk"; the Showroom is not visible at the courtyard | "About 200 m (3 min) along the raised campus deck and down a short stair at Jussin aukio to BioCity's courtyard-side event entrance. Joki is joined to BioCity; its round glass tower (Q&A floors 2–3) stands on the courtyard." |
| ⬜ | `venue3d.ts` L77 BioCity caption | "56 tables and 280 seats in the current furniture plan" | setup drawing shows **52 tables (13 × 4)**; only its legend says 56/280 | "about 52–56 tables" until the organiser confirms; the twin uses 56 (§7.1) |
| ⬜ | `photos.ts` L145 IMAGE_CREDITS "3D preview — illustrative render, not to scale"; DESIGN §8 credit line | | the twin is to scale and derives from CC BY data → attribution is **required** | "3D model: Since AI, built from City of Turku open data (© Turun kaupunki, CC BY 4.0), © OpenStreetMap contributors (ODbL) and TTK floor plans · Textures: ambientCG, Poly Haven (CC0)" |
| ⬜ | `venues.ts` TRANSFER_ROUTE `fallbacks[0]` (Google walking directions to "Tykistökatu 6") | | routes to the front (Tykistökatu) door, not the courtyard event entrance | keep as fallback but label "to BioCity's street address (front door)" |
| ⬜ | `guides.ts` speakers "Getting to Turku" (L356) | "Kupittaa railway station is next to the campus…" | could give the measured walk | add: "≈350 m / 5 min to EduCity via the covered footbridge (Kalevansilta) and the wide stairs at EduCity's east corner." |
| — | Research brief facts (not in repo copy) | "Joki 2024–25", "Pentagon designed Joki" | false | Joki opened **8 Dec 2017**, architect **Arosuo Arkkitehdit**; Pentagon = concept/exhibitions/brand; LED Showroom since Jan 2023 |

---
