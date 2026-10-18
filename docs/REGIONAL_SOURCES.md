# Regional Catalogue Sources

## October 18 Curation Correction

This correction supersedes the count-filling and default manual-lead UI policy below. Default regional recommendations require major annual themed art/pandal construction and source-reported visitor or photographic appeal, not merely a mapped puja, school or temple. Unresolved leads carry `eligibleMain: false` and must not appear in the main trip flow or automatic arrival registry.

Removed `durgapur-tn-school` from the exported lead array at the user's explicit request: the [sixteen-stop guide](https://myaaspaas.in/blog/durgapur-durga-puja-2026-16-famous-pandal-locations-and-route-map) only names a location near a school and supplies no qualifying themed-pandal evidence. Also removed `asansol-kalikrishna-ashram` (the [October 10 report](https://www.sangbadpratidin.in/durga-puja/puja-coverage-bengal/durga-puja-2026-exceptional-one-day-durga-puja-organised-in-asansol/pid/1379275/) concerns a past one-day Mahalaya observance) and `asansol-burnpur-town` (the [News18 source](https://bengali.news18.com/photogallery/south-bengal/multiple-temples-at-once-your-mind-will-be-calm-in-the-green-environment-of-nature-where-to-see-l18-smc-local18-2321578.html) describes a temple complex, not qualifying annual themed construction). These audit reasons do not deny that worship takes place there.

The immediate TN-removal check passed all 14 regional tests. The policy tests now explicitly require the removed IDs/names to remain absent and every unresolved lead to be excluded from the main flow; identity and coordinate evidence checks remain intact.

### Current Result

Public-source audit completed **2026-10-18T06:58:56Z** (18 October, 12:28:56 IST). **17 curated map-ready pandals: Asansol 6, Durgapur 11.** Eleven new named hosts were added, and Marconi's existing ID was corrected to its named Dakshin Pally maidan. This is a bounded selection, not every important puja or an eight-per-city claim.

| Current export | Asansol | Durgapur | Total |
| --- | ---: | ---: | ---: |
| Curated, mapped major theme pujas | 6 | 11 | 17 |
| Mapped but excluded from default curation | 0 | 1 (SEPCO) | 1 |
| Research-only, not mapped trip stops | 3 | 5 | 8 |

The raw regional registry has **30 stops: 18 pandals, eight food stops and four sights**. There are **40 insight records**. With the untouched 33 Kolkata pandals, the raw catalogue has 63 stops / 51 pandals; the curated pandal candidate list has **50 pandals**, before adding any explicitly selected optional food or sights. These are catalogue counts, not a suggested itinerary.

The 17 default selections have **2 reported current themes, 13 reported plans, and 2 unresolved theme-title conflicts**. **Eight have illustrated historical major-pandal evidence from 2021**; that overlaps the current selections and is not eight additional stops. One further major-themed candidate, Gopalmath, is `needs-location` and remains outside the main flow. New Upper Chelidanga is **Heritage**, not a default theme selection. All opening, parking and car-access fields remain `unknown`.

### Selection Gate

- Require annual pandal identity, themed art or construction, and source-reported visitor/photographic appeal from an organiser, reputable dated reporting, or two credible local festival guides. Here, the 17 selected hosts use two local-guide sources plus separate map evidence. Social engagement, directory votes and alleged live crowds are not selection evidence.
- An established school, temple, park or community puja does not qualify solely by existing. A single unconfirmed poster concept is insufficient. The explicit TN School exclusion remains in force regardless of later poster claims.
- A historical major theme can establish artistic merit, but its year must remain visible. A 2026 plan is not a verified completed 2026 display. Conflicting names remain null rather than being reconciled by guesswork.
- Map-ready means a named annual host can be used for itinerary selection. It does **not** mean a surveyed entrance, legal stopping place, parking space, open event or validated car approach.

### INCLUDED: Curated Hosts

Source abbreviations link to the actual public pages below. Each host also has structured identity, address and coordinate evidence in `PLACE_INSIGHTS[id].locationEvidence`.

