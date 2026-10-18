import type { PublicPlaceSource } from './placeInsights'

export const REGIONAL_CURATION_CHECKED_AT = '2026-10-18T06:58:56Z'

export interface RegionalThemeEvidence {
  classification: 'major-themed' | 'heritage' | 'unqualified'
  qualityGate: 'two-local-guides' | 'organiser-history' | 'not-met'
  reasonEn: string
  reasonBn: string
  currentTheme: string | null
  themeYear: number | null
  themeStatus: 'reported' | 'planned' | 'conflicting' | 'unknown'
  historicalTheme: { year: number; name: string | null; sourceUrl: string } | null
  sources: PublicPlaceSource[]
}

export interface RegionalPostPreview {
  id: string
  placeId: string
  sourceType: 'youtube' | 'instagram' | 'facebook' | 'news'
  previewType: 'external-post'
  url: string
  publisher: string
  title: string
  publishedAt: string | null
  datePrecision: 'second' | 'day' | 'unknown'
  checkedAt: string
  year: number | null
  footageYear: number | null
  footageYearBasis: 'title-and-description' | 'explicit-retrospective' | 'historical-article' | 'not-established'
  contentKind: 'festival-footage' | 'theme-plan' | 'retrospective' | 'historical-article' | 'unverified-footage'
  caption: string
  thumbnail: null
  embed: {
    provider: 'youtube-nocookie'
    requiresConsent: true
    autoplay: false
    referrerPolicy: 'strict-origin-when-cross-origin'
    verifiedAt: string
    verification: 'public-player-and-oembed'
  } | null
}

function source(url: string, publisher: string, title: string, publishedAt: string | null, supports: PublicPlaceSource['supports'], note: string): PublicPlaceSource {
  return {
    url, publisher, title, publishedAt, supports, note,
    checkedAt: REGIONAL_CURATION_CHECKED_AT,
    dateBasis: publishedAt === null ? 'undated' : 'published',
    datePrecision: publishedAt === null ? 'unknown' : publishedAt.includes('T') ? 'second' : 'day',
  }
}

export const DURGAPUR_VIDEO_GUIDE = source(
  'https://www.youtube.com/watch?v=0GBWlLTUoFA', 'Durgapur Festival / YouTube',
  'Durgapur Route-Wise Top 17 Biggest Durgapuja Pandal Themes of 2026', '2026-08-18T15:15:34Z',
  ['identity', 'address', 'theme', 'visitor-appeal'],
  'Public title, description, publication metadata and individual host-map links verified. A local theme-planning guide, not finished-pandal footage or an adopted ranking.',
)

const historicalGuide = source(
  'https://www.beautyofdurgapur.com/famous-durga-puja-pandals-durgapur/', 'Beauty of Durgapur / Swarnab Dutta',
  'Famous Durga Puja Pandals in Durgapur 2021: theme and location', '2022-01-03',
  ['identity', 'address', 'theme', 'visitor-appeal'],
  'Explicitly covers 2021, despite 2022 publication. Describes themed construction and visitor appeal; photographs remain on the publisher site without a reuse licence. Incorrect Chaturanga map link is not accepted.',
)

const posterGuide = source(
  'https://myaaspaas.in/blog/durgapur-durga-puja-2026-17-must-visit-pandals-themes-and-route-guide-from-raniganj-panagarh-and-barjora',
  'AasPaas / Swastika Paul', 'Durgapur 2026: 17 pandals and poster-listed themes', '2026-10-13',
  ['identity', 'theme', 'visitor-appeal'],
  'The author explicitly identifies poster-listed plans, not committee-confirmed finished work. Nabakaran, Jhumurtala and Phulberia are not silently treated as aliases of other organisers.',
)

const namedGuide = source(
  'https://myaaspaas.in/blog/durgapur-durga-puja-2026-16-famous-pandal-locations-and-route-map',
  'AasPaas / Swastika Paul', 'Durgapur 2026: sixteen named locations', '2026-10-12',
  ['identity', 'address'], 'A name or locality alone does not establish major themed construction or a route-ready ground.',
)

