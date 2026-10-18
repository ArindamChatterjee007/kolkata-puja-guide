import type { City } from '../types'
import { REGIONAL_CURATION_CHECKED_AT, REGIONAL_FOLLOWUP_CHECKED_AT, REGIONAL_PANDALS, REGIONAL_SELECTION, REGIONAL_SOURCE_CHECKED_AT, UNLOCATED_PUJA_LEADS } from './regionalPlaces'
import { DURGAPUR_VIDEO_GUIDE, REGIONAL_POST_PREVIEWS, REGIONAL_THEME_EVIDENCE } from './regionalCuration'
import type { RegionalPostPreview } from './regionalCuration'

export interface PublicPlaceSource {
  url: string
  publisher: string
  title: string
  checkedAt: string
  publishedAt: string | null
  dateBasis: 'published' | 'updated' | 'undated'
  datePrecision?: 'second' | 'day' | 'unknown'
  supports: Array<'identity' | 'coordinate' | 'address' | 'history' | 'cuisine' | 'opening-hours' | 'coverage' | 'theme' | 'visitor-appeal'>
  snapshotAt?: string
  licenseUrl?: string
  note?: string
}

export interface RecentCoverage {
  id: string
  city: City
  placeId: string | null
  placeName: string
  url: string
  publisher: string
  title: string
  publishedAt: string
  dateBasis: 'published' | 'updated'
  checkedAt: string
  summary: string
  kind: 'news' | 'organiser' | 'social' | 'guide'
  comparativeEvidence: string | null
  eligibleMain?: boolean
}

export interface FoodStopDetails {
  cuisine: string[] | null
  vegetarianOptions: boolean | null
  wheelchairAccessible: boolean | null
  openingHours: string | null
  openingHoursAsOf: string | null
  cost: string | null
  mealBreakMinutes: 45
  durationBasis: 'planning-estimate'
  detourMinutes: null
  bookingMade: false
}

export interface PlaceInsight {
  placeId: string
  city: City
  history: string | null
  historyBn: string | null
  featuredReason: string | null
  recommendationLabel: 'Editor pick' | 'Suggested food stop' | null
  trending: boolean
  recentCoverageIds: string[]
  sources: PublicPlaceSource[]
  locationEvidence?: {
    identitySourceUrl: string
    addressSourceUrl: string
    coordinateSourceUrl: string
    matchedName: string
    matchedAddress: string
    coordinateBasis: 'linked-map-place' | 'published-map-point'
    confidence: 'approximate-host'
    caveat: string
  }
  media: {
    status: 'unavailable' | 'use-existing-catalogue' | 'external-posts'
    reason: string
    sourceUrls: string[]
    previews?: readonly RegionalPostPreview[]
  }
  food: FoodStopDetails | null
}

export const PLACE_INSIGHT_LABELS = {
  noHistory: { en: 'No sourced history available', bn: 'উৎসসহ ইতিহাস পাওয়া যায়নি' },
  noPhoto: { en: 'Verified place photo unavailable', bn: 'যাচাই করা স্থানের ছবি পাওয়া যায়নি' },
  recentCoverage: { en: 'Recent coverage', bn: 'সাম্প্রতিক প্রতিবেদন' },
  locateReportedPandal: { en: 'Research only', bn: 'শুধু গবেষণার তালিকা' },
  awaitingMapLocation: { en: 'Awaiting map location', bn: 'মানচিত্রে অবস্থান যাচাই বাকি' },
  heritage: { en: 'Heritage', bn: 'ঐতিহ্য' },
  themePlan: { en: 'Reported theme plan', bn: 'প্রকাশিত থিমের পরিকল্পনা' },
}

export const RECENT_COVERAGE: RecentCoverage[] = [
  {
    id: 'asansol-kalyanpur-20261008', city: 'asansol', placeId: null,
    placeName: 'Kalyanpur Housing: K-Sector, Adi Puja and Scheme 2',
    url: 'https://www.instagram.com/reel/DeOemZmoM-L/',
    publisher: 'ASANSOL City Of Brotherhood (@asansolcob)',
    title: 'Kalyanpur Housing Durgapuja 2026',
    publishedAt: '2026-10-08', dateBasis: 'published', checkedAt: REGIONAL_SOURCE_CHECKED_AT,
    summary: 'The public post distinguishes three Kalyanpur Housing pujas. Their individual grounds are not located in this catalogue; no theme, endorsement or comparative popularity claim is adopted.',
    kind: 'social', comparativeEvidence: null,
  },
  {
    id: 'asansol-kalikrishna-20261010', city: 'asansol', placeId: null,
    placeName: 'Kalikrishna Ashram, Dhenua, Burnpur',
    url: 'https://www.sangbadpratidin.in/durga-puja/puja-coverage-bengal/durga-puja-2026-exceptional-one-day-durga-puja-organised-in-asansol/pid/1379275/',
    publisher: 'Sangbad Pratidin Digital Desk',
    title: 'Report on a one-day Durga Puja at Kalikrishna Ashram',
    publishedAt: '2026-10-10', dateBasis: 'updated', checkedAt: REGIONAL_SOURCE_CHECKED_AT,
    summary: 'The article describes the annual single-day Mahalaya observance at the Burnpur-area ashram. This past-event report is not evidence of an open pandal on the planned trip date.',
    kind: 'news', comparativeEvidence: null, eligibleMain: false,
  },
  {
    id: 'durgapur-guide-20261012', city: 'durgapur', placeId: null,
    placeName: 'Durgapur regional puja list, including SEPCO and Marconi',
    url: 'https://myaaspaas.in/blog/durgapur-durga-puja-2026-16-famous-pandal-locations-and-route-map',
    publisher: 'AasPaas / Swastika Paul',
    title: 'Durgapur Durga Puja 2026: 16 Famous Pandal Locations and Route Map',
    publishedAt: '2026-10-12', dateBasis: 'published', checkedAt: REGIONAL_SOURCE_CHECKED_AT,
    summary: 'The local guide names sixteen puja locations, including SEPCO and Marconi. It does not supply verified entrance coordinates or comparative audience evidence.',
    kind: 'guide', comparativeEvidence: null,
  },
  {
    id: 'asansol-police-guide-20261015', city: 'asansol', placeId: null,
    placeName: 'Asansol Durgapur Police Commissionerate regional guide',
    url: 'https://onkarbangla.com/asansol-durgapur-police-commissionerate-sets-up-for-cyber-awareness-and-releases-puja-guide-mapr-2026-25-booths/',
    publisher: 'Onkar Bangla / Online Desk',
    title: 'Report on the release of the 2026 regional police puja guide',
    publishedAt: '2026-10-15', dateBasis: 'published', checkedAt: REGIONAL_SOURCE_CHECKED_AT,
    summary: 'The report covers a police guide release for both cities. The police homepage independently links the guide, but its PDF contents were not readable during this review; no traffic rules are inferred.',
    kind: 'news', comparativeEvidence: null,
  },
  {
    id: 'durgapur-chandidas-20261017', city: 'durgapur', placeId: null,
    placeName: 'Chandidas Rajendra Prasad Sarbojanin Durga Puja',
    url: 'https://onkarbangla.com/durgapur-actor-prasenjit-attend-durgapuja-of-chandidas/',
    publisher: 'Onkar Bangla / Online Desk',
    title: 'Report from Chandidas Rajendra Prasad Sarbojanin Durga Puja',
    publishedAt: '2026-10-17', dateBasis: 'published', checkedAt: REGIONAL_SOURCE_CHECKED_AT,
    summary: 'The report identifies the Chandidas Rajendra Prasad puja and describes this as its sixty-sixth edition. Its exact ground has not been matched; a similarly named park is not substituted.',
    kind: 'news', comparativeEvidence: null,
  },
]

