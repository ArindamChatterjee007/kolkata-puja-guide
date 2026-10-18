# Regional Media Addendum

## Current Source Previews

Audit: **2026-10-18T06:58:56Z**. This section supersedes the earlier all-unavailable rendering contract below. The current data supplies **32 place-linked preview records** over **13 unique canonical source URLs**, including **6 consent-gated YouTube embeds**. Repeating a multi-puja source for its named places is not another independent report or photograph.

| Preview kind | Place-linked records | Meaning |
| --- | ---: | --- |
| Festival footage | 6 | Title and main description/caption explicitly identify 2026; capture date and live conditions are not independently verified. |
| Unverified footage year | 2 | Shankarpur has mixed-year description tags; Apcar has an empty description. Do not call these confirmed 2026 images. |
| Theme plans | 15 | Future-facing local guides or poster claims, not completed work. |
| Historical illustrated article | 8 | Individual named pandals from the 2021 article, published in 2022. |
| Organiser retrospective | 1 | New Upper Chelidanga's explicit 2023 retrospective, posted in 2026. |

**No new photographs were downloaded, copied, generated, hotlinked or licensed.** Every `thumbnail` is null. No platform thumbnail is treated as a licensed local asset. The existing eight historical Kolkata photographs remain unchanged and are not relabelled 2026. All `trending` values remain false; no engagement or fabricated social metrics are stored.

### Public Source Inventory

Dates below are exact public metadata when a time is shown. A date-only article has day precision, not an invented midnight publication time. Short titles are editorial link labels; the original source remains the authority.