const photoGuide = source(
  'https://www.instagram.com/reel/DeFgl6KzIDV/', 'Ashis Kumar Photography (@ashisgraphy_) / Instagram',
  'Durgapur 2026: ten featured theme plans', '2026-10-04T20:38:32Z',
  ['identity', 'theme', 'visitor-appeal'],
  'The main caption individually names the themes and photographic selections. Future-facing plans; playback unavailable. The public time element resolves the 4 October UTC / 5 October IST date difference. No ranking or engagement counts adopted.',
)

const asansolGuide = source(
  'https://pandalhoppers.in/', 'Pandal Hoppers', 'Asansol 2026: named theme-puja selections, rendered page', null,
  ['identity', 'address', 'theme', 'visitor-appeal'],
  'Uses named theme descriptions only, not votes, queues, visitor counts or parking claims. The rendered page separates Adi Puja and Scheme 2; the earlier static conflation and viewport-only pins are rejected.',
)

const kalyanpurPost = source(
  'https://www.instagram.com/reel/DeOemZmoM-L/', 'ASANSOL City Of Brotherhood (@asansolcob) / Instagram',
  'Kalyanpur Housing 2026: three distinct theme plans', '2026-10-08T08:14:15Z',
  ['identity', 'address', 'theme', 'visitor-appeal'],
  'Main caption distinguishes K-Sector, Adi Puja and Scheme 2, describes their planned presentations and recommends the group. Public timestamp verified; no playback, image reuse or popularity claim.',
)

const dhemomainPost = source(
  'https://www.instagram.com/reel/DefALNPBHms/', 'ASANSOL City Of Brotherhood (@asansolcob) / Instagram',
  'Dhemomain Colliery: Ram Mandir-themed Durga Puja 2026', '2026-10-14T18:15:38Z',
  ['identity', 'address', 'theme', 'visitor-appeal', 'coverage'],
  'The main caption explicitly describes the decorated 2026 Ram Mandir-themed pandal and recommends a visit. This is not the separate AI-labelled Kulti Updates poster; playback was unavailable.',
)

const rabindranagarVideo = source(
  'https://www.youtube.com/watch?v=n6Y9R7bP8T4', 'Middleclass Bengali / YouTube',
  'Rabindranagar 2026: Tripureshwarer Gouri pandal tour', '2026-10-16T04:40:02Z',
  ['identity', 'theme', 'visitor-appeal', 'coverage'],
  'Public title and description explicitly describe 2026 temple-inspired artwork. The title says Unnayan, while the description says Udyapan; the map and directory identify Unnayan. Theme wording differs from the directory, so no definitive current theme title is assigned.',
)

const netajiPost = source(
  'https://www.instagram.com/reel/Decb8PIPBZW/', 'Asansol Pictorial (@asansol_pictorial) / Instagram',
  'Netaji Sporting Club, Burnpur: Kulfir Sikha theme', '2026-10-13T18:20:29Z',
  ['identity', 'address', 'theme', 'coverage'],
  'Public main caption names Burnpur and Kulfir Sikha. The directory instead says Hamsa O Shikhar. Neither is asserted as the definitive current theme; this is not the similarly named Kolkata or Pandu club.',
)

const netajiVideo = source(
  'https://www.youtube.com/watch?v=rLdtzBBmXwQ', 'Amrit Ganguly / YouTube',
  'Netaji Sporting Club Durga Puja 2026, Asansol', '2026-10-16T02:34:06Z',
  ['identity', 'coverage'], 'Public title and description both identify the 2026 pandal; no theme name, queue, opening time or parking is established.',
)

const agraniPost = source(
  'https://www.instagram.com/reel/Dei6-7kR4c_/', 'Priti (@gpriti1988) / Instagram',
  'Agrani Sanskritik Parishad: 2026 Akshardham-themed pandal video', '2026-10-16T06:47:06Z',
  ['identity', 'theme', 'coverage'],
  'Main caption explicitly names the 2026 Agrani pandal and USA Swaminarayan Akshardham theme. The public time element, not the earlier search snippet, establishes 16 October. Playback unavailable.',
)

const fuljhoreVideo = source(
  'https://www.youtube.com/watch?v=rpEUx0X674U', 'Durgapur Official / YouTube',
  'Fuljhore Durga Puja 2026: first look', '2026-10-15T15:59:15Z',
  ['identity', 'coverage'], 'Public title and opening description explicitly identify Fuljhore and 2026. The channel name is a publisher byline, not proof of an organiser or government affiliation.',
)