const regionalGuide: PublicPlaceSource = {
  url: 'https://myaaspaas.in/blog/durgapur-durga-puja-2026-16-famous-pandal-locations-and-route-map',
  publisher: 'AasPaas / Swastika Paul',
  title: 'Durgapur Durga Puja 2026: 16 Famous Pandal Locations and Route Map',
  checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: '2026-10-12', dateBasis: 'published',
  supports: ['identity'],
}

const historicalDurgapurGuide: PublicPlaceSource = {
  url: 'https://www.beautyofdurgapur.com/famous-durga-puja-pandals-durgapur/',
  publisher: 'Beauty of Durgapur / Swarnab Dutta',
  title: 'Famous Durga Puja Pandals in Durgapur 2021: theme and location',
  checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, publishedAt: '2022-01-03', dateBasis: 'published',
  supports: ['identity', 'address'],
  note: 'Reports the 2021 festival, despite its 2022 publication date. Not evidence of 2026 themes, opening or access; each map link is checked separately.',
}

const asansolDirectory: PublicPlaceSource = {
  url: 'https://pandalhoppers.in/', publisher: 'Pandal Hoppers',
  title: 'Asansol Durga Puja Pandals 2026: named places and localities',
  checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
  supports: ['identity', 'address'],
  note: 'Only independently map-matched names/localities are used. Queue, visitor, vote, parking and theme claims are not adopted. Its Scheme 2 / Adi Puja conflation is rejected.',
}

function publicMapSource(url: string, title: string, note: string): PublicPlaceSource {
  return {
    url, publisher: 'Google Maps', title, note,
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
    supports: ['identity', 'address', 'coordinate'],
  }
}

function osmSource(object: string, title: string, updatedAt: string, supports: PublicPlaceSource['supports']): PublicPlaceSource {
  return {
    url: `https://www.openstreetmap.org/${object}`, publisher: 'OpenStreetMap contributors', title,
    checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: updatedAt, dateBasis: 'updated', supports,
    snapshotAt: '2026-10-14T20:21:12Z', licenseUrl: 'https://www.openstreetmap.org/copyright',
  }
}

function baseInsight(placeId: string, city: City, sources: PublicPlaceSource[]): PlaceInsight {
  return {
    placeId, city, sources, history: null, historyBn: null, featuredReason: null,
    recommendationLabel: null, trending: false, recentCoverageIds: [], food: null,
    media: { status: 'unavailable', reason: 'No licensed place-specific photograph verified for this catalogue.', sourceUrls: [] },
  }
}

function foodDetails(cuisine: string[] | null = null): FoodStopDetails {
  return {
    cuisine, vegetarianOptions: null, wheelchairAccessible: null,
    openingHours: null, openingHoursAsOf: null, cost: null,
    mealBreakMinutes: 45, durationBasis: 'planning-estimate', detourMinutes: null, bookingMade: false,
  }
}

function mappedPujaInsight(placeId: string, mapUrl: string, matchedName: string, caveat: string): PlaceInsight {
  const place = REGIONAL_PANDALS.find((candidate) => candidate.id === placeId)
  if (!place) throw new Error(`Missing mapped regional puja: ${placeId}`)
  const identitySource = place.city === 'durgapur' ? DURGAPUR_VIDEO_GUIDE : asansolDirectory
  return {
    ...baseInsight(placeId, place.city, [
      identitySource,
      { ...publicMapSource(mapUrl, matchedName, caveat), checkedAt: REGIONAL_CURATION_CHECKED_AT },
    ]),
    featuredReason: place.description, recommendationLabel: 'Editor pick',
    locationEvidence: {
      identitySourceUrl: identitySource.url, addressSourceUrl: mapUrl, coordinateSourceUrl: mapUrl,
      matchedName, matchedAddress: place.address, coordinateBasis: 'linked-map-place', confidence: 'approximate-host',
      caveat,
    },
  }
}

