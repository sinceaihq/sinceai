# Campus twin — source data

Inputs of the data pipeline that builds the 3D campus's runtime data
(`public/assets/guide/3d/data/*.json`, `public/assets/guide/3d/terrain/dtm.*`):

```bash
node scripts/twin/build-campus-data.mjs --src data/campus-twin/sources --out public/assets/guide/3d
```

The pipeline is deterministic: these inputs give byte-identical outputs (checked 4 Oct 2026).

| File | What | Source · licence |
|---|---|---|
| `campus.json` | OSM extract of the campus in the twin frame (buildings, roads, paths, areas, entrances, trees, lamps, railway) + City of Turku base-map features | © OpenStreetMap contributors, ODbL 1.0 · © Turun kaupunki, CC BY 4.0 |
| `turku/heights.json`, `turku/wfs/lod2_parsed.json` | City of Turku CityGML LOD2 building summary and roof surfaces (EPSG:3877) | © Turun kaupunki, käyttölupa CC BY 4.0 |
| `turku/terrain_dtm2021_050m_uint16.png` (+ `.json`, `_measuredmask.png`) | 0.5 m terrain model 2021 resampled to the campus extent | © Turun kaupunki, CC BY 4.0 |
| `turku/turku_dsm2021_local_025.npz` | 0.25 m laser surface model (roof heights of buildings without LOD2) | © Turun kaupunki, CC BY 4.0 |
| `street/streetscape_geodata_local.json` | City of Turku street register, base map, street furniture and signs in the twin frame | © Turun kaupunki, CC BY 4.0 |
| `educity/educity_massing.json` | EduCity walkway and outdoor stairs measured from the architect's published drawings | Since AI (measurements) |
| `spec_routes.json` | Walking route legs and the audience tours | Since AI |
| `interiors.json`, `interiors-walls.json` | Interior rooms and wall polygons traced from the venue owner's floor plans (used by the building modules) | Since AI, from Turun Teknologiakiinteistöt Oy plans shared for the event |
| `SOURCES.json` | Provenance of every dataset the research used: URLs, credits, licences | — |

Derived databases from OpenStreetMap data stay under ODbL 1.0; City of Turku data needs the mark
"© Turun kaupunki, käyttölupa CC BY 4.0". Both credits are shown in the 3D view and on the venue page.

Not in the repository, on purpose: reference photos and aerial orthophotos (used only to model by eye —
never shipped as textures), and the raw CityGML / laser downloads (refetch them with the URLs in `SOURCES.json`).