const shankarpurVideo = source(
  'https://www.youtube.com/watch?v=E6lIrXXk_Ww', "mampi's magic / YouTube",
  'Shankarpur Durga Puja 2026: first look', '2026-10-15T07:28:18Z',
  ['identity', 'coverage'], 'The title and opening description say 2026, but the description also contains 2025 and 2024 tags. Footage year remains unknown; this is a verified public video link, not verified 2026 footage.',
)

const apcarVideo = source(
  'https://www.youtube.com/watch?v=_tQlwk18uaE', 'Swarnadeep.Adhikari / YouTube',
  'Asansol Durga Puja 2026: Apcar Garden, part 4', '2026-10-17T07:10:00Z',
  ['identity', 'coverage'], 'Title says 2026; description is empty. The footage year and annual ground match are not independently established.',
)

const chelidangaVideo = source(
  'https://www.youtube.com/watch?v=JQxDo-5IJYc', 'Amit Bhakti Vlogs / YouTube',
  'New Upper Chelidanga, Asansol: Durga Puja opening 2026', '2026-10-16T03:43:47Z',
  ['identity', 'coverage'], 'Public title and description identify the 2026 opening, not a specific major theme or a mapped ground.',
)

const chelidangaRetrospective = source(
  'https://www.instagram.com/p/DdJqynRCB3v/', 'New Upper Chelidanga Sarbojanin Durga Puja (@nucac_durgapuja_asansol) / Instagram',
  'New Upper Chelidanga Athletic Club: 2023 retrospective', '2026-09-11T14:52:17Z',
  ['identity', 'address', 'history'], 'Organiser caption recalls 2023 and states a tradition since 1966. Publication in 2026 does not change the photograph year. Current theme and ground remain unresolved.',
)

function majorTheme(currentTheme: string | null, themeStatus: RegionalThemeEvidence['themeStatus'], reasonEn: string, reasonBn: string, sources: PublicPlaceSource[], historicalName?: string | null): RegionalThemeEvidence {
  return {
    classification: 'major-themed', qualityGate: 'two-local-guides', currentTheme, themeYear: 2026, themeStatus,
    reasonEn, reasonBn, sources,
    historicalTheme: historicalName === undefined ? null : { year: 2021, name: historicalName, sourceUrl: historicalGuide.url },
  }
}

function unqualified(reasonEn: string, reasonBn: string, sources: PublicPlaceSource[]): RegionalThemeEvidence {
  return {
    classification: 'unqualified', qualityGate: 'not-met', currentTheme: null, themeYear: null, themeStatus: 'unknown',
    reasonEn, reasonBn, sources, historicalTheme: null,
  }
}