const reportedPujaSources = new Map<string, PublicPlaceSource>([
  { ...regionalGuide, checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, supports: ['identity', 'address'] },
  historicalDurgapurGuide,
  asansolDirectory,
  {
    url: 'https://www.instagram.com/reel/DeOemZmoM-L/',
    publisher: 'ASANSOL City Of Brotherhood (@asansolcob)', title: 'Kalyanpur Housing Durgapuja 2026',
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, publishedAt: '2026-10-08', dateBasis: 'published',
    supports: ['identity', 'address', 'coverage'],
    note: 'Readable public caption distinguishes K-Sector, Adi Puja and Scheme 2. Theme claims and social engagement are not adopted.',
  },
  {
    url: 'https://bharatbz.com/west-bengal/k-sector-kalyanpur-housing-durga-puja-70160',
    publisher: 'BharatBZ', title: 'K-Sector Kalyanpur Housing Durga Puja: directory address',
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
    supports: ['identity', 'address'],
    note: 'Named address only; no verified numeric map coordinate, rating, hours, parking or visitor claim adopted.',
  },
  {
    url: 'https://bharatbz.com/west-bengal/kalyanpur-adi-puja-1490102',
    publisher: 'BharatBZ', title: 'Kalyanpur Adi Puja: Housing Road directory address',
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
    supports: ['identity', 'address'],
    note: 'Distinct named Adi Puja listing. Reviews and its map image do not supply an accepted numeric ground coordinate.',
  },
  {
    url: 'https://www.instagram.com/p/DdJqynRCB3v/',
    publisher: 'New Upper Chelidanga Sarbojanin Durga Puja (@nucac_durgapuja_asansol)',
    title: 'NUCAC: a throwback to the 2023 Durga Puja',
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, publishedAt: '2026-09-11', dateBasis: 'published',
    supports: ['identity', 'address', 'history'],
    note: 'The 2026 post explicitly recalls 2023; the organiser states a tradition since 1966. Neither the image nor its theme is labelled current.',
  },
  {
    url: 'https://www.instagram.com/reel/DejnWQlqISF/',
    publisher: 'Sanchita Banerjee Chatterjee', title: 'Burnpur Bari Maidan Town Puja: public caption',
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
    supports: ['identity', 'address'],
    note: 'Caption mentions Town Puja, Bari Maidan and Durga Pujo. Only a relative date was read; no exact publication date or annual organiser confirmation is inferred.',
  },
  {
    url: 'https://bengali.news18.com/photogallery/south-bengal/multiple-temples-at-once-your-mind-will-be-calm-in-the-green-environment-of-nature-where-to-see-l18-smc-local18-2321578.html',
    publisher: 'News18 Bangla / Rintu Panja', title: 'Burnpur Town Puja Samity temple complex at Bari Maidan',
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, publishedAt: '2025-08-30', dateBasis: 'updated',
    supports: ['identity', 'address', 'history'],
    note: 'Explicitly reports the samity established in 1945 and locates it at Bari Maidan. This is a temple-complex article, not annual Durga Puja or 2026 opening verification.',
  },
  {
    url: 'https://www.sangbadpratidin.in/durga-puja/puja-coverage-bengal/durga-puja-2026-exceptional-one-day-durga-puja-organised-in-asansol/pid/1379275/',
    publisher: 'Sangbad Pratidin Digital Desk', title: 'Kalikrishna Ashram: one-day Mahalaya Durga Puja',
    checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: '2026-10-10', dateBasis: 'updated',
    supports: ['identity', 'address', 'coverage'],
    note: 'Retained from the initial source review. The reported one-day observance is not a current trip-date opening.',
  },
  {
    url: 'https://onkarbangla.com/durgapur-actor-prasenjit-attend-durgapuja-of-chandidas/',
    publisher: 'Onkar Bangla / Online Desk', title: 'Chandidas Rajendra Prasad Sarbojanin Durga Puja report',
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, publishedAt: '2026-10-17', dateBasis: 'published',
    supports: ['identity', 'address', 'coverage'],
    note: 'Only Chandidas locality is supplied; the reported sixty-sixth edition is not converted into a founding year.',
  },
].map((source): [string, PublicPlaceSource] => [source.url, source as PublicPlaceSource]))

const reportedPujaInsights = Object.fromEntries(UNLOCATED_PUJA_LEADS.map((lead) => {
  const sources = [...new Set([lead.sourceUrl, lead.addressSourceUrl ?? lead.sourceUrl])].map((url) => {
    const source = reportedPujaSources.get(url)
    if (!source) throw new Error(`Missing public source for reported puja: ${lead.id}`)
    return source
  })
  return [lead.id, {
    ...baseInsight(lead.id, lead.city, sources),
    recentCoverageIds: RECENT_COVERAGE.filter((coverage) => coverage.url === lead.sourceUrl).map((coverage) => coverage.id),
  }]
}))