| ID | Curatorial evidence and theme status | Named feature coordinate and map |
| --- | --- | --- |
| `asansol-dhemomain` | Ayodhya Ram Mandir, **reported 2026**: [PH] + [DH]. The October 14 caption describes decorated pandal work, not merely a known puja. | 23.7043778, 86.9083866; [Dhemomain Durga Puja Committee](https://www.google.com/maps/place/Dhemomain+Durga+Puja+Committee/data=!4m5!3m4!1s0x39f71ff3710de2ed:0x6c7560b82160dee7!8m2!3d23.7043778!4d86.9083866). |
| `asansol-kalyanpur-k-sector` | Buddhist-temple architecture, **plan**: [PH] + [KH]. Exact foreign temple not confirmed. [Independent address](https://bharatbz.com/west-bengal/k-sector-kalyanpur-housing-durga-puja-70160). | 23.6999792, 86.9584407; [K-Sector Durga Puja](https://www.google.com/maps/place/K-Sector+Kalyanpur+Housing+Durga+Puja/data=!4m5!3m4!1s0x39f71f173cc20781:0x3d21069fd645dd92!8m2!3d23.6999792!4d86.9584407). |
| `asansol-kalyanpur-adi-puja` | Swaminarayan Mandir, **plan**: [PH] + [KH]. [Independent Housing Road address](https://bharatbz.com/west-bengal/kalyanpur-adi-puja-1490102). | 23.7019336, 86.9582026; [Adi Puja](https://www.google.com/maps/place/Kalyanpur+Adi+Puja/data=!4m5!3m4!1s0x39f71f16c9ebda1f:0x49092da99d242dad!8m2!3d23.7019336!4d86.9582026), not the nearby committee office. |
| `asansol-kalyanpur-scheme-2` | Singhasane Singhobahini, **plan**: [PH] + [KH]; separate from Adi Puja. | 23.7044255, 86.9564085; [Scheme 2 Puja Arena](https://www.google.com/maps/place/Kalyanpur+Scheme+2+Puja+Arena/data=!4m5!3m4!1s0x39f71f13c2ac79a9:0xc5b94af91934a51b!8m2!3d23.7044255!4d86.9564085). |
| `asansol-rabindranagar` | Elaborate temple-inspired art: [PH] + [RN]. **Title conflict**, not a definitive current theme: Gauri Tripurantak Dham versus Tripureshwarer Gouri. | 23.6885322, 86.9442909; [Unnayan Samity Durga Puja Mandir](https://www.google.com/maps/place/Rabindranagar+unnayan+samity+Durga+Puja+Mandir/data=!4m5!3m4!1s0x39f71f005794b667:0xcd633f132794e5f5!8m2!3d23.6885322!4d86.9442909). The video title says Unnayan; its description's Udyapan variant is not adopted. |
| `asansol-netaji-sporting` | Burnpur theme-puja: [PH] + [NS], with a [dated 2026 video](https://www.youtube.com/watch?v=rLdtzBBmXwQ). **Title conflict**: Hamsa O Shikhar versus Kulfir Sikha. | 23.6723739, 86.9445177; [Netaji Sporting Club Pandal, Burnpur](https://www.google.com/maps/place/Netaji+Sporting+Club+Pandal/data=!4m5!3m4!1s0x39f71ef798bbdf97:0xc97ebb5980680bd!8m2!3d23.6723739!4d86.9445177). Not the Kolkata or Pandu club. |
| `durgapur-urvashi` | Plastic-recycling art in **2021** [DG21]; Mangalghat **2026 plan** [DG26]. | 23.5365902, 87.3049101; [Urvashi Durga Puja Maidan](https://goo.gl/maps/hYUQwcfp4uap3VUm7). Keep City Centre address, not the historical article's conflicting Kaliganj text. |
| `durgapur-cement-park` | Beautiful themed construction [DG21]; Matir Taane **2026 plan** [DG26] + [DP]. | 23.5396265, 87.2927462; [Cement Park ground](https://goo.gl/maps/3qEJjfic153DgmSH9), not Chaturanga. |
| `durgapur-sector-2c` | Illustrated recurring visitor appeal [DG21]; Delhi Akshardham **2026 plan** [DG26] + [DP]. | 23.5177787, 87.3548017; [Sector 2C Durga Mandap](https://goo.gl/maps/YU755ZZh7wb8A5kPA). |
| `durgapur-buddha-bihar` | Explicit unique theme-pandal reporting in **2021** [DG21]; women-focused **2026 plan** [DG26]. | 23.5517329, 87.3110228; [Buddha Bihar Sarbojanin](https://goo.gl/maps/gWUHxb8sXZiaeev48), not the playground. |
| `durgapur-marconi` | Major illustrated pandal [DG21]; BAPS Hindu Mandir, Abu Dhabi **plan** [DP] + named current guide [DF]. | **Corrected** to 23.5666714, 87.3117825; [Marconi Dakshin Pally Durgapuja Maidan](https://maps.app.goo.gl/T2D3uK17GeWnmN4K9). Stable ID retained. |
| `durgapur-shankarpur` | Shri Krishna Dwarka Nagari architecture and photographic selection: [DG26] + [DP], **plan**. [DF] names the annual host. | **New** 23.5269002, 87.3571152; [Shankarpur Durgapuja Ground](https://maps.app.goo.gl/wNFGmFn2nJd9MGZn7), Shankarpur Road / Arrah Kalinagar. |
| `durgapur-fuljhore` | Distinctive annual themes [DG21]; Sonar Bangla **plan** [DP], plus current [2026 first look](https://www.youtube.com/watch?v=rpEUx0X674U). Phulberia is not assumed to be an alias. | **New** 23.5365038, 87.3373979; [Fuljhore Durgapuja](https://maps.app.goo.gl/Yc8ncfh5VNpvRfGz8). Current named entity resolves the old blank panel. |
| `durgapur-chaturanga` | Historical pandal and visitor appeal [DG21]; Prem Mandir **plan** [DG26] + [DP]. | **New** 23.5425994, 87.302029; [Chaturanga Durga Puja](https://maps.app.goo.gl/PCQyARt5FecyAUyD8). The old Cement Park mislink remains rejected. |
| `durgapur-agrani` | Major architectural work [DG21] + [DP]; **reported 2026** Akshardham in the [October 16 post](https://www.instagram.com/reel/Dei6-7kR4c_/). | **New** 23.5619493, 87.2748116; [New Agrani Puja Ground](https://maps.app.goo.gl/2B8Hwps1D8xCphUH6) linked by [DF]. Not the old club or an assumed school. |
| `durgapur-bhiringi-nabarun` | Phire Dekha **plan** [DP]; [DF] separately names Bhiringi Nabaroon. Nabakaran is not an accepted alias. | **New** 23.5480658, 87.2699157; [Bhiringi Nabaroon Durga Mandir](https://maps.app.goo.gl/KoDBhFaGPjid59PfA). |
| `durgapur-54-foot-benachity` | Ayodhya Ram Mandir **plan** [DP] + [DG26]. [DF] explicitly labels one map link **Khudiram Math, 54 Feet**. | **New** 23.5555387, 87.2855941; [Khudiram Math, B/15 54 Feet Road](https://maps.app.goo.gl/RPkrohnts4ZvvYV49). Count once; do not infer a measured height. |

[PH]: https://pandalhoppers.in/
[DH]: https://www.instagram.com/reel/DefALNPBHms/
[KH]: https://www.instagram.com/reel/DeOemZmoM-L/
[RN]: https://www.youtube.com/watch?v=n6Y9R7bP8T4
[NS]: https://www.instagram.com/reel/Decb8PIPBZW/
[DG21]: https://www.beautyofdurgapur.com/famous-durga-puja-pandals-durgapur/
[DG26]: https://myaaspaas.in/blog/durgapur-durga-puja-2026-17-must-visit-pandals-themes-and-route-guide-from-raniganj-panagarh-and-barjora
[DP]: https://www.instagram.com/reel/DeFgl6KzIDV/
[DF]: https://www.youtube.com/watch?v=0GBWlLTUoFA

### EXCLUDED: No Default Trip Entry

| Entry | Decision and source-backed gap |
| --- | --- |
| SEPCO | Mapped ID retained, `eligibleMain: false`. The [sixteen-name guide](https://myaaspaas.in/blog/durgapur-durga-puja-2026-16-famous-pandal-locations-and-route-map) establishes identity; [DG26] supplies one unconfirmed Nagaland concept, not two qualifying art sources. |
| Palashdiha | Research only. [DG26] mentions lighting; a second qualifying major-art/photographic report and exact host remain missing. |
| Dumurtala | Research only. A locality entry in the sixteen-name guide; Jhumurtala's poster theme is not transferred by an assumed alias. |
| Club Santose | Research only. Major-art evidence and Santose/Santosh organiser identity remain unresolved. |
| Gopalmath | **Qualified theme, `needs-location`**: [DG26] + [DP] describe imaginative art, but this pass did not match the annual ground. No generated locality pin or main-trip entry. |
| Chandidas Rajendra Prasad | Research only. [October 17 report](https://onkarbangla.com/durgapur-actor-prasenjit-attend-durgapuja-of-chandidas/) covers a celebrity appearance and a 66th edition, not qualifying pandal design; exact ground still unverified. |
| New Upper Chelidanga | **Heritage**, not default theme curation. [Organiser retrospective](https://www.instagram.com/p/DdJqynRCB3v/) explicitly recalls 2023 and states a tradition since 1966. [Current opening video](https://www.youtube.com/watch?v=JQxDo-5IJYc) is not a theme or exact-ground confirmation. |
| Simultala | Research only. [PH] supplies a rural-art claim; no second qualifying source and exact annual-host match were established. |
| Apcar Garden | Research only. [PH] supplies one Rajasthan-themed claim; the [latest named video](https://www.youtube.com/watch?v=_tQlwk18uaE) has an empty description. The earlier Boys Park result is not accepted as the annual puja host. |
| TN School; Kalikrishna Ashram; Burnpur Town / Bari Maidan | Removed from exported leads. User exclusion, past one-day Mahalaya observance, and temple-complex-only evidence respectively; audit links and reasons are above. |
| Separate `durgapur-khudiram-math` lead | Removed as a duplicate host, not another puja. `REGIONAL_ID_ALIASES` resolves it to `durgapur-54-foot-benachity` on the explicit [DF] map-link label. |

No login, subscription, CAPTCHA, unsafe TLS, creator DM or session copy was used to fill a gap. The [October 13 Anandabazar article](https://www.anandabazar.com/west-bengal/bardhaman/puja-pandals-across-burnpur-asansol-are-being-decked-out-in-various-themes-prnt/cid/1719302) exposes a Burnpur introduction but gates the rest behind a subscription; inaccessible named-puja details are not evidence. [Asansol Vibes on Facebook](https://www.facebook.com/AsansolVibes/videos/asansol-durga-puja-themes-2026asansol-asansolcity-asansolcityofbrotherhood/999474663112184/) showed a login wall. The public police PDF's previously documented TLS/403 restriction was not retried with weaker security.

### Coordinate Decisions

The public [DF] description supplies actual map links. Named map headings, addresses and feature IDs were checked before accepting numbers. Google Maps' ordinary Directions control exposed both the **place feature** `!3d/!4d` pair and, sometimes, a different **driving approach** `!1d/!2d` pair. Only the named feature is stored. Neither the `@` viewport nor an automatically suggested origin is used or retained as a user location.

- Nabarun: store **23.5480658, 87.2699157**, not driving endpoint **23.5480562, 87.2699434**.
- Rabindranagar: store **23.6885322, 86.9442909**, not driving endpoint **23.6884884, 86.9443292**.
- Kalyanpur: the initially blank Adi/Scheme 2 viewport URLs were rejected. One source-name map lookup followed by the exact named result established distinct puja features. Adi's nearby committee-office point **23.7022148, 86.9580927** was not substituted.
- Marconi: the current annual-puja guide points to the named Dakshin Pally maidan. It replaces generic park midpoint **23.5663757, 87.3107181** with **23.5666714, 87.3117825** under the same ID. The other thirteen original coordinates, including every food and sight, are unchanged. The old park source remains in the historical audit below, not as another default puja.

### Current UI Contract

The owned implementation is in [../src/data/regionalPlaces.ts](../src/data/regionalPlaces.ts), [../src/data/placeInsights.ts](../src/data/placeInsights.ts), and the source/preview metadata module [../src/data/regionalCuration.ts](../src/data/regionalCuration.ts). No application, map, trip panel, home hook, style or routing engine was edited.

- Use `CURATED_REGIONAL_PANDALS` or `THEMED_REGIONAL_IDS` for default regional pandal browsing. `REGIONAL_SELECTION[id]` exposes `eligible: true | false | 'needs-location'`, `eligibleMain`, classification, EN/BN reasons, current theme/year/status, historical theme/year/source, source URLs and distinct location/availability/parking/car-access states.
- Keep `REGIONAL_PLACES` as the raw stable-ID registry for history and explicitly optional food/sights. **Do not use the whole raw registry as the default nearby or automatic-arrival catalogue.** Resolve the Khudiram alias when restoring older IDs, without inventing a second stop.
- All eight `UNLOCATED_PUJA_LEADS` have `eligibleMain: false`, no coordinates and no journey-stop fields. Do not show that list in the main trip flow. A deliberate separate research view may show sources and **Awaiting map location**; no automatic centroid, route insertion or check-in. Heritage requires its own explicit label and opt-in.
- `REGIONAL_THEME_SEEDS` supplies small Asansol, Durgapur and cross-city **candidate sets**, not an ordered road route, a farthest-city decision or a same-day feasibility guarantee. The parent must use the actual user start, selected stops, daylight, return time and validated road/access data.
- Join `PLACE_INSIGHTS[id].media.previews` for newest-first source previews. `media.status: 'external-posts'` does not mean a licensed local photo. Use `getRegionalPreviewEmbedUrl(preview.id, explicitConsent)` only after a user click; it returns null by default. Render the canonical link even when an embed cannot play. See [REGIONAL_MEDIA.md](REGIONAL_MEDIA.md).

```ts
import { PANDALS } from './pandals'
import { CURATED_REGIONAL_PANDALS, FOOD_STOPS, SIGHT_STOPS } from './regionalPlaces'

const pandalCandidates = [...PANDALS, ...CURATED_REGIONAL_PANDALS]
const optionalCandidates = [...FOOD_STOPS, ...SIGHT_STOPS]
```

Only explicit selected IDs should enter a trip or arrival controller. An unknown opening/access status is not a missing map location, and a mapped point is not proof that a vehicle can stop there. UI integration and driving approach work belong to the other roles.

### Bounded Research And Validation

Exactly **ten new targeted search-engine queries**, with Shankarpur first. Public source pages, source-linked maps, named-map disambiguation, public post timestamps and provider embedding checks were direct follow-ups, not additional search-engine queries. No claim of exhaustive city coverage:

1. `Shankarpur Durgapur Durga Puja 2026 theme pandal`
2. `Durgapur Palashdiha Chaturanga 2026 Durga Puja theme`
3. `Asansol Rabindranagar 2026 Durga Puja theme`
4. `Asansol Kalyanpur 2026 Durga Puja theme`
5. `Asansol "Netaji Sporting" 2026 puja theme`
6. `Asansol Simultala Apcar 2026 Durga Puja theme`
7. `Durgapur Agrani "54" Nabarun 2026 puja theme`
8. `Durgapur Fuljhore Chandidas 2026 Durga Puja theme`
9. `Asansol Dhemomain "New Upper Chelidanga" 2026 puja theme`
10. `Durgapur SEPCO Marconi Urvashi Buddha Bihar 2026 theme`

YouTube's generic text fetch returned 401, but one ordinary fresh, unauthenticated browser check succeeded. The public description supplied the map anchors and the player supplied explicit publication and embed-permission metadata. No authentication or anti-wall bypass was used. Instagram's public time elements resolved dates instead of using relative ages or search snippets. The public research browser was closed after verification. A dedicated Node controller avoided output interference from concurrent UI work; unrelated terminal output was not counted as a pass.

[../tests/unit/regional-data.test.ts](../tests/unit/regional-data.test.ts): **20 tests passed**. The **scoped TypeScript check passed** for the three owned data modules and that test, using ES2023, bundler resolution, strict/no-unused/erasable-syntax settings and `--noEmit`. Checks retain unique IDs, per-fact identity/address/coordinate requirements, all non-Marconi original coordinates, explicit corrected Marconi evidence, alias deduplication, TN absence, main-selection exclusion, theme/history/year distinctions, canonical media metadata and consent defaults. In-memory exports independently produced the counts above. No global E2E, full app build or concurrent UI behavior is certified.

Requested exact GPT-6 Astra (Copilot) runtime remains **unverified**. No fallback model, subagent, account access, Git operation, publication or unrelated private-parent document access was used.

## Earlier Checkpoint (Historical)

Everything below is the earlier audit, not current counts, map corrections or UI instructions. The current selection and preview contract above supersede its count-filling and default manual-lead approach.

Latest bounded public-source follow-up: **2026-10-17T21:34:23Z** (18 October 2026, 03:04:23 IST). The original fourteen regional records retain their initial review timestamp, **2026-10-17T20:55:27Z**. `verifiedOn` uses the UTC date, not an event date or field-survey date. Public research only; no accounts, reservations, private parent documents, Git operations or publication. Requested exact GPT-6 Astra (Copilot) runtime remains unverified; no fallback model or subagent was used.

### Historical Coverage

| Area tab | Original Kolkata pandals | Mapped regional pandals | New pins this follow-up | Manual leads | Food stops | Sights |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Kolkata | 33 | 0 | 0 | 0 | 2 | 1 |
| Asansol area | 0 | 1 | 1 | 10 | 3 | 1 |
| Durgapur area | 0 | 6 | 4 | 13 | 3 | 2 |

**The follow-up goal of eight new major pandals per city is not achieved.** Five new pins passed: Dhemomain in Asansol; Buddha Bihar, Urvashi, Cement Park and Sector 2C in Durgapur. SEPCO and Marconi remain unchanged. This is partial coverage, not a claim that other important pujas do not exist. No minor parks, duplicate polygons, hotels, sights or manual leads were counted as mapped pandals.

There are **19 regional stops**, **23 unlocated leads**, **44 insight records** (19 regional stops, 23 leads and two existing Kolkata pandals), five dated coverage links, **zero verified trending places**, and **zero new photographs**, whether 2026 or archival. The combined mapped catalogue has **52 stops: 40 pandals, eight food stops and four sights**. By city it has Kolkata 36, Asansol 5 and Durgapur 11 mapped stops. The original fourteen regional entries and eight historical photographs were preserved. See [REGIONAL_MEDIA.md](REGIONAL_MEDIA.md).

### Historical Data Contract (Superseded)

- [src/data/regionalPlaces.ts](../src/data/regionalPlaces.ts#L1) retains its existing exports and adds `UnlocatedPujaLead`, `UNLOCATED_PUJA_LEADS` and `REGIONAL_FOLLOWUP_CHECKED_AT`. `REGIONAL_SOURCE_CHECKED_AT` is not silently refreshed for older facts.
- `RegionalPlace` extends the existing `JourneyStop` with required `city`, `kind`, `district`, `coordinateRole`, and `entrySurveyed: false`. The existing `City`, `JourneyStop`, `Zone` and `Pandal` definitions are unchanged.
- [src/data/placeInsights.ts](../src/data/placeInsights.ts#L1) exports `PLACE_INSIGHTS`, `RECENT_COVERAGE`, `PLACE_INSIGHT_LABELS`, and the `PublicPlaceSource`, `RecentCoverage`, `FoodStopDetails`, `PlaceInsight` types. An absent insight or `history: null` means no sourced history is supplied; use the bilingual `noHistory` label.
- `UnlocatedPujaLead` is **not** a `JourneyStop`. It contains `id`, `city`, `name`, `nameBn`, source-backed `address` or null, `sourceUrl`, optional `addressSourceUrl`, `locationNote`, `checkedAt`, and `requiresManualPin: true`. It has no coordinates, stop kind, visit duration, popularity or queue value. IDs are disjoint from every mapped stop.
- New mapped insights have optional `locationEvidence`: identity/address/coordinate source URLs, matched host name and address, coordinate basis, `confidence: 'approximate-host'`, and a limitation. These URLs must also appear in the insight's fact-tagged `sources`. `PublicPlaceSource.note` records source-specific ambiguity without treating it as a confirmed event fact.
- `PLACE_INSIGHTS` now also contains unlocated IDs, so the UI can show their original summaries and sources. Those insights have no `locationEvidence`, no accepted coordinate source and no recommendation ranking. `PLACE_INSIGHT_LABELS.locateReportedPandal` supplies **Locate a reported pandal** and its Bengali label.
- Sources distinguish publication/update dates from review time. An undated page has `publishedAt: null`; no artificial publication timestamp was assigned. Coverage dates with day precision are ISO dates, not claimed midnight timestamps.
- `visitMinutes` is an editorial planning allowance. Every food stop uses 45 minutes, explicitly `durationBasis: 'planning-estimate'`. Sights use 30-60 minutes and pandals 30 minutes. No measured queues are asserted: `queueMinutes` and `popularity` are absent.
- Food cuisine is included only where stated by the named source. `vegetarianOptions` is not a vegetarian-only or allergen guarantee. Accessibility, cost and detour minutes remain null. Only The Roor has operator-listed hours, explicitly requiring reconfirmation; park `24/7` tags were not reused as puja hours.
- Pins identify a mapped place, named grounds, or host venue. None is a surveyed gate, parking location, legal stopping point or verified car entrance. Garh Jungle and Kalyaneshwari are area-tab excursions, not assertions of city-centre proximity.

#### Earlier UI Merge (Do Not Use)

Keep [src/data/pandals.ts](../src/data/pandals.ts#L1) unchanged and normalize its optional fields in the consuming layer:

```ts
import type { JourneyStop } from '../types'
import { PANDALS } from './pandals'
import { REGIONAL_PLACES } from './regionalPlaces'

const journeyStops: JourneyStop[] = [
  ...PANDALS.map((place): JourneyStop => ({
    ...place,
    city: place.city ?? 'kolkata',
    kind: place.kind ?? 'pandal',
  })),
  ...REGIONAL_PLACES,
]
```

The resulting catalogue currently has 52 stops. Filter by `city` for area tabs and by `kind` for puja/food/sight controls. Join insights by `id`. Unlocated or city-wide coverage keeps `placeId: null`; it must not create a map pin. A guide associated with multiple places through `recentCoverageIds` remains one source, not multiple independent reports.

The earlier proposal rendered `UNLOCATED_PUJA_LEADS.filter((lead) => lead.city === selectedCity)` under **Locate a reported pandal**. That default UI proposal is superseded: the current policy hides research leads from the main trip flow. No neighbourhood geocoding, automatic route insertion or check-in was authorised by the earlier data.

This data change does not wire tabs, routes, automatic check-ins or a home location. The UI/route owner must keep food and sights opt-in, exclude unselected/non-pandal stops from puja check-ins, and evaluate car travel, daylight, opening, walking access, breaks and return-home feasibility separately. It does not establish that all three cities fit a same-day trip. No user home or personal start point is stored.

#### Earlier Map Provenance And Bounds

In the **initial review**, the existing public Geofabrik input was read without modification; its header independently reported **2026-10-14T20:21:12Z**. Source: [eastern-zone-261014.osm.pbf](https://download.geofabrik.de/asia/india/eastern-zone-261014.osm.pbf). That inspection used a bounded `osmium extract` pipeline and the existing `fast-xml-parser`, with no saved regional intermediate. **This follow-up did not read, change or filter the PBF, shared private inputs or the car agent's working files.** No new extract or research intermediate was created.

OSM node coordinates are copied from the snapshot. For SEPCO, Marconi and Saffron Grill, the coordinate is the midpoint of the minimum/maximum latitude and longitude of the mapped feature's member nodes, **not** a surveyed entrance or an asserted polygon centroid. Source rows preserve the OSM object and last-edit timestamp. Attribute OpenStreetMap contributors and retain [ODbL attribution/terms](https://www.openstreetmap.org/copyright) when displaying or distributing this derived data. OSM last-edit dates are not operational verification dates.

The five follow-up points instead use public map destinations linked from named-puja coverage or a regional directory. Stored values come from the place destination's `!3d`/`!4d` pair, **not** the `@lat,lng` viewport centre. The selected map entity and address were checked separately. Exact decimal transcription is not survey accuracy: every point remains approximate, with no entrance/parking/current-opening guarantee. A matching club or host can qualify without an OSM puja tag; an unrelated park or neighbourhood centre cannot. Agrani was withheld because a reported move makes its historical club anchor ambiguous for this trip.

The public [walking graph](../public/data/kolkata-walking.json#L1) currently reports south `22.44`, west `88.28`, north `22.64`, east `88.49`. It covers Kolkata only and is not a regional car graph. The car-road owner needs its own regional extraction/coverage validation; this work did not modify the graph or infer intercity routes.

Unit tests use broad catalogue sanity envelopes, not administrative boundaries or road coverage: Asansol latitude `23.5-23.85`, longitude `86.8-87.15`; Durgapur `23.35-23.70`, `87.15-87.55`; Kolkata `22.3-23.0`, `88.15-88.6`. These are scope checks, not user-home data.

### Earlier Per-Place Evidence

The following retained rows use the initial timestamp. New follow-up rows are listed separately below. English/Bengali descriptions are short original summaries/transliterations, not claims that the Bengali display name is the organiser's registered spelling. History is null where not adequately established.

| ID / place | Published pin (latitude, longitude) | Sources and facts used |
| --- | --- | --- |
| `durgapur-sepco` | 23.5498992, 87.31662885 | [OSM way 962677741](https://www.openstreetmap.org/way/962677741), named Sepco Pujo Ground Park, edited 2021-07-08; bounds midpoint. [AasPaas guide, 2026-10-12](https://myaaspaas.in/blog/durgapur-durga-puja-2026-16-famous-pandal-locations-and-route-map) names SEPCO puja. History unknown; separate Sepco Park is not substituted. |
| `durgapur-marconi` | 23.5663757, 87.3107181 | [OSM way 963128057](https://www.openstreetmap.org/way/963128057), Marconi Pujo Park, edited 2021-07-10; bounds midpoint. Same dated [guide](https://myaaspaas.in/blog/durgapur-durga-puja-2026-16-famous-pandal-locations-and-route-map) names Marconi. History unknown. Adjacent ground 963128152 is not another organiser. |
| `food-kolkata-college-street-coffee-house` | 22.576097, 88.3638913 | [OSM node 4571180589](https://www.openstreetmap.org/node/4571180589), edited 2023-12-05: name, 15 Bankim Chatterjee Street, coffee-shop/Indian tags. [Wikipedia](https://en.wikipedia.org/wiki/College_Street_Coffee_House): Coffee Board venue in 1942 and literary adda; the older Albert Hall date is not the restaurant's founding date. Secondary article has citation limitations. |
| `food-kolkata-kewpies` | 22.5365892, 88.3509509 | [OSM node 4393259890](https://www.openstreetmap.org/node/4393259890), edited/mapper-checked 2023-10-28: name, 2 Elgin Lane, Bengali/Indian tags. Hours, access, cost and current menu unknown. |
| `food-asansol-66-grand-trunk` | 23.6817, 86.988 | [Operator dining](https://hotelasansolinternational.com/barandrestaurant/): restaurant name, Indian/Chinese/Continental menus, vegetarian and non-vegetarian options. [Operator contact](https://hotelasansolinternational.com/contactus/): 66 G.T. Road (East), Murgasol. [Wikivoyage hotel listing](https://en.wikivoyage.org/wiki/Asansol#Sleep): matching hotel/address and approximate host coordinate. All are undated. The operator's Google-map viewport centre was deliberately not used as a venue pin. |
| `food-asansol-gangar-hotel` | 23.6889, 86.9497 | [Wikivoyage food listing](https://en.wikivoyage.org/wiki/Asansol#Eat_and_drink): Gangar Hotel, Court Compound, Bengali food and listing coordinate. Undated; no current-operation, quality, price or hygiene claim. |
| `food-asansol-garam-masala` | 23.6857872, 86.974351 | [OSM node 7466818596](https://www.openstreetmap.org/node/7466818596), edited 2021-07-05: restaurant identity and coordinate only. Street address, cuisine and dietary status intentionally unknown; a similarly named travel listing was not used to assert a branch match. |
| `food-durgapur-roor` | 23.540114, 87.2925209 | [OSM node 6757723933](https://www.openstreetmap.org/node/6757723933), edited 2019-08-29: host location, source spelling "Peerles Inn Hotel". [Operator dining](https://www.peerlesshotels.com/peerless-hotel-durgapur-dining.php): The Roor, lobby level, Indian/Chinese/Continental/Italian, listed meal periods. [Operator hotel page](https://www.peerlesshotels.com/peerless-hotel-durgapur-overview.php): Sahid Khudiram Sarani, City Centre. Operator pages undated; hours checked, not guaranteed for Puja. |
| `food-durgapur-qmin` | 23.4857607, 87.3856893 | [OSM node 11977697144](https://www.openstreetmap.org/node/11977697144), edited 2024-06-13: Qmin Restaurant & Bar - Ginger Durgapur, NH-2/Rajbandh address and point. No cuisine inference from brand or a claim of a low driving detour. |
| `food-durgapur-saffron-grill` | 23.5696998, 87.33568665 | [OSM way 778606067](https://www.openstreetmap.org/way/778606067), edited 2020-03-05: restaurant building, IQ City Road address, bounds midpoint. Cuisine and operation unknown. |
| `sight-kolkata-victoria-memorial` | 22.5449, 88.3425 | [Wikipedia](https://en.wikipedia.org/wiki/Victoria_Memorial,_Kolkata): name, Queens Way address, monument coordinate, construction 1906-1921 and public opening in 1921. No tickets, hours or car gate verified. |
| `sight-asansol-kalyaneshwari-temple` | 23.777222, 86.828333 | [Wikipedia](https://en.wikipedia.org/wiki/Kalyaneshwari_Temple): Shakti shrine, Kalyaneshwari/Asansol Sadar and coordinate 23 degrees 46 minutes 38 seconds N, 86 degrees 49 minutes 42 seconds E, converted to decimal degrees. Long worship tradition does not date the present building. |
| `sight-durgapur-barrage` | 23.4754, 87.3023 | [Wikipedia](https://en.wikipedia.org/wiki/Durgapur_Barrage): Damodar barrage coordinate, 1955 construction, 1964 transfer and the Paschim Bardhaman/Bankura setting. Point identifies the structure, not a permissible stopping or pedestrian location. |
| `sight-durgapur-garh-jungle` | 23.6061, 87.4296 | [District tourism](https://paschimbardhaman.gov.in/tourist-place/garh-jungle/), displayed update 2021-08-03: Kanksa location and Shakta/Medhas Muni/Surath tradition. [Wikipedia](https://en.wikipedia.org/wiki/Garh_Jungle): published area coordinate. Religious origin account is labelled tradition. Not substituted for Deul Park. |
| Existing `tala-prattoy` insight only | Existing pin unchanged | [Organiser about page](https://www.talaprattoy.com/about.html): installation art, sculpture and craftsmanship. [2026 event page](https://www.talaprattoy.com/event-2026.html) retained as an external source, but no publication date means it is not in the rolling recent-coverage set. No founding year, traffic or real-time access claim adopted. |
| Existing `sovabazar-rajbari` insight only | Existing pin unchanged | [Wikipedia](https://en.wikipedia.org/wiki/Shobhabazar_Rajbari): family-palace association, reported 1757 puja tradition and distinction between houses. Citation warning carried into the short insight. No access entitlement or household details inferred. |

#### Earlier Five New Mapped Pujas

The shared Durgapur identity source is [Beauty of Durgapur / Swarnab Dutta](https://www.beautyofdurgapur.com/famous-durga-puja-pandals-durgapur/), dated **2022-01-03** but explicitly covering **2021**. It establishes annual-puja identities and historical addresses, not 2026 themes or hours. The [2026 sixteen-name guide](https://myaaspaas.in/blog/durgapur-durga-puja-2026-16-famous-pandal-locations-and-route-map) independently names Buddha Bihar and Urvashi. The [seventeen-name guide](https://myaaspaas.in/blog/durgapur-durga-puja-2026-17-must-visit-pandals-themes-and-route-guide-from-raniganj-panagarh-and-barjora), dated 2026-10-13, also mentions Cement Park and Sector 2C; its poster themes, route order and variant names are not adopted.

| ID | Published destination coordinate | Identity/address match and limitation |
| --- | --- | --- |
| `asansol-dhemomain` | 23.7043778, 86.9083866 | [Pandal Hoppers](https://pandalhoppers.in/) names Dhemomain Colliery Durga Puja, Dhemomain/Sitarampur. Its map search returned the exact [Dhemomain Durga Puja Committee](https://www.google.com/maps/place/Dhemomain+Durga+Puja+Committee/data=!4m5!3m4!1s0x39f71ff3710de2ed:0x6c7560b82160dee7!8m2!3d23.7043778!4d86.9083866) entity, separately verified with an Asansol address. The adjacent football ground and generic colliery were rejected. Approximate committee host, not a gate; the secondary directory's queue/theme/visitor claims are not used. |
| `durgapur-buddha-bihar` | 23.5517329, 87.3110228 | Historical article and its [map link](https://goo.gl/maps/gWUHxb8sXZiaeev48) both identify Buddha Bihar Sarbojanin at 1 Bhagat Singh Marg, Hatora, C-Zone. Uses the article-linked destination pair, not the separate playground. Postal codes differ between sources and are omitted. |
| `durgapur-urvashi` | 23.5365902, 87.3049101 | Historical prose and the recent guide place Urvashi in City Centre. The [linked map](https://goo.gl/maps/hYUQwcfp4uap3VUm7) resolves to Urvashi Durga Puja Maidan, Urvashi Complex, 2nd Street, Bengal Ambuja Housing Complex. The article's repeated Kaliganj/Jawaharlal Nehru Road address conflicts and is explicitly rejected. |
| `durgapur-cement-park` | 23.5396265, 87.2927462 | Historical article and Cement Park's [own map link](https://goo.gl/maps/3qEJjfic153DgmSH9) match the named puja ground on Shahid Khudiram Sarani, Recol Park, City Centre. The article's Chaturanga link wrongly resolves to this same entity; it is not a second pin. |
| `durgapur-sector-2c` | 23.5177787, 87.3548017 | Historical article and [linked Sector 2C Durga Mandap](https://goo.gl/maps/YU755ZZh7wb8A5kPA) agree on C-51, Bhimpalashri Sarani, Bidhannagar. Map hours/accessibility badges and visitor reviews are not adopted as current festival facts. |

#### Earlier Manual-Location Leads

These are **23 identities needing manual location or host reconciliation**, not 23 extra trip stops or an assertion that all are currently open. Each has its own source links and `locationNote` in the data; the table groups only leads with the same evidence issue.

| City / count | Names | Why no pin |
| --- | --- | --- |
| Asansol / 3 | Kalyanpur K-Sector; Adi Puja; Scheme 2 | [Public caption](https://www.instagram.com/reel/DeOemZmoM-L/) distinguishes all three. Separate readable directory addresses exist for [K-Sector](https://bharatbz.com/west-bengal/k-sector-kalyanpur-housing-durga-puja-70160) and [Adi Puja](https://bharatbz.com/west-bengal/kalyanpur-adi-puja-1490102), but no accepted numeric ground coordinate. Pandal Hoppers' Scheme 2 / Adi Puja conflation is rejected. |
| Asansol / 1 | New Upper Chelidanga Athletic Club | [Organiser post](https://www.instagram.com/p/DdJqynRCB3v/), published 2026-09-11, supplies Near Court Railway Crossing and explicitly recalls 2023. Its stated tradition since 1966 is attributed to the organiser, not inferred from an edition number. The exact ground remains unlocated; Upper Chelidanga is not treated as an alias. |
| Asansol / 3 | Rabindranagar Unnayan Samity; Netaji Sporting Club; Simultala Sarbojanin | [Directory](https://pandalhoppers.in/) supplies localities. Source-linked public maps resolved named destinations, but exact numeric feature coordinates were not verified. Netaji/Simultala Share dialogs exposed no usable coordinate link; no viewport or short-plus-code guess was used. |
| Asansol / 1 | Apcar Garden Sarbojanin | Directory route resolved to Apcar Garden Play Ground / Boys Park. A park alone is not the verified puja ground. |
| Asansol / 1 | Burnpur Town Puja, Bari Maidan | [Public caption](https://www.instagram.com/reel/DejnWQlqISF/) reports a Durga Pujo association; [News18](https://bengali.news18.com/photogallery/south-bengal/multiple-temples-at-once-your-mind-will-be-calm-in-the-green-environment-of-nature-where-to-see-l18-smc-local18-2321578.html), updated 2025-08-30, identifies the temple complex and explicitly dates the samity to 1945. Neither establishes the requested independent annual-festival/ground match. OSM node 4517801656 is still not a pandal pin. |
| Asansol / 1 | Kalikrishna Ashram | Existing dated coverage concerns a one-day Mahalaya observance at Dhenua/Burnpur. Not evidence of an open trip-date pandal; no exact ground pin. |
| Durgapur / 9 | Dumurtala; T.N. School; Club Santose; Shankarpur; Palashdiha; Bhiringi Nabarun; 54 Foot Benachity; Khudiram Math; Gopalmath | Names/localities come from the sixteen-name guide. No exact mapped host match in this bounded pass. Do not merge Dumurtala/Jhumurtala, Nabarun/Nabakaran or other poster variants without evidence; "54 Foot" is not a measured structure height. |
| Durgapur / 1 | Fuljhore Sarbojanin | Historical street address and old named destination exist, but the current map place panel was blank. Retained for manual host confirmation rather than claiming a live matched place. |
| Durgapur / 1 | Chaturanga | Historical address: Non-Company Housing Estate, City Centre. Its [published map link](https://goo.gl/maps/Bc1z1qL5hk23HiFo7) actually resolves to Cement Park; rejected. |
| Durgapur / 1 | Agrani Sanskritik Parisad | The historical article links a named club on Agrani Lane, Benachity. A public visitor report mentions a 2024 school-ground move. That report is uncorroborated, so neither a relocation nor the club as the present pandal is asserted. |
| Durgapur / 1 | Chandidas Rajendra Prasad Sarbojanin | [Onkar Bangla, 2026-10-17](https://onkarbangla.com/durgapur-actor-prasenjit-attend-durgapuja-of-chandidas/) identifies the annual puja and locality, not a precise ground. No substitution of Rotary Park or another Rajendra Prasad park; no founding year derived from "66th". |

### Earlier Recommendations And Recent Coverage

"Editor pick" is an editorial suggestion based on a named established puja ground, architectural significance or a source-described cultural tradition. It is not an official must-visit ranking, endorsement, accessibility assessment or safety assurance. "Suggested food stop" means a named centre/corridor candidate with the stated source and known cuisine if available. No comparable ratings were collected, so none is labelled "best". On-route suitability remains dependent on the user's selected route; no calculated detour is supplied.

The original five coverage records are retained, dated within 14 days of their review. Titles may be concise English link labels; summaries are original paraphrases. No publication time is inferred from a date-only source. The 2022 article about 2021 and the September 2026 throwback about 2023 are normal sources, not rolling recent-event evidence. Three new points use the existing `featured` flag (Dhemomain, Urvashi and Buddha Bihar); the basis is the stated editorial selection, never trend metrics.

| Coverage ID | Publisher / claimed date | Use and limit |
| --- | --- | --- |
| `asansol-kalyanpur-20261008` | [ASANSOL City Of Brotherhood public post](https://www.instagram.com/reel/DeOemZmoM-L/), 2026-10-08 | Distinguishes K-Sector, Adi Puja and Scheme 2. Public caption/date readable without login; playback failed. One observed like count has no comparative baseline and is not stored as a trend. Grounds unlocated. |
| `asansol-kalikrishna-20261010` | [Sangbad Pratidin](https://www.sangbadpratidin.in/durga-puja/puja-coverage-bengal/durga-puja-2026-exceptional-one-day-durga-puja-organised-in-asansol/pid/1379275/), updated 2026-10-10 | Describes a single-day Mahalaya observance at Kalikrishna Ashram, Dhenua/Burnpur. Past-event coverage, not current opening evidence; no guessed pin. |
| `durgapur-guide-20261012` | [AasPaas / Swastika Paul](https://myaaspaas.in/blog/durgapur-durga-puja-2026-16-famous-pandal-locations-and-route-map), 2026-10-12 | Named list; no measured popularity, geographic entrance survey or verified theme adoption. |
| `asansol-police-guide-20261015` | [Onkar Bangla](https://onkarbangla.com/asansol-durgapur-police-commissionerate-sets-up-for-cyber-awareness-and-releases-puja-guide-mapr-2026-25-booths/), 2026-10-15 | Reports a guide for both cities. [Official police homepage](https://asansoldurgapurpolice.wb.gov.in/) independently links a 2026 guide. PDF contents not verified, so no list/traffic rules derived from it. |
| `durgapur-chandidas-20261017` | [Onkar Bangla](https://onkarbangla.com/durgapur-actor-prasenjit-attend-durgapuja-of-chandidas/), 2026-10-17 | Names Chandidas Rajendra Prasad Sarbojanin and reports a 66th edition. No conversion to a founding date, influencer endorsement, repeat appearance, live crowd or assumed park location. |

All `trending` values are false and all `comparativeEvidence` values are null. No verified same-place, independent recent comparative evidence was established. Zero dated Kolkata links qualified in this bounded pass; the undated organiser page remains a normal source instead.

### Earlier Gaps

These are research outcomes, **not provenance for included locations**:

- Kalyanpur identities remain distinct; directory addresses did not establish numeric grounds. The WorldOrgs page returned HTTP 403 and Trip.com returned HTTP 432; neither was bypassed or accepted from snippets alone.
- New Upper Chelidanga now has an organiser-backed manual lead. Upper Chelidanga, Ismile Chhatra Sangha, Sugam Park, Triveni More and IISCO Lodge were not established as mapped pujas in this bounded pass; no locality/post-office substitution or claim of an exhaustive city search.
- Burnpur Town Puja remains a manual lead, not an OSM-derived pandal pin. The separate [Eai Banglai article](https://eaibanglai.com/burnpurspecialevent/) describes a Chaitanya Mahaprabhu relic event at Bari Maidan, not annual Durga Puja proof.
- Urvashi and Buddha Bihar are now mapped through exact named puja listings, not generic adjacent parks. Other incomplete Durgapur candidates are retained above. No unsupported alias from Tilak Road, a neighbourhood or a poster is introduced.
- In the initial review, the official police guide download returned a forbidden fetch result and a standard TLS client reported unsafe legacy renegotiation disabled. This follow-up rechecked the normal [official homepage](https://asansoldurgapurpolice.wb.gov.in/), which still links the guide, but did not retry the unsafe/forbidden PDF or weaken security. The official Facebook page and public route-video pages presented login walls; no login, mirror bypass or invented PDF contents.
- The public Overpass query returned HTTP 406. The already-created, permitted Geofabrik public input supplied OSM evidence instead; no new provider claims were inferred from the failed call.
- Pujo360 showed a 2025 header alongside indexed 2026 wording and reused stock imagery. No current condition, queue, popularity or photo evidence was adopted from it. A public YouTube detail request returned 401; snippets were not promoted to verified post metadata.
- Deul Park sources were not verified. Garh Jungle is included on its own evidence, not treated as an alias for a park, resort or the nearby Ichhai Ghosher Deul monument.
- Some travel/wiki listings are undated or old. Being available online does not prove present operation, menus, safety or accessibility.

#### Initial Search Log (Historical)

The earlier review issued ten public search queries. These are historical, not queries repeated or counted in this follow-up. Search results were discovery leads, never the sole source for an included pin.

1. Asansol Durga Puja 2026 Kalyanpur Chelidanga October.
2. Durgapur Durga Puja 2026 Urvashi Marconi Tilak Agrani October.
3. Asansol Durgapur police 2026 puja guide list.
4. Asansol Durga Puja 2026 October Kalyanpur Upper Chelidanga news.
5. Durgapur Durga Puja 2026 October Chandidas Agrani news.
6. Kolkata Durga Puja 2026 October Sreebhumi Tala Prattoy official.
7. Commons-scoped 2026 Durgapur Durga Puja photographs: only an unrelated 2010 file surfaced.
8. Commons-scoped 2026 Asansol Durga Puja photographs: no matching result.
9. Asansol hotel restaurant official Ramada Encore Asansol International dining.
10. Durgapur hotel restaurant official Courtyard Peerless Fortune dining.

#### Earlier Follow-Up Search Log

**Exactly eight search-engine queries**, using ordinary public Yahoo fetches. Source pages, source-published Google Maps search/direction links and their exact place destinations were direct follow-ups; no further search-engine queries, account access or broad image search was used.

1. `Asansol Durgapur Durga Puja major pandals club address map`: broad discovery; regional directories and route-video links, not verified pins.
2. `"Burnpur Town" "Durga Puja"`: mostly directories/social/video; no independent annual-festival news match.
3. `Durgapur "Urvashi" "Chaturanga" puja location map`: found the useful historical Beauty of Durgapur article with addresses and map links.
4. `Asansol "Chelidanga" "Rabindra" Durga Puja location`: route-video and directory leads; no accepted coordinate from snippets.
5. `"বার্নপুর" "টাউন" "পুজো"`: News18 temple-complex article, Eai Banglai non-Durga event and public social caption; annual-festival identity gap remains.
6. `Asansol "Kalyanpur" "Durga" map address`: distinct K-Sector/Adi directory leads; two readable addresses, blocked alternatives and no accepted numeric coordinate.
7. `Asansol "Upper Chelidanga" Durga Puja map`: organiser's New Upper Chelidanga retrospective found; 2023 content correctly separated from its 2026 posting date.
8. `Durgapur ("Nabarun" OR "54 Feet") Durga Puja map`: guide/video leads, no exact additional ground match.

The named-destination checks caught the Chaturanga/Cement Park link duplication, Urvashi's conflicting street text, Fuljhore's blank current place panel and Agrani's relocation uncertainty. Directory map follow-ups produced the verified Dhemomain committee point and unpinned Rabindranagar/Netaji/Simultala/Apcar leads. No fabricated count was used to reach eight.

### Earlier Validation

[tests/unit/regional-data.test.ts](../tests/unit/regional-data.test.ts#L1): **14 tests passed**. Coverage includes `JourneyStop` assignment, dynamic counts, all-ID uniqueness, city bounds, original fourteen coordinates, the unchanged 33-entry Kolkata count, independent per-fact pin sources, coordinate-free manual leads, wrong-host exclusions, source dates, null practical details and absence of invented trends/media. A new pin example checks Buddha Bihar's exact published destination pair and both source roles.

The **scoped TypeScript check passed**, using `tsc --ignoreConfig --noEmit` on the two owned data files and the regional unit test, with the application's ES2023/bundler/strict/no-unused/erasable-syntax settings. It emits no files and does not run the concurrent UI or car-routing work. No full build, full unit suite or UI workflow is certified here.

Direct in-memory module counts verified 19 regional stops, 23 manual leads, 44 insights and five coverage links. Original Kolkata source SHA-256 before/after: `cb017ccf60a42e0f0f3796dfda949f9619db6a57077658e7c163bff9f2c57571` (unchanged). Only the assigned data, unit test and two research documents were edited; no Git operation was used for validation.