export const REGIONAL_THEME_EVIDENCE: Readonly<Partial<Record<string, RegionalThemeEvidence>>> = {
  'asansol-dhemomain': majorTheme('Ayodhya Ram Mandir', 'reported',
    'The directory and an October 14 local report describe Ram Mandir-themed construction and recommend a photographic visit; not selected merely because a puja exists.',
    'তালিকা ও ১৪ অক্টোবরের স্থানীয় প্রতিবেদনে রাম মন্দির-অনুপ্রাণিত নির্মাণ ও দর্শনের আকর্ষণ আছে; শুধু পুজো হয় বলেই বাছাই নয়।', [asansolGuide, dhemomainPost]),
  'asansol-kalyanpur-k-sector': majorTheme('Buddhist temple', 'planned',
    'Two local guides feature a large Buddhist-temple-inspired presentation. The exact foreign temple identification is not independently confirmed.',
    'দুটি স্থানীয় গাইডে বৌদ্ধ মন্দির-অনুপ্রাণিত বড় মণ্ডপের উল্লেখ আছে। বিদেশের নির্দিষ্ট কোন মন্দির, তা স্বাধীনভাবে নিশ্চিত নয়।', [asansolGuide, kalyanpurPost, source(
      'https://bharatbz.com/west-bengal/k-sector-kalyanpur-housing-durga-puja-70160', 'BharatBZ', 'K-Sector Kalyanpur Housing Durga Puja: directory address', null,
      ['identity', 'address'], 'Independently matches Sunity Apartments and Housing Road. Reviews, ratings, map image and opening-hour claims are not adopted.',
    )]),
  'asansol-kalyanpur-adi-puja': majorTheme('Swaminarayan Mandir', 'planned',
    'Two guides independently distinguish Adi Puja and describe its architectural replica theme. It is not Scheme 2 or the nearby committee office.',
    'দুটি গাইডে আদি পুজোকে আলাদা করে স্থাপত্যের প্রতিরূপ-থিম বলা হয়েছে। এটি স্কিম ২ বা পাশের কমিটির অফিস নয়।', [asansolGuide, kalyanpurPost, source(
      'https://bharatbz.com/west-bengal/kalyanpur-adi-puja-1490102', 'BharatBZ', 'Kalyanpur Adi Puja: Housing Road directory address', null,
      ['identity', 'address'], 'Independently matches the named Adi Puja and Housing Road / Kanyapur address. No reviewer theme, parking or crowd claims adopted.',
    )]),
  'asansol-kalyanpur-scheme-2': majorTheme('Singhasane Singhobahini', 'planned',
    'Two guides distinguish Scheme 2 and its artistic theme; the independently matched puja arena is separate from Adi Puja.',
    'দুটি গাইডে স্কিম ২ ও তার শিল্প-থিম আলাদা করে বলা হয়েছে; মানচিত্রের পুজো প্রাঙ্গণও আদি পুজো থেকে আলাদা।', [asansolGuide, kalyanpurPost]),
  'asansol-rabindranagar': majorTheme(null, 'conflicting',
    'The directory and a dated local video describe elaborate temple-inspired pandal art. Theme titles differ, so the 2026 title remains unresolved, not guessed.',
    'তালিকা ও তারিখসহ স্থানীয় ভিডিওতে মন্দির-অনুপ্রাণিত মণ্ডপশিল্পের বর্ণনা আছে। থিমের নাম আলাদা হওয়ায় ২০২৬-এর নির্দিষ্ট নাম অনুমান করা হয়নি।', [asansolGuide, rabindranagarVideo]),
  'asansol-netaji-sporting': majorTheme(null, 'conflicting',
    'Two local guides document themed construction at the Burnpur club; a current video corroborates its annual identity. Conflicting theme names are kept unresolved.',
    'দুটি স্থানীয় গাইডে বার্নপুরের ক্লাবের থিম-নির্মাণ আছে; বর্তমান ভিডিওতেও পুজোর পরিচয় মেলে। পরস্পরবিরোধী থিমের নাম নিশ্চিত বলা হয়নি।', [asansolGuide, netajiPost, netajiVideo]),
  'durgapur-urvashi': majorTheme('Mangalghat', 'planned',
    'Historical coverage documents plastic-recycling pandal art and visitor appeal; a second guide lists the 2026 Mangalghat plan, not finished-work verification.',
    'পুরনো প্রতিবেদনে প্লাস্টিক পুনর্ব্যবহারের মণ্ডপশিল্প ও দর্শনের আকর্ষণ আছে; দ্বিতীয় গাইডে ২০২৬-এর মঙ্গলঘট পরিকল্পনা, সম্পূর্ণ নির্মাণের প্রমাণ নয়।', [historicalGuide, posterGuide], 'Recycling plastic waste'),
  'durgapur-cement-park': majorTheme('Matir Taane', 'planned',
    'A historically documented beautiful theme-pandal, with the 2026 soil-and-roots concept listed by two current guides. Chaturanga is a different ground.',
    'পুরনো প্রতিবেদনে সুন্দর থিম মণ্ডপের বর্ণনা আছে; দুটি বর্তমান গাইডে ২০২৬-এর মাটির টানে ধারণা। চতুরঙ্গের মাঠ আলাদা।', [historicalGuide, posterGuide, photoGuide], null),
  'durgapur-sector-2c': majorTheme('Akshardham Temple, Delhi', 'planned',
    'The historical illustrated guide reports recurring visitor appeal; two 2026 guides describe the architectural theme plan.',
    'পুরনো সচিত্র গাইডে প্রতি বছরের দর্শনার্থীর আকর্ষণ আছে; দুটি ২০২৬-এর গাইডে স্থাপত্য-থিমের পরিকল্পনা বলা হয়েছে।', [historicalGuide, posterGuide, photoGuide], null),
  'durgapur-buddha-bihar': majorTheme('Neither a Goddess nor an Ordinary Woman', 'planned',
    'Historical reporting explicitly describes a distinctive theme-based pandal; the current poster guide lists a women-focused concept. No finished 2026 theme is claimed.',
    'পুরনো প্রতিবেদনে স্বতন্ত্র থিম-ভিত্তিক মণ্ডপ বলা হয়েছে; বর্তমান পোস্টার-গাইডে নারী-কেন্দ্রিক ধারণা আছে। ২০২৬-এর সম্পূর্ণ থিম নিশ্চিত বলা হয়নি।', [historicalGuide, posterGuide], 'Contemporary conditions across India'),
  'durgapur-marconi': majorTheme('BAPS Hindu Mandir, Abu Dhabi', 'planned',
    'Historical and current local guides feature Marconi Dakshin Pally for pandal art. The current guide links its named maidan, replacing the older generic park point.',
    'পুরনো ও বর্তমান স্থানীয় গাইডে মার্কনি দক্ষিণ পল্লীর মণ্ডপশিল্পের উল্লেখ আছে। বর্তমান গাইডের নামযুক্ত ময়দান পুরনো সাধারণ পার্কের বিন্দুর বদলে ব্যবহার করা হয়েছে।', [historicalGuide, photoGuide, DURGAPUR_VIDEO_GUIDE], null),
  'durgapur-shankarpur': majorTheme('Shri Krishna Dwarka Nagari', 'planned',
    'Two local theme guides feature the Dwarka-inspired architecture and photographic appeal. The named annual puja ground is independently matched.',
    'দুটি স্থানীয় থিম-গাইডে দ্বারকা-অনুপ্রাণিত স্থাপত্য ও ছবির আকর্ষণ আছে। বার্ষিক পুজোর নামযুক্ত মাঠ আলাদাভাবে মিলিয়ে দেখা হয়েছে।', [posterGuide, photoGuide, DURGAPUR_VIDEO_GUIDE]),
  'durgapur-fuljhore': majorTheme('Sonar Bangla', 'planned',
    'Historical reporting describes distinctive themes every year; the photography guide features Sonar Bangla and a current public first-look video names 2026.',
    'পুরনো প্রতিবেদনে প্রতি বছরের স্বতন্ত্র থিম আছে; ফটোগ্রাফি গাইডে সোনার বাংলা ও বর্তমান ফার্স্ট-লুক ভিডিওতে ২০২৬-এর উল্লেখ আছে।', [historicalGuide, photoGuide, DURGAPUR_VIDEO_GUIDE], null),
  'durgapur-chaturanga': majorTheme('Prem Mandir, Vrindavan', 'planned',
    'The historical illustrated guide documents annual visitor appeal; two current guides describe the architectural theme plan at the separately matched Chaturanga ground.',
    'পুরনো সচিত্র গাইডে বার্ষিক দর্শনের আকর্ষণ আছে; দুটি বর্তমান গাইডে স্থাপত্য-থিমের পরিকল্পনা ও চতুরঙ্গের আলাদা মাঠ মেলে।', [historicalGuide, posterGuide, photoGuide], null),
  'durgapur-agrani': majorTheme('BAPS Swaminarayan Akshardham, USA', 'reported',
    'Historical and current guides feature major architectural pandal work; the October 16 post explicitly names the 2026 Akshardham presentation at Agrani.',
    'পুরনো ও বর্তমান গাইডে বড় স্থাপত্য-থিমের কাজ আছে; ১৬ অক্টোবরের পোস্টে অগ্রণীর ২০২৬-এর অক্ষরধাম নির্মাণের স্পষ্ট উল্লেখ আছে।', [historicalGuide, photoGuide, agraniPost, DURGAPUR_VIDEO_GUIDE], null),
  'durgapur-bhiringi-nabarun': majorTheme('Phire Dekha', 'planned',
    'The photography guide features Nabarun among its theme selections; the separate local video guide names and maps Bhiringi Nabaroon. No Nabakaran alias is assumed.',
    'ফটোগ্রাফি গাইডে থিমের বাছাইয়ে নবারুণ আছে; আলাদা স্থানীয় ভিডিও গাইডে ভিড়িঙ্গি নবারুণের নাম ও মাঠ আছে। নবকরণকে একই নাম ধরা হয়নি।', [photoGuide, DURGAPUR_VIDEO_GUIDE]),
  'durgapur-54-foot-benachity': majorTheme('Ayodhya Ram Mandir', 'planned',
    'Two current guides feature the architectural theme. The source map explicitly combines Khudiram Math and 54 Feet into one annual host, not two stops or a measured height.',
    'দুটি বর্তমান গাইডে স্থাপত্য-থিমের উল্লেখ আছে। উৎসের মানচিত্রে ক্ষুদিরাম মাঠ ও ৫৪ ফুট একই পুজোর স্থান, দুটি বিরতি বা মাপা উচ্চতা নয়।', [photoGuide, posterGuide, DURGAPUR_VIDEO_GUIDE]),
  'durgapur-gopalmath': majorTheme('Kalpanar Kalpataru', 'planned',
    'Two guides feature an imaginative art theme, but this review has not matched the annual host ground. Qualified for separate research, not the main trip flow.',
    'দুটি গাইডে কল্পনানির্ভর শিল্প-থিম আছে, কিন্তু এই পর্যালোচনায় বার্ষিক পুজোর মাঠ মেলানো হয়নি। আলাদা গবেষণার জন্য, মূল ভ্রমণতালিকায় নয়।', [posterGuide, photoGuide]),
  'asansol-new-upper-chelidanga': {
    classification: 'heritage', qualityGate: 'organiser-history', currentTheme: null, themeYear: null, themeStatus: 'unknown', historicalTheme: null,
    reasonEn: 'Heritage only: the organiser documents a tradition since 1966 and a 2023 retrospective. A current opening video does not establish a qualifying 2026 theme or exact ground.',
    reasonBn: 'শুধু ঐতিহ্য: আয়োজকের মতে ১৯৬৬ থেকে পুজো ও ২০২৩-এর স্মৃতিচারণ আছে। বর্তমান উদ্বোধনের ভিডিওতে যোগ্য ২০২৬-এর থিম বা নির্দিষ্ট মাঠ প্রতিষ্ঠিত হয়নি।',
    sources: [chelidangaRetrospective, chelidangaVideo],
  },
  'durgapur-sepco': unqualified('A mapped puja ground and one poster-listed Nagaland concept do not yet meet the two-source major-art gate. Retained for history, excluded from default selection.', 'মানচিত্রের পুজোর মাঠ ও একটি পোস্টারের নাগাল্যান্ড ধারণা বড় শিল্পমণ্ডপের দুই-উৎস শর্ত পূরণ করে না। পুরনো তথ্য রাখা আছে, স্বাভাবিক বাছাইয়ে নেই।', [namedGuide, posterGuide]),
  'durgapur-palashdiha': unqualified('A poster mentions lighting, but major themed construction and photographic appeal lack a second qualifying source; the ground is also unresolved.', 'পোস্টারে আলোর উল্লেখ আছে, কিন্তু বড় থিম-নির্মাণ ও ছবির আকর্ষণের দ্বিতীয় যোগ্য উৎস নেই; মাঠও মেলেনি।', [namedGuide, posterGuide]),
  'durgapur-dumurtala': unqualified('Locality-listing evidence only. Jhumurtala is not a verified alias and its theme cannot be transferred here.', 'শুধু এলাকার তালিকার প্রমাণ আছে। ঝুমুরতলা একই পুজো বলে যাচাই হয়নি, তাই তার থিম এখানে প্রযোজ্য করা হয়নি।', [namedGuide]),
  'durgapur-club-santose': unqualified('The named listing does not establish a major photographic pandal or resolve the Santose/Santosh organiser identity.', 'নামযুক্ত তালিকা বড় ফটোগ্রাফিক মণ্ডপ বা সন্তোষ নামের আয়োজকের পরিচয়ের অসংগতি মেটায় না।', [namedGuide]),
  'durgapur-chandidas-rajendra-prasad': unqualified('The dated report concerns a celebrity visit and the 66th edition, not qualifying theme construction; no exact ground is matched.', 'তারিখসহ প্রতিবেদনে তারকার আগমন ও ৬৬তম বর্ষ আছে, যোগ্য থিম-নির্মাণের বিবরণ নয়; নির্দিষ্ট মাঠও মেলেনি।', [source(
    'https://onkarbangla.com/durgapur-actor-prasenjit-attend-durgapuja-of-chandidas/', 'Onkar Bangla / Online Desk', 'Chandidas Rajendra Prasad puja: celebrity-visit report', '2026-10-17', ['identity', 'coverage'], 'Crowds attracted by a celebrity do not establish pandal-art appeal or a surveyed host.',
  )]),
  'asansol-simultala': unqualified('One directory names a rural-art concept; a second qualifying art/visitor source and exact annual ground remain unverified.', 'একটি তালিকায় গ্রামীণ শিল্পের ধারণা আছে; শিল্প বা দর্শনের দ্বিতীয় যোগ্য উৎস ও বার্ষিক পুজোর নির্দিষ্ট মাঠ যাচাই বাকি।', [asansolGuide]),
  'asansol-apcar-garden': unqualified('The current tour names Apcar Garden, but its empty description does not corroborate the directory theme. The playground is not yet a proven annual host.', 'বর্তমান ভিডিওতে আপকার গার্ডেনের নাম আছে, কিন্তু খালি বিবরণ তালিকার থিমকে সমর্থন করে না। খেলার মাঠ বার্ষিক পুজোর স্থান বলে এখনও প্রমাণিত নয়।', [asansolGuide, apcarVideo]),
}

