# PujaPath Media

## Scope And Inventory

The media layer is implemented for all **33 catalogue locations**: **8 historical
photo primaries and 25 area-map primaries**. Every location, including the eight
with photos, has its own original local area-map fallback. A separate dedicated
Durga face photograph is available for the festival intro.

The original media-only pass did not wire components or modify the App, styles,
i18n, legacy assets, accounts, workflows or publishing. Subsequent integration
adopted the new portrait and matching credit together, with previews in Explore,
map popups and details. [FESTIVAL_RELEASE.md](FESTIVAL_RELEASE.md) records the
separate UI, animation and offline verification and publication status. The
legacy image remains unchanged and separately attributed.

| New asset class | Count | Encoded bytes |
| --- | ---: | ---: |
| Area maps, 720 x 480 | 33 | 1,385,428 |
| Named historical venue photographs | 8 | 725,726 |
| Dedicated Durga face portrait, 960 x 1444 | 1 | 101,320 |
| Total new WebPs | 42 | 2,212,474 |

The new images total about **2.21 MB**, excluding the small provenance records
and unchanged legacy assets. Area files are 26,392-53,462 bytes; named photos are
41,740-151,238 bytes. Caps are 60,000 bytes per map, 160,000 per venue photo,
200,000 for the portrait and 6,000,000 for the full new image set.

## Export Contract

The only runtime exports from [../src/data/pandalMedia.ts](../src/data/pandalMedia.ts)
are `PANDAL_MEDIA`, `FESTIVAL_PORTRAIT` and `AREA_MAP_CREDIT`. The exported
`PandalPreview` interface has this shape:

```ts
interface PandalPreview {
  id: string
  image: string
  fallbackImage: string
  kind: 'photo' | 'area'
  width: number
  height: number
  alt: string
  altBn: string
  caption: string
  captionBn: string
  year: number | null
  author: string
  sourceUrl: string
  license: string
  licenseUrl: string
  areaImage: string
  areaWidth: number
  areaHeight: number
  approximateAreaLabel: string
  approximateAreaLabelBn: string
}

export const PANDAL_MEDIA: Record<string, PandalPreview>
export const FESTIVAL_PORTRAIT: Pick<PandalPreview,
  'id' | 'kind' | 'image' | 'width' | 'height' | 'alt' | 'altBn'
  | 'caption' | 'captionBn' | 'year' | 'author' | 'sourceUrl'
  | 'license' | 'licenseUrl'>
export const AREA_MAP_CREDIT: Pick<PandalPreview,
  'author' | 'sourceUrl' | 'license' | 'licenseUrl'>
```

`PANDAL_MEDIA` has exactly the 33 IDs from
[../src/data/pandals.ts](../src/data/pandals.ts). `image` is the preferred asset;
`fallbackImage === areaImage` always names that same location's map. For an area
primary, `image === fallbackImage`. Primary dimensions describe the actual full
image, not a forced crop. Maps are always 720 x 480.

All image paths are local BASE_URL-relative strings such as
`images/pandals/bagbazar-2025.webp`, without a leading slash. Consumers form a
resource URL with `import.meta.env.BASE_URL + media.image`; no public-client image
request goes to Commons or a tile service. Source and license URLs are credit
links, not image sources.

When a photo fails, change the effective kind, dimensions, alt/caption and credit
together: use `areaImage`, `areaWidth`, `areaHeight`, `approximateAreaLabel` or
`approximateAreaLabelBn`, the caption **Area overview, not pandal appearance**
(Bengali: **এলাকার মানচিত্র, মণ্ডপের ছবি নয়**) and `AREA_MAP_CREDIT`. Do not loop
between failed images, borrow another venue's photograph, or retain photo credit
while displaying a map. If both local assets fail, the UI must use a non-image
unavailable state.

The portrait is [../public/images/intro-durga-face-2015.webp](../public/images/intro-durga-face-2015.webp):
Biswarup Ganguly's full-frame, CC BY 3.0 photograph from the 2015 Hooghly immersion
ceremony in Kolkata. The face is clear and the original framing is retained.
It is not a named pandal, a 2026 scene, or an illustration. The old 2024 arches
photograph remains separately attributed to HridoyKundu under CC BY-SA 4.0.

## Source Review

Public Commons image-info metadata was checked on 17 October 2026. Eleven unique
bounded search terms covered the portrait and selected major venues, generally
three candidates per query; the first portrait lookup returned six. No large
category scan, account, private source, search-engine photo download or hotlink
was used. A Commons file page resolved Sreebhumi's older CC0 deed URL and confirmed
the Sporting Club identity. No 429 response occurred; failures would stop requests,
not trigger host switching or protection bypass.

Accepted venue photos: Bagbazar Sarbojanin (2025), Kumartuli Park (2023), Sreebhumi
Sporting Club (2022), College Square (2009), Ekdalia Evergreen (2017), Suruchi
Sangha (2025), Ahiritola Sarbojanin (2023), and Chetla Agrani decorative detail
(2015). The last image is explicitly not a full-pandal view.

Rejected or deferred identities include the Lake Town clock tower instead of
Sreebhumi, Kumartuli Sarbojanin instead of Kumartuli Park, an Ahiritola idol later
photographed at Park Street Metro, ambiguous Boro/Chhoto Sovabazar Rajbari coverage,
and a February 2026 Tala record that does not establish that festival's appearance.
The remaining 25 area primaries mean **no photo accepted in this bounded pass**,
not that no licensed photograph exists anywhere.