const placeInsights: Partial<Record<string, PlaceInsight>> = {
  ...reportedPujaInsights,
  'durgapur-shankarpur': mappedPujaInsight('durgapur-shankarpur', 'https://maps.app.goo.gl/wNFGmFn2nJd9MGZn7', 'Shankarpur Durgapuja Ground', 'Named entity 0x39f771006ceeaae9:0xd6875a0850657a1d; !3d23.5269002!4d87.3571152 matches its destination pair. Approximate ground, not a surveyed entrance or parking.'),
  'durgapur-fuljhore': mappedPujaInsight('durgapur-fuljhore', 'https://maps.app.goo.gl/Yc8ncfh5VNpvRfGz8', 'Fuljhore Durgapuja', 'Named entity 0x39f77100469ca7f3:0x7e26bc2e182e7c5f; !3d23.5365038!4d87.3373979. Current named place resolves the earlier blank historical panel; no parking or opening guarantee.'),
  'durgapur-chaturanga': mappedPujaInsight('durgapur-chaturanga', 'https://maps.app.goo.gl/PCQyARt5FecyAUyD8', 'Chaturanga Durga Puja', 'Named entity 0x39f771f8a4427b0f:0xd40f0012593bfaaf; !3d23.5425994!4d87.302029. The historical link to Cement Park is rejected; these are distinct grounds. No surveyed entrance.'),
  'durgapur-agrani': mappedPujaInsight('durgapur-agrani', 'https://maps.app.goo.gl/2B8Hwps1D8xCphUH6', 'New Agrani Puja Ground', 'Named entity 0x39f76d002a67c3c9:0xcc23a830ec43d60; !3d23.5619493!4d87.2748116. The current annual-puja guide links this new ground, not the old club or an assumed school. Car access unknown.'),
  'durgapur-bhiringi-nabarun': mappedPujaInsight('durgapur-bhiringi-nabarun', 'https://maps.app.goo.gl/KoDBhFaGPjid59PfA', 'Bhiringi Nabaroon Durga Mandir', 'Named entity 0x39f772786587adab:0xd902e172d433381d; !3d23.5480658!4d87.2699157. The slightly different driving endpoint 23.5480562,87.2699434 is not the stored place pin. Nabakaran is not an accepted alias.'),
  'durgapur-54-foot-benachity': mappedPujaInsight('durgapur-54-foot-benachity', 'https://maps.app.goo.gl/RPkrohnts4ZvvYV49', 'Khudiram Math', 'Named entity 0x39f76df3f48936e7:0xbc05da92d7dd53b9; !3d23.5555387!4d87.2855941. The guide explicitly labels one link Khudiram Math, 54 Feet; the road is not a structure-height measurement. No surveyed gate.'),
  'asansol-kalyanpur-k-sector': mappedPujaInsight('asansol-kalyanpur-k-sector', 'https://www.google.com/maps/place/K-Sector+Kalyanpur+Housing+Durga+Puja/data=!4m5!3m4!1s0x39f71f173cc20781:0x3d21069fd645dd92!8m2!3d23.6999792!4d86.9584407', 'K-Sector Kalyanpur Housing Durga Puja', 'Named feature and Housing Road / Sunity Apartments address match the independent directory. No housing-area centre, gate or parking is inferred.'),
  'asansol-kalyanpur-adi-puja': mappedPujaInsight('asansol-kalyanpur-adi-puja', 'https://www.google.com/maps/place/Kalyanpur+Adi+Puja/data=!4m5!3m4!1s0x39f71f16c9ebda1f:0x49092da99d242dad!8m2!3d23.7019336!4d86.9582026', 'Kalyanpur Adi Puja', 'Exact puja result and Housing Road address checked after rejecting the blank viewport link. Nearby committee office 23.7022148,86.9580927 and Scheme 2 are not substitutes.'),
  'asansol-kalyanpur-scheme-2': mappedPujaInsight('asansol-kalyanpur-scheme-2', 'https://www.google.com/maps/place/Kalyanpur+Scheme+2+Puja+Arena/data=!4m5!3m4!1s0x39f71f13c2ac79a9:0xc5b94af91934a51b!8m2!3d23.7044255!4d86.9564085', 'Kalyanpur Scheme 2 Puja Arena', 'The published viewport URL was blank and not accepted; the named arena result, address and !3d/!4d feature were independently verified. Separate from Adi Puja.'),
  'asansol-rabindranagar': mappedPujaInsight('asansol-rabindranagar', 'https://www.google.com/maps/place/Rabindranagar+unnayan+samity+Durga+Puja+Mandir/data=!4m5!3m4!1s0x39f71f005794b667:0xcd633f132794e5f5!8m2!3d23.6885322!4d86.9442909', 'Rabindranagar unnayan samity Durga Puja Mandir', 'Named Unnayan Samity feature and address verified after following the directory destination. The driving endpoint 23.6884884,86.9443292 is not the stored host point. No car gate verified.'),
  'asansol-netaji-sporting': mappedPujaInsight('asansol-netaji-sporting', 'https://www.google.com/maps/place/Netaji+Sporting+Club+Pandal/data=!4m5!3m4!1s0x39f71ef798bbdf97:0xc97ebb5980680bd!8m2!3d23.6723739!4d86.9445177', 'Netaji Sporting Club Pandal', 'Source-linked search resolves the exact Burnpur pandal, not another Netaji Sporting club. Both feature and destination coordinates agree; entrances and parking remain unknown.'),
  'asansol-new-upper-chelidanga': {
    ...reportedPujaInsights['asansol-new-upper-chelidanga'],
    history: 'The organiser says New Upper Chelidanga Athletic Club has celebrated Durga Puja since 1966. Its September 2026 post recalls the 2023 celebration, not the current theme.',
    historyBn: 'আয়োজকের বক্তব্য অনুযায়ী নিউ আপার চেলিডাঙা অ্যাথলেটিক ক্লাব ১৯৬৬ সাল থেকে দুর্গাপুজো করছে। সেপ্টেম্বর ২০২৬-এর পোস্টটি ২০২৩-এর স্মৃতিচারণ, বর্তমান থিমের বিবরণ নয়।',
  },
  'asansol-dhemomain': {
    ...baseInsight('asansol-dhemomain', 'asansol', [
      asansolDirectory,
      publicMapSource(
        'https://www.google.com/maps/place/Dhemomain+Durga+Puja+Committee/data=!4m5!3m4!1s0x39f71ff3710de2ed:0x6c7560b82160dee7!8m2!3d23.7043778!4d86.9083866',
        'Dhemomain Durga Puja Committee, Asansol',
        'Followed the directory map link and selected the named committee result, not the football ground or generic colliery. Destination !3d/!4d coordinates; no viewport centre.',
      ),
    ]),
    featuredReason: 'Editor pick; a source-listed colliery-area community puja with a separately matched committee location. No ranking, award or visitor-count claim.',
    recommendationLabel: 'Editor pick',
    locationEvidence: {
      identitySourceUrl: asansolDirectory.url, addressSourceUrl: asansolDirectory.url,
      coordinateSourceUrl: 'https://www.google.com/maps/place/Dhemomain+Durga+Puja+Committee/data=!4m5!3m4!1s0x39f71ff3710de2ed:0x6c7560b82160dee7!8m2!3d23.7043778!4d86.9083866',
      matchedName: 'Dhemomain Durga Puja Committee', matchedAddress: 'Dhemomain / Sitarampur, Asansol',
      coordinateBasis: 'linked-map-place', confidence: 'approximate-host',
      caveat: 'Named committee host only; the directory is not an organiser notice. The 2026 entrance, parking and access are unverified.',
    },
  },
  'durgapur-urvashi': {
    ...baseInsight('durgapur-urvashi', 'durgapur', [
      historicalDurgapurGuide, regionalGuide,
      publicMapSource('https://goo.gl/maps/hYUQwcfp4uap3VUm7', 'Urvashi Durga Puja Maidan, City Centre',
        'Linked destination !3d23.5365902!4d87.3049101. The map address and both guides place this in City Centre; the historical article repeats a conflicting Kaliganj address, which is rejected.'),
    ]),
    featuredReason: 'Editor pick; a City Centre community theme-puja documented in both historical and recent regional coverage, not a measured trend.',
    recommendationLabel: 'Editor pick', recentCoverageIds: ['durgapur-guide-20261012'],
    locationEvidence: {
      identitySourceUrl: historicalDurgapurGuide.url,
      addressSourceUrl: 'https://goo.gl/maps/hYUQwcfp4uap3VUm7', coordinateSourceUrl: 'https://goo.gl/maps/hYUQwcfp4uap3VUm7',
      matchedName: 'Urvashi Durga Puja Maidan',
      matchedAddress: 'Urvashi Complex, 2nd Street, Bengal Ambuja Housing Complex, City Centre, Durgapur',
      coordinateBasis: 'linked-map-place', confidence: 'approximate-host',
      caveat: 'Uses the named City Centre maidan, not the article\'s conflicting Kaliganj address. No surveyed 2026 entrance or parking.',
    },
  },
  'durgapur-cement-park': {
    ...baseInsight('durgapur-cement-park', 'durgapur', [
      historicalDurgapurGuide,
      publicMapSource('https://goo.gl/maps/3qEJjfic153DgmSH9', 'Cement Park Durga Puja Ground, Recol Park',
        'Linked destination !3d23.5396265!4d87.2927462 and street match. The article\'s separate Chaturanga link wrongly resolves here and is not used for another pin.'),
    ]),
    featuredReason: 'Editor pick; a historically documented theme-puja ground in the City Centre area. Not an official must-visit ranking.',
    recommendationLabel: 'Editor pick',
    locationEvidence: {
      identitySourceUrl: historicalDurgapurGuide.url, addressSourceUrl: historicalDurgapurGuide.url,
      coordinateSourceUrl: 'https://goo.gl/maps/3qEJjfic153DgmSH9', matchedName: 'Cement Park Durga Puja Ground',
      matchedAddress: 'Shahid Khudiram Sarani, Recol Park, City Centre, Durgapur',
      coordinateBasis: 'linked-map-place', confidence: 'approximate-host',
      caveat: 'Named ground, not a surveyed entrance or parking point. Chaturanga remains a distinct unlocated puja.',
    },
  },
  'durgapur-sector-2c': {
    ...baseInsight('durgapur-sector-2c', 'durgapur', [
      historicalDurgapurGuide,
      publicMapSource('https://goo.gl/maps/YU755ZZh7wb8A5kPA', 'Sector 2C Durga Mandap, Bidhannagar',
        'Linked destination !3d23.5177787!4d87.3548017. The source article and map both specify C-51, Bhimpalashri Sarani; nearby grounds are not additional pujas.'),
    ]),
    featuredReason: 'Editor pick; a documented Bidhannagar community puja with a matching named mandap and street address. No crowd ranking.',
    recommendationLabel: 'Editor pick',
    locationEvidence: {
      identitySourceUrl: historicalDurgapurGuide.url, addressSourceUrl: historicalDurgapurGuide.url,
      coordinateSourceUrl: 'https://goo.gl/maps/YU755ZZh7wb8A5kPA', matchedName: 'Sector 2C Durga Mandap',
      matchedAddress: 'C-51, Bhimpalashri Sarani, Bidhannagar, Durgapur',
      coordinateBasis: 'linked-map-place', confidence: 'approximate-host',
      caveat: 'Established mandap anchor only. Map hours and accessibility badges are not adopted as festival access facts.',
    },
  },
  'durgapur-buddha-bihar': {
    ...baseInsight('durgapur-buddha-bihar', 'durgapur', [
      historicalDurgapurGuide,
      regionalGuide,
      {
        url: 'https://goo.gl/maps/gWUHxb8sXZiaeev48',
        publisher: 'Google Maps', title: 'Buddha Bihar Sarbojanin Durgotsab, Bhagat Singh Marg',
        checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
        supports: ['identity', 'address', 'coordinate'],
        note: 'The article-linked destination encodes !3d23.5517329!4d87.3110228 for the named puja, not the @ viewport or nearby playground. Postal codes differ between sources and are omitted.',
      },
    ]),
    featuredReason: 'Editor pick; a community theme-puja documented in historical coverage and the recent regional guide. No measured popularity or current-theme claim.',
    recommendationLabel: 'Editor pick', recentCoverageIds: ['durgapur-guide-20261012'],
    locationEvidence: {
      identitySourceUrl: historicalDurgapurGuide.url,
      addressSourceUrl: historicalDurgapurGuide.url,
      coordinateSourceUrl: 'https://goo.gl/maps/gWUHxb8sXZiaeev48',
      matchedName: 'Buddha Bihar Sarbojanin Durgotsab',
      matchedAddress: '1 Bhagat Singh Marg, Hatora, C-Zone, Durgapur',
      coordinateBasis: 'linked-map-place', confidence: 'approximate-host',
      caveat: 'Published destination anchor only; no 2026 entrance, parking, opening hours or access survey.',
    },
  },
  'durgapur-sepco': {
    ...baseInsight('durgapur-sepco', 'durgapur', [
      osmSource('way/962677741', 'Sepco Pujo Ground Park', '2021-07-08T18:13:52Z', ['identity', 'coordinate']),
      regionalGuide,
    ]),
    featuredReason: 'Editor pick; an established named puja ground also included in the regional guide. No comparative popularity claim.',
    recommendationLabel: 'Editor pick', recentCoverageIds: ['durgapur-guide-20261012'],
  },
  'durgapur-marconi': {
    ...mappedPujaInsight('durgapur-marconi', 'https://maps.app.goo.gl/T2D3uK17GeWnmN4K9', 'Marconi Dakshin Pally Durgapuja Maidan', 'Named entity 0x39f76e11fcc6e077:0xe599e48945c6bb4c; !3d23.5666714!4d87.3117825. Replaces the generic park midpoint 23.5663757,87.3107181 without changing the stable ID or counting adjacent grounds twice.'),
    recentCoverageIds: ['durgapur-guide-20261012'],
  },
  'food-kolkata-college-street-coffee-house': {
    ...baseInsight('food-kolkata-college-street-coffee-house', 'kolkata', [
      osmSource('node/4571180589', 'Indian Coffee House, Bankim Chatterjee Street', '2023-12-05T13:55:36Z', ['identity', 'coordinate', 'address', 'cuisine']),
      {
        url: 'https://en.wikipedia.org/wiki/College_Street_Coffee_House',
        publisher: 'Wikipedia contributors', title: 'College Street Coffee House',
        checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
        supports: ['history'],
      },
    ]),
    history: 'The Coffee Board began a coffee venue in Albert Hall in 1942; the building has an earlier history. The College Street branch became associated with literary and intellectual adda, not a business founded in 1876.',
    historyBn: 'কফি বোর্ড ১৯৪২ সালে অ্যালবার্ট হলে কফির আড্ডার সূচনা করে; ভবনের ইতিহাস আরও পুরনো। কলেজ স্ট্রিটের এই শাখা সাহিত্য ও বৌদ্ধিক আড্ডার সঙ্গে যুক্ত, তবে ব্যবসাটি ১৮৭৬ সালে শুরু বলা হয়নি।',
    featuredReason: 'Suggested food stop; College Street-area location and a sourced cultural association, for an already selected central-Kolkata leg.',
    recommendationLabel: 'Suggested food stop', food: foodDetails(['Coffee shop', 'Indian']),
  },
  'food-kolkata-kewpies': {
    ...baseInsight('food-kolkata-kewpies', 'kolkata', [
      osmSource('node/4393259890', "Kewpie's, Elgin Lane", '2023-10-28T16:44:15Z', ['identity', 'coordinate', 'address', 'cuisine']),
    ]),
    featuredReason: 'Suggested food stop; source-tagged Bengali and Indian cuisine in the Elgin Lane area. Route detour, menu and current operation are unverified.',
    recommendationLabel: 'Suggested food stop', food: foodDetails(['Bengali', 'Indian']),
  },
  'food-asansol-66-grand-trunk': {
    ...baseInsight('food-asansol-66-grand-trunk', 'asansol', [
      {
        url: 'https://hotelasansolinternational.com/barandrestaurant/',
        publisher: 'Hotel Asansol International', title: 'Bar & Restaurant: 66 Grand Trunk Restaurant',
        checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
        supports: ['identity', 'cuisine'],
      },
      {
        url: 'https://hotelasansolinternational.com/contactus/',
        publisher: 'Hotel Asansol International', title: 'Contact Us: hotel address',
        checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
        supports: ['address'],
      },
      {
        url: 'https://en.wikivoyage.org/wiki/Asansol#Sleep',
        publisher: 'Wikivoyage contributors', title: 'Asansol: Hotel Asansol International listing',
        checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
        supports: ['coordinate', 'address'],
      },
    ]),
    featuredReason: 'Suggested food stop; an operator-described mixed menu at a GT Road host venue. Vegetarian options do not mean a vegetarian-only kitchen.',
    recommendationLabel: 'Suggested food stop',
    food: { ...foodDetails(['Indian', 'Chinese', 'Continental']), vegetarianOptions: true },
  },
  'food-asansol-gangar-hotel': {
    ...baseInsight('food-asansol-gangar-hotel', 'asansol', [{
      url: 'https://en.wikivoyage.org/wiki/Asansol#Eat_and_drink',
      publisher: 'Wikivoyage contributors', title: 'Asansol: Gangar Hotel food listing',
      checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
      supports: ['identity', 'coordinate', 'address', 'cuisine'],
    }]),
    featuredReason: 'Suggested food stop; a source-listed Bengali-food option at Court Compound. The undated listing needs an operating-status check.',
    recommendationLabel: 'Suggested food stop', food: foodDetails(['Bengali']),
  },
  'food-asansol-garam-masala': {
    ...baseInsight('food-asansol-garam-masala', 'asansol', [
      osmSource('node/7466818596', 'Garam Masala Restaurant', '2021-07-05T07:08:55Z', ['identity', 'coordinate']),
    ]),
    featuredReason: 'Suggested food stop; a mapped Asansol restaurant candidate for the selected city leg. Detour and current operation are unverified.',
    recommendationLabel: 'Suggested food stop', food: foodDetails(),
  },
  'food-durgapur-roor': {
    ...baseInsight('food-durgapur-roor', 'durgapur', [
      osmSource('node/6757723933', 'Peerles Inn Hotel (OSM spelling), host venue', '2019-08-29T18:44:57Z', ['coordinate']),
      {
        url: 'https://www.peerlesshotels.com/peerless-hotel-durgapur-dining.php',
        publisher: 'Peerless Hotels', title: 'Restaurant at Peerless Hotel Durgapur: The Roor',
        checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
        supports: ['identity', 'cuisine', 'opening-hours'],
      },
      {
        url: 'https://www.peerlesshotels.com/peerless-hotel-durgapur-overview.php',
        publisher: 'Peerless Hotels', title: 'Peerless Hotel Durgapur',
        checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
        supports: ['identity', 'address'],
      },
    ]),
    featuredReason: 'Suggested food stop; a City Centre host venue with an operator-published menu description. Detour is not calculated.',
    recommendationLabel: 'Suggested food stop',
    food: {
      ...foodDetails(['Indian', 'Chinese', 'Continental', 'Italian']),
      openingHours: 'Monday-Sunday: breakfast 07:00-10:30; lunch 12:30-15:00; dinner 19:00-22:30 (operator listing; reconfirm for festival dates).',
      openingHoursAsOf: REGIONAL_SOURCE_CHECKED_AT,
    },
  },
  'food-durgapur-qmin': {
    ...baseInsight('food-durgapur-qmin', 'durgapur', [
      osmSource('node/11977697144', 'Qmin Restaurant & Bar - Ginger Durgapur', '2024-06-13T08:05:41Z', ['identity', 'coordinate', 'address']),
    ]),
    featuredReason: 'Suggested food stop; the source places it on the Rajbandh highway corridor. This does not establish a drive-in entrance or low detour.',
    recommendationLabel: 'Suggested food stop', food: foodDetails(),
  },
  'food-durgapur-saffron-grill': {
    ...baseInsight('food-durgapur-saffron-grill', 'durgapur', [
      osmSource('way/778606067', 'SAFFRON GRILL (OSM spelling)', '2020-03-05T16:35:35Z', ['identity', 'coordinate', 'address']),
    ]),
    featuredReason: 'Suggested food stop; a mapped IQ City Road option for a Durgapur leg. No cuisine or current-hours inference from its name.',
    recommendationLabel: 'Suggested food stop', food: foodDetails(),
  },
  'sight-asansol-kalyaneshwari-temple': {
    placeId: 'sight-asansol-kalyaneshwari-temple', city: 'asansol',
    history: 'Kalyaneshwari is a Shakti shrine in Asansol Sadar. Its long worship tradition and the age of the present building are distinct; the source does not establish a construction date for the current temple.',
    historyBn: 'আসানসোল সদরের কল্যাণেশ্বরী শক্তি উপাসনার স্থান। উপাসনার দীর্ঘ ঐতিহ্য ও বর্তমান মন্দিরের বয়স এক নয়; উৎসে বর্তমান মন্দিরের নির্মাণের নির্দিষ্ট তারিখ প্রতিষ্ঠিত হয়নি।',
    featuredReason: 'Editor pick; established Shakti shrine west of Asansol, for a separately selected heritage detour.',
    recommendationLabel: 'Editor pick', trending: false, recentCoverageIds: [],
    sources: [{
      url: 'https://en.wikipedia.org/wiki/Kalyaneshwari_Temple',
      publisher: 'Wikipedia contributors', title: 'Kalyaneshwari Temple',
      checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
      supports: ['identity', 'coordinate', 'address', 'history'],
    }],
    media: { status: 'unavailable', reason: 'No licensed place-specific photograph verified for this catalogue.', sourceUrls: [] },
    food: null,
  },
  'sight-durgapur-barrage': {
    placeId: 'sight-durgapur-barrage', city: 'durgapur',
    history: 'Built in 1955 across the Damodar, the barrage serves irrigation and the Durgapur industrial area. The barrage and canal system passed to the Government of West Bengal in 1964.',
    historyBn: '১৯৫৫ সালে দামোদরের উপর নির্মিত ব্যারেজটি সেচ ও দুর্গাপুর শিল্পাঞ্চলের কাজে যুক্ত। ব্যারেজ ও খাল ব্যবস্থা ১৯৬৪ সালে পশ্চিমবঙ্গ সরকারের হাতে আসে।',
    featuredReason: 'Editor pick; a major Damodar water-management landmark, not a recommendation to stop on the barrage.',
    recommendationLabel: 'Editor pick', trending: false, recentCoverageIds: [],
    sources: [{
      url: 'https://en.wikipedia.org/wiki/Durgapur_Barrage',
      publisher: 'Wikipedia contributors', title: 'Durgapur Barrage',
      checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
      supports: ['identity', 'coordinate', 'address', 'history'],
    }],
    media: { status: 'unavailable', reason: 'No licensed place-specific photograph verified for this catalogue.', sourceUrls: [] },
    food: null,
  },
  'sight-kolkata-victoria-memorial': {
    ...baseInsight('sight-kolkata-victoria-memorial', 'kolkata', [{
      url: 'https://en.wikipedia.org/wiki/Victoria_Memorial,_Kolkata',
      publisher: 'Wikipedia contributors', title: 'Victoria Memorial, Kolkata',
      checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
      supports: ['identity', 'coordinate', 'address', 'history'],
    }]),
    history: 'The memorial was built between 1906 and 1921 and opened to the public in 1921. Its marble architecture and museum collections make it a separate heritage visit, not a festival pandal.',
    historyBn: 'স্মৃতিসৌধটি ১৯০৬ থেকে ১৯২১ সালের মধ্যে নির্মিত হয় এবং ১৯২১ সালে জনসাধারণের জন্য খোলে। মার্বেলের স্থাপত্য ও সংগ্রহশালার জন্য এটি আলাদা ঐতিহ্য-ভ্রমণ, পুজোর মণ্ডপ নয়।',
    featuredReason: 'Editor pick; a major museum and architectural landmark near the Maidan, only when selected with enough visiting time.',
    recommendationLabel: 'Editor pick',
  },
  'sight-durgapur-garh-jungle': {
    ...baseInsight('sight-durgapur-garh-jungle', 'durgapur', [
      {
        url: 'https://paschimbardhaman.gov.in/tourist-place/garh-jungle/',
        publisher: 'Paschim Bardhaman District Administration', title: 'Garh Jungle',
        checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: '2021-08-03', dateBasis: 'updated',
        supports: ['identity', 'address', 'history'],
      },
      {
        url: 'https://en.wikipedia.org/wiki/Garh_Jungle',
        publisher: 'Wikipedia contributors', title: 'Garh Jungle: published area coordinate',
        checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
        supports: ['coordinate'],
      },
    ]),
    history: 'District tourism describes Garh Jungle in Kanksa as a Shakta religious site associated with Medhas Muni and King Surath. The account of an early Durga Puja is a religious tradition, not an independently dated historical event.',
    historyBn: 'জেলা পর্যটন দপ্তর কাঁকসার গড় জঙ্গলকে মেধস মুনি ও রাজা সুরথের সঙ্গে যুক্ত শাক্ত ধর্মস্থান হিসেবে বর্ণনা করে। প্রাচীন দুর্গাপুজোর আখ্যান ধর্মীয় ঐতিহ্য, স্বাধীনভাবে তারিখ-নির্ধারিত ঐতিহাসিক ঘটনা নয়।',
    featuredReason: 'Editor pick; a district-listed Shakta heritage site. Its out-of-city detour must be assessed separately from the pandal circuit.',
    recommendationLabel: 'Editor pick',
  },
  'tala-prattoy': {
    ...baseInsight('tala-prattoy', 'kolkata', [
      {
        url: 'https://www.talaprattoy.com/about.html', publisher: 'Tala Prattoy', title: 'About Tala Prattoy',
        checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
        supports: ['identity', 'history'],
      },
      {
        url: 'https://www.talaprattoy.com/event-2026.html', publisher: 'Tala Prattoy', title: 'Durga Puja Art 2026',
        checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
        supports: ['coverage'],
      },
    ]),
    history: 'Tala Prattoy describes its work around public installation art, sculpture and craft skills. Its organiser page presents Durga Puja as a temporary public-art setting; no founding date is asserted here.',
    historyBn: 'টালা প্রত্যয় তাদের কাজকে প্রকাশ্য ইনস্টলেশন শিল্প, ভাস্কর্য ও কারুশিল্পের দক্ষতার সঙ্গে যুক্ত করে। আয়োজকের পাতায় দুর্গাপুজোকে সাময়িক প্রকাশ্য শিল্প-পরিসর হিসেবে দেখানো হয়েছে; এখানে প্রতিষ্ঠার সাল দাবি করা হয়নি।',
    featuredReason: 'Editor pick; the organiser explicitly foregrounds installation art. This is a curatorial reason, not a measured trend.',
    recommendationLabel: 'Editor pick',
    media: {
      status: 'use-existing-catalogue', reason: 'Keep existing dated historical media; no new 2026 photograph licensed here.',
      sourceUrls: ['https://www.talaprattoy.com/event-2026.html'],
    },
  },
  'sovabazar-rajbari': {
    ...baseInsight('sovabazar-rajbari', 'kolkata', [{
      url: 'https://en.wikipedia.org/wiki/Shobhabazar_Rajbari',
      publisher: 'Wikipedia contributors', title: 'Shobhabazar Rajbari',
      checkedAt: REGIONAL_SOURCE_CHECKED_AT, publishedAt: null, dateBasis: 'undated',
      supports: ['identity', 'history'],
    }]),
    history: 'The Shobhabazar family palaces are associated with Nabakrishna Deb and a Durga Puja tradition traced by this secondary source to 1757. The source distinguishes the two family houses and carries a citation warning; it does not establish present-day visitor access.',
    historyBn: 'শোভাবাজারের পারিবারিক প্রাসাদগুলি নবকৃষ্ণ দেবের সঙ্গে যুক্ত; এই গৌণ উৎসে দুর্গাপুজোর ঐতিহ্য ১৭৫৭ সাল থেকে বলা হয়েছে। উৎসে দুটি পারিবারিক বাড়ি আলাদা করা আছে ও তথ্যসূত্রের সতর্কতা রয়েছে; বর্তমান দর্শনার্থীর প্রবেশ নিশ্চিত হয়নি।',
    featuredReason: 'Editor pick; a family-puja tradition distinct from community theme pandals. Access and household boundaries must be respected.',
    recommendationLabel: 'Editor pick',
    media: { status: 'use-existing-catalogue', reason: 'Keep existing dated historical media; no new 2026 photograph licensed here.', sourceUrls: [] },
  },
}