type PreviewDetails = Pick<RegionalPostPreview, 'sourceType' | 'year' | 'footageYear' | 'footageYearBasis' | 'contentKind' | 'caption'>

function postPreview(placeId: string, key: string, publicSource: PublicPlaceSource, details: PreviewDetails, embedAllowed = false): RegionalPostPreview {
  return {
    id: `${placeId}-${key}`, placeId, previewType: 'external-post', ...details,
    url: publicSource.url, publisher: publicSource.publisher, title: publicSource.title,
    publishedAt: publicSource.publishedAt, datePrecision: publicSource.datePrecision ?? 'unknown',
    checkedAt: REGIONAL_CURATION_CHECKED_AT, thumbnail: null,
    embed: embedAllowed ? {
      provider: 'youtube-nocookie', requiresConsent: true, autoplay: false,
      referrerPolicy: 'strict-origin-when-cross-origin', verifiedAt: REGIONAL_CURATION_CHECKED_AT,
      verification: 'public-player-and-oembed',
    } : null,
  }
}

const currentVideoDetails: PreviewDetails = {
  sourceType: 'youtube', year: 2026, footageYear: 2026, footageYearBasis: 'title-and-description',
  contentKind: 'festival-footage', caption: 'The public title and description identify the 2026 festival. Capture date, present opening and access are not independently verified.',
}