Years come from source capture metadata, corroborated by titles/descriptions
where present, never upload dates. The exact raw date is retained; a missing time
zone is not converted to UTC. Ekdalia's filename and capture-metadata days differ,
so only their shared year is used. Future unknown capture years must remain
`null` and be labelled **Historical photo, year unknown**. Source identity was
manually reviewed; unit tests preserve that evidence but do not independently
prove the venue or date.

Commons can return a 960-pixel thumbnail URL with a 720-pixel requested display
width. Provenance distinguishes native dimensions from the API display dimensions;
the import checked aspect ratio and browser decoding before resizing. Every
download was streamed under 1.5 MB, checked for an allowed image content type,
decoded, and encoded locally. Original multi-megabyte photographs were not fetched.

Full attribution, exact license/legal-code links, source titles, author spellings,
date caveats and change notices are in
[../public/images/MEDIA_LICENSES.md](../public/images/MEDIA_LICENSES.md).
[../public/images/pandals/photo-provenance.json](../public/images/pandals/photo-provenance.json)
records source-check UTC times, observed thumbnail URLs, source and derivative
hashes/sizes/dimensions, transformations, and per-file identity-review reasons.

## Original Map Generation

[../scripts/build-pandal-previews.mjs](../scripts/build-pandal-previews.mjs) loads
the existing V2 walking graph through `validateStreetData` and uses the existing
`decodeStreetGeometry` function, including `intermediate-delta-lat-lng-e6` bends
and both endpoints. It does not rebuild, simplify, replace or change the graph.

The input [../public/data/kolkata-walking.json](../public/data/kolkata-walking.json)
contains 87,221 nodes and 112,718 polylines. Its snapshot is
**2026-10-14T20:21:12Z**, with 7,899,330 bytes and SHA-256
`11331db29f1a13bbe65052f2f95e94597af2f965cb4ba6c6174da119ac794125`.
See [STREET_DATA.md](STREET_DATA.md) and
[../public/data/Kolkata-walking.LICENSE.md](../public/data/Kolkata-walking.LICENSE.md)
for the public Geofabrik/OpenStreetMap source chain and ODbL terms.

The renderer uses a local north-up equirectangular projection centred on each
catalogue pin. The 600 m radius is the centre-to-corner distance, giving a roughly
998 x 666 m viewport, about 1.39 m per pixel. A 100 m scale bar, north indicator,
approximate marker and visible OpenStreetMap attribution are included. The scale
is geographic; drawn road widths are stylistic, based on retained names/flags,
not physical carriageway widths. Tunnel/steps flags affect dash styling.

Only source polylines are drawn. Crossing segments remain separate records;
off-screen endpoints do not remove a real line crossing the viewport. A neutral
background does not claim land use. No building, river shape, connector, route,
entrance or current access condition is invented. The dashed marker is a symbol,
not a measured uncertainty radius. Actual selections contain 108-465 source
polylines per location.

Maps are original Canvas 2D bitmaps using an installed local Outfit font and
headless Chrome via the existing Playwright dependency. All browser network
requests are blocked; there is no external tile fetch or API key. No Python or
new dependency is needed. Vite is used only as an in-process TypeScript loader
with project config/environment loading disabled and no listening server.

The generator accepts no output directory or arbitrary filename. It writes only
known `<catalogue-id>-area.webp` files and the area provenance record under the
fixed project media directory. It rejects unknown IDs, symlinked destinations,
extra arguments, missing/excessive geometry and oversized outputs. Existing
outputs are refused by default; explicit `--replace` regenerates only maps and
their provenance, not photographs or legacy files.

From the project root, the reproduction and validation commands are:

```sh
node scripts/build-pandal-previews.mjs --replace
npm run test:unit -- tests/unit/media.test.ts
npm run build
```

The original generation was at **2026-10-17T10:33:05.872Z**. Its per-location
coordinates, geographic bounds, source geometry counts, pixels, sizes and hashes
are in [../public/images/pandals/area-provenance.json](../public/images/pandals/area-provenance.json).
Font/browser encoder versions can change bitmap bytes on a later rebuild; retain
and review the regenerated evidence. The ODbL label applies to the map database,
not to the separately licensed photographs.

## Verification Evidence

[../tests/unit/media.test.ts](../tests/unit/media.test.ts) covers exact catalogue
coverage, unique fallbacks, kinds, bilingual fields, historical captions, confined
local files, approved credit links, byte caps, RIFF/WebP headers, hashes, full-frame
aspect ratios, legacy-image preservation, license documentation, source-graph
identity, actual intermediate geometry and all 42 native image decodes with
nonblank pixel samples and browser networking disabled.

The dedicated portrait, all eight venue photos, and two representative area maps
were visually inspected. Local evidence, intentionally outside public assets:

- [../test-results/media/photos-a.webp](../test-results/media/photos-a.webp)
- [../test-results/media/photos-b.webp](../test-results/media/photos-b.webp)
- [../test-results/media/areas.webp](../test-results/media/areas.webp)
- [../test-results/media/image-validation.json](../test-results/media/image-validation.json)

These media-only checks establish local decoding, data consistency and reviewed
source provenance. Component rendering, service-worker behavior and animation
are separately checked in [FESTIVAL_RELEASE.md](FESTIVAL_RELEASE.md). Neither set
establishes current festival appearance or verified entrances. Integration keeps
active images and their credits together.