| Source / associated place | Publication | Content-year decision / access |
| --- | --- | --- |
| [Shankarpur first look](https://www.youtube.com/watch?v=E6lIrXXk_Ww), mampi's magic | 2026-10-15T07:28:18Z | Title/opening description say 2026, but 2025/2024 tags also occur. `footageYear: null`; verified public video and permitted embed, not confirmed 2026 imagery. |
| [Fuljhore first look](https://www.youtube.com/watch?v=rpEUx0X674U), Durgapur Official | 2026-10-15T15:59:15Z | Title and description explicitly identify 2026; permitted embed. The channel name does not establish official organiser/government status. |
| [Rabindranagar pandal tour](https://www.youtube.com/watch?v=n6Y9R7bP8T4), Middleclass Bengali | 2026-10-16T04:40:02Z | Explicit 2026 title and descriptive pandal-art text; permitted embed. Theme wording differs from Pandal Hoppers and remains unresolved in selection metadata. |
| [Netaji Sporting Club, Asansol](https://www.youtube.com/watch?v=rLdtzBBmXwQ), Amrit Ganguly | 2026-10-16T02:34:06Z | Explicit 2026 title and description; permitted embed. Does not resolve conflicting theme titles or prove visitor access. |
| [Apcar Garden, part 4](https://www.youtube.com/watch?v=_tQlwk18uaE), Swarnadeep.Adhikari | 2026-10-17T07:10:00Z | Title claims 2026, description empty. `footageYear: null`; permitted embed in deliberate research view only. No annual host pin accepted. |
| [New Upper Chelidanga opening](https://www.youtube.com/watch?v=JQxDo-5IJYc), Amit Bhakti Vlogs | 2026-10-16T03:43:47Z | Title and description identify 2026 opening; permitted embed. Heritage/research only because major theme and precise host are unresolved. |
| [Dhemomain Ram Mandir-themed pandal](https://www.instagram.com/reel/DefALNPBHms/), ASANSOL City Of Brotherhood | 2026-10-14T18:15:38Z | Main caption explicitly describes the decorated 2026 pandal and recommends a visit. Public caption readable; playback failed. Link-only preview. |
| [Agrani Akshardham-themed pandal](https://www.instagram.com/reel/Dei6-7kR4c_/), Priti | 2026-10-16T06:47:06Z | Main caption explicitly names Agrani, 2026 and USA Akshardham. Public time element corrects the earlier October 15 search snippet. Playback failed; link only. |
| [Three Kalyanpur theme plans](https://www.instagram.com/reel/DeOemZmoM-L/), ASANSOL City Of Brotherhood | 2026-10-08T08:14:15Z | Individually names K-Sector, Adi Puja and Scheme 2. Three place associations, one source; future-facing plans, no footage-year claim. |
| [Ten Durgapur theme plans](https://www.instagram.com/reel/DeFgl6KzIDV/), Ashis Kumar Photography | 2026-10-04T20:38:32Z | Ten individually named place associations, one source. This is 5 October in IST; not an uncertain upload date. Plans only, no completed-footage claim or adopted ranking. |
| [Durgapur poster-listed plans](https://myaaspaas.in/blog/durgapur-durga-puja-2026-17-must-visit-pandals-themes-and-route-guide-from-raniganj-panagarh-and-barjora), AasPaas / Swastika Paul | 2026-10-13, day precision | Urvashi and Buddha Bihar preview associations. Author explicitly warns that poster claims are not confirmed final designs or locations. |
| [Durgapur 2021 illustrated guide](https://www.beautyofdurgapur.com/famous-durga-puja-pandals-durgapur/), Swarnab Dutta | 2022-01-03, day precision | Eight individual named-pandal associations; article and images explicitly cover **2021**. Link to publisher only; credits do not grant image reuse. |
| [New Upper Chelidanga retrospective](https://www.instagram.com/p/DdJqynRCB3v/), organiser | 2026-09-11T14:52:17Z | Explicitly recalls **2023**. `year` and `footageYear` are 2023, never 2026. Heritage/research only. |

The public [Netaji Sporting theme caption](https://www.instagram.com/reel/Decb8PIPBZW/), dated **2026-10-13T18:20:29Z**, is an additional evidence source, not another preview counted above. It says Kulfir Sikha, while the directory says Hamsa O Shikhar. Neither title is silently preferred.

The [Kulti Updates Dhemomain poster](https://www.instagram.com/p/DcVA3XqzqPt/) is explicitly marked **AI content**. It is not photographic evidence and is not a preview record. Generic festive montages without a named place, reposts prohibiting copying, comments, rankings and unrelated profiles are not used to fill the media count.

### Rendering API

[../src/data/regionalCuration.ts](../src/data/regionalCuration.ts) exports `REGIONAL_POST_PREVIEWS`, `RegionalPostPreview`, and `getRegionalPreviewEmbedUrl`. [../src/data/placeInsights.ts](../src/data/placeInsights.ts) attaches each place's previews newest-first under `PLACE_INSIGHTS[id].media.previews`, with `media.status: 'external-posts'`. Undated entries sort last. This status means source-hosted posts, not a licensed local image.

Each record contains `sourceType`, canonical `url`, `publishedAt`, `datePrecision`, `title`, `publisher`, `placeId`, `previewType: 'external-post'`, content `year`, separate `footageYear` and its evidence basis, `contentKind`, caption, `checkedAt`, `thumbnail: null`, and an optional verified embed policy. No raw HTML, social CDN URL, authentication data or tracking query is stored.

1. Filter places through `REGIONAL_SELECTION[id].eligibleMain` first. Media availability never grants a map pin or overrides a Heritage/research exclusion.
2. Before consent, render a familiar Video/Post/Article icon, caption, source date/precision, content year and canonical source link. Do not mount an iframe, load a third-party thumbnail, call an oEmbed endpoint, inject Instagram scripts or make a tracking request on page open. Lazy-loading an already mounted frame is not consent.
3. On the user's explicit **load video** action and consent, call `getRegionalPreviewEmbedUrl(preview.id, true)`. The default/false call returns null; unknown IDs and all Instagram/news records return null even with consent. Only the six verified YouTube records return a `https://www.youtube-nocookie.com/embed/...` URL.
4. Use the returned provider URL, `referrerPolicy: 'strict-origin-when-cross-origin'`, no autoplay and a stable responsive video container. Do not insert publisher-supplied HTML. Keep the canonical link present during loading, errors, provider blocking or unavailable playback.
5. Instagram is **link-only in this dataset**: public captions and timestamps worked, but playback/embedding was not verified. Any future official Instagram embed needs an independently verified provider option and an explicit consent click; public access alone grants no reuse licence.
6. Label `theme-plan`, historical article and retrospective records plainly. Never use publication year or current copyright year as a substitute for the footage year. Historical imagery cannot establish present opening, parking, traffic or crowds.

The [official YouTube embedding documentation](https://support.google.com/youtube/answer/171780) was read in an ordinary public browser with its privacy-enhanced section expanded. It explicitly permits changing the player host to `youtube-nocookie.com`. All six video records had public player metadata `playableInEmbed: true` and matching successful official oEmbed responses. One reproducible provider check is [Shankarpur oEmbed](https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DE6lIrXXk_Ww&format=json). The oEmbed thumbnail and HTML were **not** copied into app data. Privacy-enhanced mode still contacts a third party after consent; it is not a promise of zero data processing.

### Validation And Limits

**20 regional tests passed**, including canonical source URLs, separate publication/content years, explicit 2023/2021 history, mixed-year and empty-description guards, null thumbnails, no social-image URLs/HTML, newest-first ordering and denied-by-default embeds. The **scoped TypeScript check passed** for the three data modules and the regional test. Export counts independently verified 32 records / 13 unique preview URLs / 6 permitted embeds.

No UI component, stylesheet, map, trip panel or core engine was changed. An in-app player, consent controls and responsive playback were **not UI-tested** here; the UI owner consumes this contract. No full global E2E was run during concurrent UI work. No public social photo was downloaded to the project, no Photoshop/generated substitute was made, and no publication or account action was performed. The requested exact GPT-6 Astra (Copilot) runtime remains unverified; no fallback or subagent was used.

## Earlier Media Checkpoint (Historical)

The remaining text records the previous unavailable-photo checkpoint. Its counts and rendering instructions are superseded by the current source-preview contract above; its licensing restrictions still apply.

Follow-up checkpoint: **2026-10-17T21:34:23Z** (18 October 2026, 03:04:23 IST). Initial media search checkpoint: **2026-10-17T20:55:27Z**. The follow-up was identity/location research, not a new photo-licensing search.

| New media | Verified/licensed files added |
| --- | ---: |
| 2026 place-specific photographs | 0 |
| Historical regional photographs | 0 |
| Social/news images copied or hotlinked | 0 |

No regional image files or placeholder photographs were created. The existing eight historical Kolkata photographs described in the task were left unchanged; this pass did not re-audit those files or relabel them 2026. There is no promise of 26 photographs, nor evidence for 2026 images from a page's current copyright year or search date.

### Earlier Rendering Contract (Superseded)

- All 19 regional stops and 23 manual-location leads have `PLACE_INSIGHTS[id].media.status === 'unavailable'`. Use the bilingual `PLACE_INSIGHT_LABELS.noPhoto` and the place's source link. Do not substitute a Kolkata pandal, stock idol, generated reconstruction or unrelated regional image.
- The two legacy Kolkata insight records use `use-existing-catalogue`; retain the existing photo selector and its historical date/credit. This is not a new media licence or confirmation that every legacy place has a photograph.
- `RECENT_COVERAGE` supplies external text links labelled "Recent coverage". News photographs, social videos and organiser images remain on the publishers' pages. Do not turn article image URLs into local files, remote thumbnails or purported 2026 place photos.
- A source page being public, governmental, discoverable in search, or hosted on Wikimedia does not by itself verify a particular photograph's creator, date, subject and reuse licence.

### Earlier Checks

Two Commons-scoped public searches covered 2026 Durgapur and Asansol Durga Puja images. Durgapur returned an unrelated 2010 Sanghasri photograph; Asansol returned no match. No qualifying creator/file-page/capture-date/licence combination was established. This is a bounded search result, not proof that no licensed photograph exists anywhere.

The readable Kalyanpur social post, dated local coverage, official Tala Prattoy pages and district Garh Jungle page did not establish an explicit reusable licence for their images. Pujo360's repeated stock-image URLs and mixed-year presentation were not accepted as place-specific photographic evidence. No images from those sources were copied.

The follow-up added five source-matched map points, **not photographs**. Beauty of Durgapur credits individual photographers for its 2021 images; a credit is not an open reuse licence. New Upper Chelidanga's organiser post was published in September 2026 but explicitly recalls 2023, so its image/theme must not be relabelled 2026. News18, Pandal Hoppers, Instagram and Google Maps images/reviews remain on their publishers' pages; none was saved, copied or added as an app thumbnail.

No additional Commons search was spent from the eight-query location-research budget. The initial search did not establish a licensed 2026 regional photograph, and this follow-up does not claim none exists. The existing eight Kolkata photos remain archival and unchanged. Public map point checks did not create or license any map screenshot, tile cache or photo asset.

### Gate For Licensed Image Additions

Before adding any asset, verify the original Commons/creator file page, exact place, actual capture date (not upload or page-update date), author attribution, explicit CC BY/CC BY-SA/public-domain terms, and required credit/licence link. Record any crop or conversion and inspect the actual image. Store only qualifying assets under the owned regional image directory, and add a per-file licence/credit entry here. If any item is unverified, keep the unavailable state.

Public facts and source references are listed separately in [docs/REGIONAL_SOURCES.md](REGIONAL_SOURCES.md#L1). Neither this addendum nor the source catalogue authorizes publication, scraping publishers' image libraries or use of private/social account material.