export const PLACE_INSIGHTS: Readonly<Partial<Record<string, PlaceInsight>>> = Object.fromEntries(
  Object.entries(placeInsights).map(([placeId, insight]) => {
    if (!insight) return [placeId, insight]
    const selection = REGIONAL_SELECTION[placeId]
    const previews = REGIONAL_POST_PREVIEWS.filter((preview) => preview.placeId === placeId)
      .sort((first, second) => {
        if (first.publishedAt === null) return second.publishedAt === null ? 0 : 1
        if (second.publishedAt === null) return -1
        return Date.parse(second.publishedAt) - Date.parse(first.publishedAt)
      })
    const sources = new Map(insight.sources.map((entry) => [entry.url, entry]))
    const additionalSources: PublicPlaceSource[] = [
      ...(REGIONAL_THEME_EVIDENCE[placeId]?.sources ?? []),
      ...previews.map((preview): PublicPlaceSource => ({
        url: preview.url, publisher: preview.publisher, title: preview.title,
        publishedAt: preview.publishedAt, datePrecision: preview.datePrecision, checkedAt: preview.checkedAt,
        dateBasis: preview.publishedAt === null ? 'undated' : 'published', supports: ['identity', 'coverage'], note: preview.caption,
      })),
    ]
    for (const entry of additionalSources) {
      const previous = sources.get(entry.url)
      sources.set(entry.url, { ...previous, ...entry, supports: [...new Set([...(previous?.supports ?? []), ...entry.supports])] })
    }
    return [placeId, {
      ...insight, sources: [...sources.values()],
      featuredReason: selection ? selection.eligibleMain ? selection.reasonEn : null : insight.featuredReason,
      recommendationLabel: selection ? selection.eligibleMain ? 'Editor pick' : null : insight.recommendationLabel,
      media: previews.length ? {
        status: 'external-posts', previews, sourceUrls: [...new Set(previews.map((preview) => preview.url))],
        reason: 'Source-hosted posts only. No licensed local photograph; embedding requires a user click and consent. Keep the canonical link available.',
      } : insight.media,
    }]
  }),
)