export const REGIONAL_POST_PREVIEWS: readonly RegionalPostPreview[] = [
  postPreview('durgapur-shankarpur', 'first-look-2026', shankarpurVideo, {
    ...currentVideoDetails, footageYear: null, footageYearBasis: 'not-established', contentKind: 'unverified-footage',
    caption: 'The source says 2026 first look but also includes older-year tags. Footage year is unverified; do not label this confirmed 2026 imagery.',
  }, true),
  postPreview('durgapur-fuljhore', 'first-look-2026', fuljhoreVideo, currentVideoDetails, true),
  postPreview('asansol-rabindranagar', 'tour-2026', rabindranagarVideo, {
    ...currentVideoDetails, caption: 'The 2026 title and description name temple-inspired artwork. Theme wording differs from the directory; the canonical video remains available as the fallback.',
  }, true),
  postPreview('asansol-netaji-sporting', 'tour-2026', netajiVideo, currentVideoDetails, true),
  postPreview('asansol-apcar-garden', 'tour-2026', apcarVideo, {
    ...currentVideoDetails, footageYear: null, footageYearBasis: 'not-established', contentKind: 'unverified-footage',
    caption: 'The title says 2026 but the description is empty. Footage year and annual ground remain unverified. Research only.',
  }, true),
  postPreview('asansol-new-upper-chelidanga', 'opening-2026', chelidangaVideo, currentVideoDetails, true),
  postPreview('asansol-dhemomain', 'pandal-2026', dhemomainPost, {
    ...currentVideoDetails, sourceType: 'instagram', caption: 'Public caption explicitly describes the decorated Ram Mandir-themed 2026 pandal. Playback unavailable; open the source post. No photo reuse permission.',
  }),
  postPreview('durgapur-agrani', 'pandal-2026', agraniPost, {
    ...currentVideoDetails, sourceType: 'instagram', caption: 'The main caption explicitly identifies the 2026 Akshardham-themed Agrani pandal. Playback unavailable; link preview only, not a copied photograph.',
  }),
  ...['asansol-kalyanpur-k-sector', 'asansol-kalyanpur-adi-puja', 'asansol-kalyanpur-scheme-2'].map((placeId) => postPreview(placeId, 'theme-plan-2026', kalyanpurPost, {
    sourceType: 'instagram', year: 2026, footageYear: null, footageYearBasis: 'not-established', contentKind: 'theme-plan',
    caption: 'An October 8 preview of three distinct Kalyanpur theme plans, not a claim of completed footage. No automatic Instagram embed.',
  })),
  ...['durgapur-shankarpur', 'durgapur-fuljhore', 'durgapur-chaturanga', 'durgapur-agrani', 'durgapur-bhiringi-nabarun', 'durgapur-54-foot-benachity', 'durgapur-marconi', 'durgapur-sector-2c', 'durgapur-cement-park', 'durgapur-gopalmath'].map((placeId) => postPreview(placeId, 'theme-plan-2026', photoGuide, {
    sourceType: 'instagram', year: 2026, footageYear: null, footageYearBasis: 'not-established', contentKind: 'theme-plan',
    caption: 'The public caption individually names this puja in its 2026 theme plans. Not completed-pandal footage, a licensed photo or a measured ranking.',
  })),
  ...['durgapur-urvashi', 'durgapur-buddha-bihar'].map((placeId) => postPreview(placeId, 'poster-plan-2026', posterGuide, {
    sourceType: 'news', year: 2026, footageYear: null, footageYearBasis: 'not-established', contentKind: 'theme-plan',
    caption: 'The author explicitly labels these poster-listed 2026 plans. Finished work and current opening are unverified.',
  })),
  ...['durgapur-urvashi', 'durgapur-buddha-bihar', 'durgapur-cement-park', 'durgapur-sector-2c', 'durgapur-marconi', 'durgapur-agrani', 'durgapur-fuljhore', 'durgapur-chaturanga'].map((placeId) => postPreview(placeId, 'archive-2021', historicalGuide, {
    sourceType: 'news', year: 2021, footageYear: 2021, footageYearBasis: 'historical-article', contentKind: 'historical-article',
    caption: 'Historical 2021 pandal photographs on the publisher page, published January 2022. Not 2026 imagery; no photographs are copied or licensed here.',
  })),
  postPreview('asansol-new-upper-chelidanga', 'retrospective-2023', chelidangaRetrospective, {
    sourceType: 'instagram', year: 2023, footageYear: 2023, footageYearBasis: 'explicit-retrospective', contentKind: 'retrospective',
    caption: 'The organiser explicitly recalls 2023. Its September 2026 publication date is not the photograph year. Research and heritage only.',
  }),
]

export function getRegionalPreviewEmbedUrl(previewId: string, consentGranted = false): string | null {
  if (!consentGranted) return null
  const preview = REGIONAL_POST_PREVIEWS.find((candidate) => candidate.id === previewId)
  if (preview?.embed?.provider !== 'youtube-nocookie' || preview.sourceType !== 'youtube') return null
  const sourceUrl = new URL(preview.url)
  const videoId = sourceUrl.searchParams.get('v')
  if (sourceUrl.origin !== 'https://www.youtube.com' || sourceUrl.pathname !== '/watch' || !videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null
  return `https://www.youtube-nocookie.com/embed/${videoId}`
}