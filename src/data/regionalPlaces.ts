import type { City, JourneyStop, StopKind } from '../types'
import { REGIONAL_THEME_EVIDENCE } from './regionalCuration'
import type { RegionalThemeEvidence } from './regionalCuration'

export { REGIONAL_CURATION_CHECKED_AT } from './regionalCuration'

export interface RegionalPlace extends JourneyStop {
  city: City
  kind: StopKind
  district: string
  coordinateRole: 'mapped-place' | 'named-grounds' | 'host-venue'
  entrySurveyed: false
  eligibleMain?: boolean
}

export const REGIONAL_SOURCE_CHECKED_AT = '2026-10-17T20:55:27Z'
export const REGIONAL_FOLLOWUP_CHECKED_AT = '2026-10-17T21:34:23Z'

export const REGIONAL_ID_ALIASES: Readonly<Record<string, string>> = {
  'durgapur-khudiram-math': 'durgapur-54-foot-benachity',
}

export interface UnlocatedPujaLead {
  id: string
  city: Exclude<City, 'kolkata'>
  name: string
  nameBn: string
  address: string | null
  sourceUrl: string
  addressSourceUrl?: string
  locationNote: string
  checkedAt: string
  requiresManualPin: true
  eligibleMain: false
}

const unlocatedPujaLeads: Omit<UnlocatedPujaLead, 'eligibleMain'>[] = [
  {
    id: 'asansol-new-upper-chelidanga', city: 'asansol',
    name: 'New Upper Chelidanga Athletic Club Durga Puja', nameBn: 'নিউ আপার চেলিডাঙা অ্যাথলেটিক ক্লাব দুর্গাপুজো',
    address: 'New Upper Chelidanga, near Court Railway Crossing, Asansol',
    sourceUrl: 'https://www.instagram.com/p/DdJqynRCB3v/',
    locationNote: 'Organiser caption supplies the club and locality, not a numeric ground coordinate. Posted in 2026 but explicitly a 2023 throwback; not Upper Chelidanga by assumption.',
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, requiresManualPin: true,
  },
  {
    id: 'asansol-simultala', city: 'asansol',
    name: 'Simultala Sarbojanin Durgotsav', nameBn: 'শিমুলতলা সর্বজনীন দুর্গোৎসব',
    address: 'Simultala, Mohishila Colony, Asansol',
    sourceUrl: 'https://pandalhoppers.in/',
    locationNote: 'A named Simultala Durga Mandir map listing matched the locality, but no verified numeric feature coordinate was obtained. The map-name founding year is not adopted.',
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, requiresManualPin: true,
  },
  {
    id: 'asansol-apcar-garden', city: 'asansol',
    name: 'Apcar Garden Sarbojanin Durga Puja', nameBn: 'আপকার গার্ডেন সর্বজনীন দুর্গাপুজো',
    address: 'Apcar Garden / GT Road, Asansol',
    sourceUrl: 'https://pandalhoppers.in/',
    locationNote: 'The directory map link resolved to Apcar Garden Play Ground / Boys Park. That alone does not establish the exact puja host ground.',
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, requiresManualPin: true,
  },
  {
    id: 'durgapur-dumurtala', city: 'durgapur',
    name: 'Dumurtala Durga Puja', nameBn: 'ডুমুরতলা দুর্গাপুজো', address: 'Dumurtala, Durgapur',
    sourceUrl: 'https://myaaspaas.in/blog/durgapur-durga-puja-2026-16-famous-pandal-locations-and-route-map',
    locationNote: 'Guide-listed identity/locality only. Do not assume the other guide\'s Jhumurtala spelling is the same organiser or invent a locality-centre pin.',
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, requiresManualPin: true,
  },
  {
    id: 'durgapur-club-santose', city: 'durgapur',
    name: 'Club Santose Durga Puja', nameBn: 'ক্লাব সন্তোষ দুর্গাপুজো', address: 'Durgapur; street not supplied by the guide',
    sourceUrl: 'https://myaaspaas.in/blog/durgapur-durga-puja-2026-16-famous-pandal-locations-and-route-map',
    locationNote: 'Named puja without a verified street address and exact mapped host. Preserve the guide\'s spelling; no guessed club alias.',
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, requiresManualPin: true,
  },
  {
    id: 'durgapur-palashdiha', city: 'durgapur',
    name: 'Palashdiha Durga Puja', nameBn: 'পলাশডিহা দুর্গাপুজো', address: 'Palashdiha, Durgapur',
    sourceUrl: 'https://myaaspaas.in/blog/durgapur-durga-puja-2026-16-famous-pandal-locations-and-route-map',
    locationNote: 'The guide names the locality, not an exact host ground or gate.',
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, requiresManualPin: true,
  },
  {
    id: 'durgapur-gopalmath', city: 'durgapur',
    name: 'Gopalmath Durga Puja', nameBn: 'গোপালমাঠ দুর্গাপুজো', address: 'Gopalmath, Durgapur',
    sourceUrl: 'https://myaaspaas.in/blog/durgapur-durga-puja-2026-16-famous-pandal-locations-and-route-map',
    locationNote: 'Locality is source-listed; exact club/ground coordinate has not been matched.',
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, requiresManualPin: true,
  },
  {
    id: 'durgapur-chandidas-rajendra-prasad', city: 'durgapur',
    name: 'Chandidas Rajendra Prasad Sarbojanin Durga Puja', nameBn: 'চণ্ডীদাস রাজেন্দ্র প্রসাদ সর্বজনীন দুর্গাপুজো',
    address: 'Chandidas, Durgapur; exact ground not supplied by the report',
    sourceUrl: 'https://onkarbangla.com/durgapur-actor-prasenjit-attend-durgapuja-of-chandidas/',
    locationNote: 'The dated news report names the organiser but not an exact mapped ground. Chandidas Rotary Park and other Rajendra Prasad parks are not substitutes.',
    checkedAt: REGIONAL_FOLLOWUP_CHECKED_AT, requiresManualPin: true,
  },
]

export const UNLOCATED_PUJA_LEADS: UnlocatedPujaLead[] = unlocatedPujaLeads.map((lead) => ({ ...lead, eligibleMain: false }))

export const REGIONAL_CATALOGUE_NOTICE = {
  en: 'Curated annual theme pujas; plans, current reports and historical media are labelled separately. Pins are approximate hosts, not surveyed entrances or parking. Visit durations are estimates, not measured queues. Current opening and car access remain unknown.',
  bn: 'বাছাই করা বার্ষিক থিম পুজো; পরিকল্পনা, বর্তমান প্রতিবেদন ও পুরনো ছবি আলাদা করে চিহ্নিত। বিন্দুগুলি আনুমানিক পুজোর স্থান, যাচাই করা প্রবেশদ্বার বা পার্কিং নয়। দর্শনের সময় অনুমান, মাপা অপেক্ষা নয়। বর্তমান খোলার সময় ও গাড়ির প্রবেশ অজানা।',
}

export const REGIONAL_COVERAGE_NOTICES: Record<City, { en: string; bn: string }> = {
  kolkata: {
    en: 'The existing Kolkata pandal catalogue is unchanged. Added food and heritage stops are separate, optional visits.',
    bn: 'কলকাতার আগের পুজোর তালিকা অপরিবর্তিত। নতুন খাবার ও ঐতিহ্যের স্থানগুলি আলাদা, ঐচ্ছিক দর্শন।',
  },
  asansol: {
    en: 'Partial coverage: the main selection contains source-backed major theme pujas with matched hosts. Unqualified, heritage-only and unlocated research entries are excluded. Food and sights are optional and do not fill the pandal count.',
    bn: 'অসম্পূর্ণ তালিকা: মূল বাছাইয়ে উৎসসমর্থিত বড় থিম পুজো ও মেলানো স্থান আছে। অযোগ্য, শুধু ঐতিহ্য বা অবস্থান অজানা গবেষণার নাম বাদ। খাবার ও দর্শনীয় স্থান ঐচ্ছিক, মণ্ডপের সংখ্যায় ধরা হয় না।',
  },
  durgapur: {
    en: 'Partial coverage: curated major theme pujas, not every locality with a puja. Older themes and 2026 plans are distinct from current footage. Research-only entries are excluded from the main trip; entrances and car access remain unverified.',
    bn: 'অসম্পূর্ণ তালিকা: বড় থিম পুজোর বাছাই, পুজো হওয়া সব এলাকা নয়। পুরনো থিম ও ২০২৬-এর পরিকল্পনা বর্তমান ভিডিও থেকে আলাদা। শুধু গবেষণার নাম মূল ভ্রমণ থেকে বাদ; প্রবেশদ্বার ও গাড়ির প্রবেশ যাচাই হয়নি।',
  },
}

export const FOOD_BREAK_MINUTES = 45

const regionalPandals: RegionalPlace[] = [
  {
    id: 'asansol-dhemomain', city: 'asansol', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Dhemomain Colliery Durga Puja', nameBn: 'ধেমোমেন কোলিয়ারি দুর্গাপুজো',
    lat: 23.7043778, lng: 86.9083866, address: 'Dhemomain / Sitarampur, Asansol',
    description: 'The regional guide and an October 14 public report describe an Ayodhya Ram Mandir-inspired 2026 pandal and its visual appeal. The existing map anchor matches Dhemomain Durga Puja Committee, not the football ground. No gate or parking is surveyed.',
    descriptionBn: 'আঞ্চলিক গাইড ও ১৪ অক্টোবরের প্রকাশ্য প্রতিবেদনে অযোধ্যার রাম মন্দির-অনুপ্রাণিত ২০২৬-এর মণ্ডপের বর্ণনা আছে। মানচিত্রে ধেমোমেন দুর্গাপুজো কমিটি মেলে, ফুটবল মাঠ নয়। প্রবেশদ্বার বা পার্কিং সমীক্ষা হয়নি।',
    highlight: 'Major theme: Ram Mandir architecture, reported in 2026', highlightBn: 'বড় থিম: ২০২৬-এর প্রতিবেদনে রাম মন্দিরের স্থাপত্য',
    featured: true, visitMinutes: 30,
    sourceUrl: 'https://pandalhoppers.in/',
    sourceLabel: 'Pandal Hoppers: named puja and locality; Google Maps: Dhemomain Durga Puja Committee',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'host-venue', entrySurveyed: false,
  },
  {
    id: 'durgapur-urvashi', city: 'durgapur', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Urvashi Sarbojanin Durga Puja', nameBn: 'ঊর্বশী সর্বজনীন দুর্গাপুজো',
    lat: 23.5365902, lng: 87.3049101,
    address: 'Urvashi Complex, 2nd Street, Bengal Ambuja Housing Complex, City Centre, Durgapur',
    description: 'A City Centre community puja documented in historical and recent guides. The linked map identifies Urvashi Durga Puja Maidan; the historical article repeats a conflicting Kaliganj street address, which is not used here.',
    descriptionBn: 'পুরনো ও সাম্প্রতিক তালিকায় উল্লিখিত সিটি সেন্টারের সর্বজনীন পুজো। উৎসের মানচিত্রে ঊর্বশী দুর্গাপুজো ময়দান চিহ্নিত; পুরনো লেখায় থাকা অসংগত কালীগঞ্জের ঠিকানা এখানে ব্যবহার করা হয়নি।',
    highlight: 'Editor pick: City Centre community puja', highlightBn: 'সম্পাদকের পছন্দ: সিটি সেন্টারের সর্বজনীন পুজো',
    featured: true, visitMinutes: 30,
    sourceUrl: 'https://www.beautyofdurgapur.com/famous-durga-puja-pandals-durgapur/',
    sourceLabel: 'Beauty of Durgapur: annual identity; linked Google Maps: Urvashi Maidan address and point',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'durgapur-cement-park', city: 'durgapur', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Cement Park Durga Puja', nameBn: 'সিমেন্ট পার্ক দুর্গাপুজো',
    lat: 23.5396265, lng: 87.2927462,
    address: 'Shahid Khudiram Sarani, Recol Park, City Centre, Durgapur',
    description: 'The historical guide documents this puja near Junction Mall. Its own location link matches the named Cement Park Durga Puja Ground; an incorrectly repeated link under Chaturanga is not a second puja here.',
    descriptionBn: 'পুরনো প্রতিবেদনে জংশন মলের কাছের এই পুজোর উল্লেখ আছে। এর নিজস্ব মানচিত্রের লিঙ্কে সিমেন্ট পার্ক দুর্গাপুজোর মাঠ মেলে; চতুরঙ্গের নিচে ভুল করে থাকা একই লিঙ্ককে আলাদা পুজো ধরা হয়নি।',
    highlight: 'Editor pick: documented theme-puja ground', highlightBn: 'সম্পাদকের পছন্দ: উৎসে বর্ণিত থিম পুজোর মাঠ',
    visitMinutes: 30,
    sourceUrl: 'https://www.beautyofdurgapur.com/famous-durga-puja-pandals-durgapur/',
    sourceLabel: 'Beauty of Durgapur: 2021 puja and address; linked Google Maps: Cement Park ground',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'durgapur-sector-2c', city: 'durgapur', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Sector 2C Durga Puja', nameBn: 'সেক্টর ২সি দুর্গাপুজো',
    lat: 23.5177787, lng: 87.3548017,
    address: 'C-51, Bhimpalashri Sarani, Bidhannagar, Durgapur',
    description: 'An established Bidhannagar puja documented in the historical guide. The article and linked Sector 2C Durga Mandap listing agree on the street address; current festival hours and entrances are unverified.',
    descriptionBn: 'পুরনো প্রতিবেদনে বর্ণিত বিধাননগরের প্রতিষ্ঠিত পুজো। লেখা ও লিঙ্ক করা সেক্টর ২সি দুর্গা মণ্ডপের ঠিকানা মেলে; বর্তমান পুজোর সময় ও প্রবেশপথ যাচাই হয়নি।',
    highlight: 'Editor pick: Bidhannagar community puja', highlightBn: 'সম্পাদকের পছন্দ: বিধাননগরের সর্বজনীন পুজো',
    visitMinutes: 30,
    sourceUrl: 'https://www.beautyofdurgapur.com/famous-durga-puja-pandals-durgapur/',
    sourceLabel: 'Beauty of Durgapur: 2021 puja and address; linked Google Maps: Sector 2C Durga Mandap',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'durgapur-buddha-bihar', city: 'durgapur', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Buddha Bihar Sarbojanin Durgotsab', nameBn: 'বুদ্ধ বিহার সর্বজনীন দুর্গোৎসব',
    lat: 23.5517329, lng: 87.3110228,
    address: '1 Bhagat Singh Marg, Hatora, C-Zone, Durgapur',
    description: 'An established community puja documented in the 2021 guide and named again in the 2026 list. The linked map identifies the puja itself, not the neighbouring playground; its point is not a surveyed entrance.',
    descriptionBn: '২০২১-এর প্রতিবেদনে বর্ণিত ও ২০২৬-এর তালিকায় উল্লিখিত সর্বজনীন পুজো। উৎসের মানচিত্রে পুজোর স্থানটিই চিহ্নিত, পাশের খেলার মাঠ নয়; বিন্দুটি যাচাই করা প্রবেশদ্বার নয়।',
    highlight: 'Editor pick: documented community puja', highlightBn: 'সম্পাদকের পছন্দ: উৎসে বর্ণিত সর্বজনীন পুজো',
    featured: true, visitMinutes: 30,
    sourceUrl: 'https://www.beautyofdurgapur.com/famous-durga-puja-pandals-durgapur/',
    sourceLabel: 'Beauty of Durgapur: 2021 puja and address; linked Google Maps named puja point',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'durgapur-sepco', city: 'durgapur', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'SEPCO Township Durga Puja', nameBn: 'সেপকো টাউনশিপ দুর্গাপুজো',
    lat: 23.5498992, lng: 87.31662885, address: 'SEPCO Pujo Ground Park, Durgapur',
    description: 'The SEPCO puja is listed in the regional guide. The pin is the mapped Pujo Ground Park, not the separate SEPCO Park or a verified 2026 entrance.',
    descriptionBn: 'আঞ্চলিক তালিকায় সেপকোর পুজো রয়েছে। বিন্দুটি মানচিত্রের পুজো গ্রাউন্ড পার্কে, আলাদা সেপকো পার্ক বা যাচাই করা ২০২৬-এর প্রবেশপথে নয়।',
    highlight: 'Not selected: major-theme evidence incomplete', highlightBn: 'বাছাইয়ে নেই: বড় থিমের প্রমাণ অসম্পূর্ণ',
    visitMinutes: 30,
    sourceUrl: 'https://www.openstreetmap.org/way/962677741',
    sourceLabel: 'OpenStreetMap: Sepco Pujo Ground Park; mapped grounds centre',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'durgapur-marconi', city: 'durgapur', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Marconi Dakshin Pally Durga Puja', nameBn: 'মার্কনি দক্ষিণ পল্লী দুর্গাপুজো',
    lat: 23.5666714, lng: 87.3117825, address: 'Marconi Avenue, B-Zone, Durgapur',
    description: 'Historical and current local guides feature this architectural theme-puja. The 2026 guide links Marconi Dakshin Pally Durgapuja Maidan, about 110 metres from the older generic park point. The stable ID is retained; adjacent grounds are not counted as more organisers.',
    descriptionBn: 'পুরনো ও বর্তমান স্থানীয় গাইডে এই স্থাপত্য-থিম পুজো আছে। ২০২৬-এর গাইডে মার্কনি দক্ষিণ পল্লী দুর্গাপুজো ময়দান মেলে, পুরনো সাধারণ পার্কের বিন্দু থেকে প্রায় ১১০ মিটার দূরে। পরিচয় একই রাখা হয়েছে; পাশের মাঠ আলাদা পুজো নয়।',
    highlight: 'Major theme: BAPS Hindu Mandir, Abu Dhabi (reported plan)', highlightBn: 'বড় থিম: আবুধাবির বিএপিএস হিন্দু মন্দির (প্রকাশিত পরিকল্পনা)',
    visitMinutes: 30,
    sourceUrl: 'https://www.youtube.com/watch?v=0GBWlLTUoFA',
    sourceLabel: 'Durgapur Festival: annual organiser and linked Marconi Dakshin Pally maidan',
    verifiedOn: '2026-10-18', coordinateAccuracy: 'approximate',
    coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'durgapur-shankarpur', city: 'durgapur', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Shankarpur Durga Puja', nameBn: 'শঙ্করপুর দুর্গাপুজো',
    lat: 23.5269002, lng: 87.3571152,
    address: 'Shankarpur Road, Arrah Kalinagar, Shankarpur, Durgapur',
    description: 'Two local guides feature the Dwarka Nagari architectural theme for 2026. The video guide links the named Shankarpur Durgapuja Ground, independently checked in the map panel. This is an approximate ground anchor, not a gate or parking point.',
    descriptionBn: 'দুটি স্থানীয় গাইডে ২০২৬-এর দ্বারকা নগরী স্থাপত্য-থিমের উল্লেখ আছে। ভিডিও গাইডের লিঙ্কে শঙ্করপুর দুর্গাপুজোর মাঠের নাম মেলে। এটি মাঠের আনুমানিক অবস্থান, প্রবেশদ্বার বা পার্কিং নয়।',
    highlight: 'Major theme: Dwarka Nagari (2026 reported plan)', highlightBn: 'বড় থিম পুজো: দ্বারকা নগরী (২০২৬-এর প্রকাশিত পরিকল্পনা)',
    featured: true, visitMinutes: 30,
    sourceUrl: 'https://www.youtube.com/watch?v=0GBWlLTUoFA',
    sourceLabel: 'Durgapur Festival: named annual puja and linked Shankarpur ground; two local theme guides',
    verifiedOn: '2026-10-18', coordinateAccuracy: 'approximate',
    coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'durgapur-fuljhore', city: 'durgapur', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Fuljhore Sarbojanin Durga Puja', nameBn: 'ফুলঝোড় সর্বজনীন দুর্গাপুজো',
    lat: 23.5365038, lng: 87.3373979,
    address: 'Fuljhore More, Kaliganj, Durgapur',
    description: 'Historical coverage describes distinctive themes each year; a 2026 photography guide names Sonar Bangla. The current video guide links the separately verified Fuljhore Durgapuja place, resolving the earlier blank historical map panel.',
    descriptionBn: 'পুরনো প্রতিবেদনে প্রতি বছরের স্বতন্ত্র থিমের উল্লেখ আছে; ২০২৬-এর ফটোগ্রাফি গাইডে সোনার বাংলা বলা হয়েছে। বর্তমান ভিডিও গাইডের লিঙ্কে ফুলঝোড় দুর্গাপুজোর নামযুক্ত স্থান মেলে।',
    highlight: 'Major annual theme-puja; Sonar Bangla reported for 2026', highlightBn: 'বড় বার্ষিক থিম পুজো; ২০২৬-এ সোনার বাংলার উল্লেখ',
    featured: true, visitMinutes: 30,
    sourceUrl: 'https://www.youtube.com/watch?v=0GBWlLTUoFA',
    sourceLabel: 'Durgapur Festival: Fuljhore map link; Beauty of Durgapur: annual theme tradition',
    verifiedOn: '2026-10-18', coordinateAccuracy: 'approximate',
    coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'durgapur-chaturanga', city: 'durgapur', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Chaturanga Durga Puja', nameBn: 'চতুরঙ্গ দুর্গাপুজো',
    lat: 23.5425994, lng: 87.302029,
    address: 'Non-Company Housing Estate, City Centre, Durgapur',
    description: 'A visitor-focused annual pandal with a reported 2026 Prem Mandir architectural theme. The current video guide resolves the named Chaturanga Durga Puja entity, not the Cement Park destination incorrectly linked by the historical article.',
    descriptionBn: 'দর্শনার্থীদের জন্য পরিচিত এই বার্ষিক মণ্ডপের ২০২৬-এর প্রকাশিত থিম প্রেম মন্দির। বর্তমান ভিডিও গাইডে চতুরঙ্গ দুর্গাপুজোর নিজস্ব স্থান মেলে; পুরনো লেখার ভুল সিমেন্ট পার্কের লিঙ্ক ব্যবহার করা হয়নি।',
    highlight: 'Major theme: Prem Mandir (2026 reported plan)', highlightBn: 'বড় থিম পুজো: প্রেম মন্দির (২০২৬-এর প্রকাশিত পরিকল্পনা)',
    featured: true, visitMinutes: 30,
    sourceUrl: 'https://www.youtube.com/watch?v=0GBWlLTUoFA',
    sourceLabel: 'Durgapur Festival: distinct Chaturanga ground; historical and 2026 theme guides',
    verifiedOn: '2026-10-18', coordinateAccuracy: 'approximate',
    coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'durgapur-agrani', city: 'durgapur', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Agrani Sanskritik Parisad Durga Puja', nameBn: 'অগ্রণী সাংস্কৃতিক পরিষদের দুর্গাপুজো',
    lat: 23.5619493, lng: 87.2748116,
    address: 'New Agrani Puja Ground, Agrani Lane, Benachity, Durgapur',
    description: 'A major architectural pandal featured in historical and 2026 local guides. The current guide explicitly links New Agrani Puja Ground. This resolves the old club-address uncertainty without assuming a school or reusing the historical club pin.',
    descriptionBn: 'পুরনো ও ২০২৬-এর স্থানীয় গাইডে উল্লিখিত বড় স্থাপত্য-থিমের মণ্ডপ। বর্তমান গাইডে নিউ অগ্রণী পুজো গ্রাউন্ডের লিঙ্ক আছে; পুরনো ক্লাবের বিন্দু বা অনুমান করা স্কুল ব্যবহার করা হয়নি।',
    highlight: 'Major theme: BAPS Swaminarayan Akshardham, USA', highlightBn: 'বড় থিম পুজো: আমেরিকার বিএপিএস স্বামীনারায়ণ অক্ষরধাম',
    featured: true, visitMinutes: 30,
    sourceUrl: 'https://www.youtube.com/watch?v=0GBWlLTUoFA',
    sourceLabel: 'Durgapur Festival: New Agrani Puja Ground; historical and 2026 theme guides',
    verifiedOn: '2026-10-18', coordinateAccuracy: 'approximate',
    coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'durgapur-bhiringi-nabarun', city: 'durgapur', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Bhiringi Nabarun Durga Puja', nameBn: 'ভিড়িঙ্গি নবারুণ দুর্গাপুজো',
    lat: 23.5480658, lng: 87.2699157,
    address: 'Michael Sarani, Bhiringi, Industrial Area, Durgapur',
    description: 'The local photography guide features Nabarun with the reported Phire Dekha theme. The video guide links Bhiringi Nabaroon Durga Mandir. The stored coordinate is the named feature, not the slightly offset driving endpoint; Nabakaran is not assumed to be an alias.',
    descriptionBn: 'স্থানীয় ফটোগ্রাফি গাইডে নবারুণের ফিরে দেখা থিমের উল্লেখ আছে। ভিডিও গাইডে ভিড়িঙ্গি নবারুণ দুর্গা মন্দিরের লিঙ্ক মেলে। বিন্দুটি নামযুক্ত স্থানের, গাড়ির আলাদা শেষবিন্দুর নয়; নবকরণকে একই পুজো ধরা হয়নি।',
    highlight: 'Major theme selection: Phire Dekha reported for 2026', highlightBn: 'বড় থিম পুজোর বাছাই: ২০২৬-এ ফিরে দেখার উল্লেখ',
    featured: true, visitMinutes: 30,
    sourceUrl: 'https://www.youtube.com/watch?v=0GBWlLTUoFA',
    sourceLabel: 'Durgapur Festival: Bhiringi Nabaroon host; Ashis Photography: theme selection',
    verifiedOn: '2026-10-18', coordinateAccuracy: 'approximate',
    coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'durgapur-54-foot-benachity', city: 'durgapur', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Khudiram Math Durga Puja, 54 Feet Road', nameBn: 'ক্ষুদিরাম মাঠ দুর্গাপুজো, ৫৪ ফুট রোড',
    lat: 23.5555387, lng: 87.2855941,
    address: 'B/15, 54 Feet Road, Srinagar Pally, Benachity, Durgapur',
    description: 'Local guides feature an Ayodhya Ram Mandir-inspired installation. The video guide explicitly labels its map link Khudiram Math, 54 Feet; both names resolve to one host and are counted once. The road name is not a verified pandal height.',
    descriptionBn: 'স্থানীয় গাইডে অযোধ্যার রাম মন্দির-অনুপ্রাণিত নির্মাণের উল্লেখ আছে। ভিডিও গাইডে একই লিঙ্কে ক্ষুদিরাম মাঠ ও ৫৪ ফুট বলা হয়েছে, তাই একবারই গণনা করা হয়। রাস্তার নাম মণ্ডপের মাপের প্রমাণ নয়।',
    highlight: 'Major theme: Ayodhya Ram Mandir (2026 reported plan)', highlightBn: 'বড় থিম পুজো: অযোধ্যার রাম মন্দির (২০২৬-এর প্রকাশিত পরিকল্পনা)',
    featured: true, visitMinutes: 30,
    sourceUrl: 'https://www.youtube.com/watch?v=0GBWlLTUoFA',
    sourceLabel: 'Durgapur Festival: explicit Khudiram Math / 54 Feet host; two local theme guides',
    verifiedOn: '2026-10-18', coordinateAccuracy: 'approximate',
    coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'asansol-kalyanpur-k-sector', city: 'asansol', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Kalyanpur Housing K-Sector Durga Puja', nameBn: 'কল্যাণপুর হাউসিং কে-সেক্টর দুর্গাপুজো',
    lat: 23.6999792, lng: 86.9584407, address: 'Sunity Apartments, Housing Road, Kalyanpur Housing, Asansol',
    description: 'Two local guides feature a Buddhist-temple-inspired presentation. The exact K-Sector Durga Puja map entity matches the separately published Sunity Apartments / Housing Road address. It is not Adi Puja, Scheme 2 or a housing-area centre.',
    descriptionBn: 'দুটি স্থানীয় গাইডে বৌদ্ধ মন্দির-অনুপ্রাণিত নির্মাণ আছে। কে-সেক্টর দুর্গাপুজোর নিজস্ব মানচিত্রে সুনীতি অ্যাপার্টমেন্টস ও হাউসিং রোডের ঠিকানা মেলে। আদি পুজো, স্কিম ২ বা এলাকার কেন্দ্র নয়।',
    highlight: 'Major theme: Buddhist temple (2026 reported plan)', highlightBn: 'বড় থিম: বৌদ্ধ মন্দির (২০২৬-এর প্রকাশিত পরিকল্পনা)',
    visitMinutes: 30, sourceUrl: 'https://pandalhoppers.in/',
    sourceLabel: 'Pandal Hoppers and Asansol City Of Brotherhood: distinct annual theme; named Google Maps puja',
    verifiedOn: '2026-10-18', coordinateAccuracy: 'approximate', coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'asansol-kalyanpur-adi-puja', city: 'asansol', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Kalyanpur Housing Adi Puja', nameBn: 'কল্যাণপুর হাউসিং আদি পুজো',
    lat: 23.7019336, lng: 86.9582026, address: 'Housing Road, Kalyanpur Housing, Kanyapur, Asansol',
    description: 'The two local guides distinguish Adi Puja and its Swaminarayan Mandir replica plan. The named Kalyanpur Adi Puja map listing matches the independent Housing Road address; the nearby committee office and Scheme 2 arena are not substituted.',
    descriptionBn: 'দুটি স্থানীয় গাইডে আদি পুজো ও স্বামীনারায়ণ মন্দিরের প্রতিরূপ-পরিকল্পনা আলাদা করে বলা হয়েছে। মানচিত্রের আদি পুজোর হাউসিং রোডের ঠিকানা আলাদা তালিকার সঙ্গে মেলে; পাশের কমিটির অফিস বা স্কিম ২ নয়।',
    highlight: 'Major theme: Swaminarayan Mandir (2026 reported plan)', highlightBn: 'বড় থিম: স্বামীনারায়ণ মন্দির (২০২৬-এর প্রকাশিত পরিকল্পনা)',
    visitMinutes: 30, sourceUrl: 'https://pandalhoppers.in/',
    sourceLabel: 'Two local theme guides; BharatBZ address; exact Kalyanpur Adi Puja map feature',
    verifiedOn: '2026-10-18', coordinateAccuracy: 'approximate', coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'asansol-kalyanpur-scheme-2', city: 'asansol', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Kalyanpur Housing Scheme 2 Durga Puja', nameBn: 'কল্যাণপুর হাউসিং স্কিম ২ দুর্গাপুজো',
    lat: 23.7044255, lng: 86.9564085, address: 'Scheme 2 Puja Arena, Kalyanpur Housing, Asansol',
    description: 'Two guides separately name Scheme 2 and Singhasane Singhobahini. Its initially blank viewport link was not accepted as evidence; a named-map follow-up independently resolved Kalyanpur Scheme 2 Puja Arena and its feature coordinate.',
    descriptionBn: 'দুটি গাইডে স্কিম ২ ও সিংহাসনে সিংহবাহিনী আলাদা করে বলা আছে। প্রথম খালি মানচিত্রের ভিউপোর্ট প্রমাণ হিসেবে নেওয়া হয়নি; নাম ধরে যাচাইয়ে স্কিম ২ পুজো অ্যারিনা ও তার নিজস্ব বিন্দু মেলে।',
    highlight: 'Major theme: Singhasane Singhobahini (2026 reported plan)', highlightBn: 'বড় থিম: সিংহাসনে সিংহবাহিনী (২০২৬-এর প্রকাশিত পরিকল্পনা)',
    visitMinutes: 30, sourceUrl: 'https://pandalhoppers.in/',
    sourceLabel: 'Two local guides distinguish Scheme 2; separately resolved named Puja Arena',
    verifiedOn: '2026-10-18', coordinateAccuracy: 'approximate', coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'asansol-rabindranagar', city: 'asansol', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Rabindranagar Unnayan Samity Durgotsav', nameBn: 'রবীন্দ্রনগর উন্নয়ন সমিতির দুর্গোৎসব',
    lat: 23.6885322, lng: 86.9442909, address: 'Rabindra Nagar, Asansol',
    description: 'The directory and a dated 2026 public tour describe elaborate temple-inspired pandal art, but use different theme names. The named Unnayan Samity Durga Puja Mandir is matched; its feature point, not the offset driving endpoint, is stored.',
    descriptionBn: 'তালিকা ও তারিখসহ ২০২৬-এর প্রকাশ্য ভিডিওতে মন্দির-অনুপ্রাণিত মণ্ডপশিল্প আছে, কিন্তু থিমের নাম আলাদা। উন্নয়ন সমিতির দুর্গাপুজো মন্দিরের নিজস্ব বিন্দু রাখা হয়েছে, গাড়ির আলাদা শেষবিন্দু নয়।',
    highlight: 'Major themed pandal; current theme wording unresolved', highlightBn: 'বড় থিম মণ্ডপ; বর্তমান থিমের নির্দিষ্ট নাম অমীমাংসিত',
    visitMinutes: 30, sourceUrl: 'https://pandalhoppers.in/',
    sourceLabel: 'Pandal Hoppers and Middleclass Bengali: pandal art; exact Unnayan Samity map feature',
    verifiedOn: '2026-10-18', coordinateAccuracy: 'approximate', coordinateRole: 'named-grounds', entrySurveyed: false,
  },
  {
    id: 'asansol-netaji-sporting', city: 'asansol', kind: 'pandal', district: 'Paschim Bardhaman',
    name: 'Netaji Sporting Club Durga Puja, Burnpur', nameBn: 'নেতাজি স্পোর্টিং ক্লাব দুর্গাপুজো, বার্নপুর',
    lat: 23.6723739, lng: 86.9445177, address: 'Burnpur, Asansol',
    description: 'Two local guides document the Burnpur club as a theme-puja; a current video names its 2026 pandal. Hamsa O Shikhar and Kulfir Sikha are conflicting source titles, not resolved aliases. The exact Netaji Sporting Club Pandal map entity is matched in Burnpur.',
    descriptionBn: 'দুটি স্থানীয় গাইডে বার্নপুরের ক্লাবের থিম পুজো আছে; বর্তমান ভিডিওতেও ২০২৬-এর মণ্ডপের নাম মেলে। উৎসের দুটি থিম-নাম পরস্পরবিরোধী, একই নাম বলে ধরা হয়নি। বার্নপুরের নেতাজি স্পোর্টিং ক্লাব মণ্ডপের নিজস্ব স্থান মেলে।',
    highlight: 'Major themed pandal; current theme wording unresolved', highlightBn: 'বড় থিম মণ্ডপ; বর্তমান থিমের নির্দিষ্ট নাম অমীমাংসিত',
    visitMinutes: 30, sourceUrl: 'https://pandalhoppers.in/',
    sourceLabel: 'Pandal Hoppers, Asansol Pictorial and dated public video; matched Burnpur pandal',
    verifiedOn: '2026-10-18', coordinateAccuracy: 'approximate', coordinateRole: 'named-grounds', entrySurveyed: false,
  },
]

export const REGIONAL_PANDALS: RegionalPlace[] = regionalPandals.map((place) => {
  const eligibleMain = REGIONAL_THEME_EVIDENCE[place.id]?.classification === 'major-themed'
  return { ...place, eligibleMain, featured: eligibleMain }
})

export interface RegionalSelection {
  placeId: string
  city: City
  eligible: boolean | 'needs-location'
  eligibleMain: boolean
  classification: RegionalThemeEvidence['classification']
  qualityGate: RegionalThemeEvidence['qualityGate']
  reasonEn: string
  reasonBn: string
  currentTheme: string | null
  themeYear: number | null
  themeStatus: RegionalThemeEvidence['themeStatus']
  historicalTheme: RegionalThemeEvidence['historicalTheme']
  sourceUrls: string[]
  locationStatus: 'approximate-host' | 'needs-location'
  availability: 'unknown'
  parking: 'unknown'
  carAccess: 'unknown'
}

const mappedRegionalIds = new Set(REGIONAL_PANDALS.map((place) => place.id))

export const REGIONAL_SELECTION: Readonly<Partial<Record<string, RegionalSelection>>> = Object.fromEntries(
  [...REGIONAL_PANDALS, ...UNLOCATED_PUJA_LEADS].map((place): [string, RegionalSelection] => {
    const evidence = REGIONAL_THEME_EVIDENCE[place.id]
    const located = mappedRegionalIds.has(place.id)
    const eligible = evidence?.classification === 'major-themed' ? located ? true : 'needs-location' : false
    return [place.id, {
      placeId: place.id, city: place.city, eligible, eligibleMain: eligible === true,
      classification: evidence?.classification ?? 'unqualified', qualityGate: evidence?.qualityGate ?? 'not-met',
      reasonEn: evidence?.reasonEn ?? 'Major themed-pandal evidence has not been established.',
      reasonBn: evidence?.reasonBn ?? 'বড় থিম মণ্ডপের প্রমাণ প্রতিষ্ঠিত হয়নি।',
      currentTheme: evidence?.currentTheme ?? null, themeYear: evidence?.themeYear ?? null,
      themeStatus: evidence?.themeStatus ?? 'unknown', historicalTheme: evidence?.historicalTheme ?? null,
      sourceUrls: evidence?.sources.map((entry) => entry.url) ?? [place.sourceUrl],
      locationStatus: located ? 'approximate-host' : 'needs-location',
      availability: 'unknown', parking: 'unknown', carAccess: 'unknown',
    }]
  }),
)

export const CURATED_REGIONAL_PANDALS: RegionalPlace[] = REGIONAL_PANDALS.filter((place) => REGIONAL_SELECTION[place.id]?.eligibleMain)
export const THEMED_REGIONAL_IDS: readonly string[] = CURATED_REGIONAL_PANDALS.map((place) => place.id)

export const REGIONAL_THEME_SEEDS = {
  asansol: ['asansol-rabindranagar', 'asansol-kalyanpur-k-sector', 'asansol-kalyanpur-adi-puja', 'asansol-kalyanpur-scheme-2'],
  durgapur: ['durgapur-agrani', 'durgapur-chaturanga', 'durgapur-fuljhore', 'durgapur-shankarpur'],
  crossCity: ['asansol-rabindranagar', 'asansol-kalyanpur-k-sector', 'durgapur-agrani', 'durgapur-shankarpur'],
} as const

export const FOOD_STOPS: RegionalPlace[] = [
  {
    id: 'food-kolkata-college-street-coffee-house', city: 'kolkata', kind: 'restaurant', district: 'Kolkata',
    name: 'Indian Coffee House, College Street', nameBn: 'ইন্ডিয়ান কফি হাউস, কলেজ স্ট্রিট',
    lat: 22.576097, lng: 88.3638913,
    address: '15 Bankim Chatterjee Street, Kolkata 700073',
    description: 'The College Street-area Coffee House has a distinct mapped location on Bankim Chatterjee Street. Its public map lists coffee-shop and Indian food categories.',
    descriptionBn: 'কলেজ স্ট্রিট এলাকার কফি হাউসের অবস্থান বঙ্কিম চ্যাটার্জি স্ট্রিটে। প্রকাশ্য মানচিত্রে কফি শপ ও ভারতীয় খাবারের উল্লেখ আছে।',
    highlight: 'Suggested food stop', highlightBn: 'খাবারের জন্য প্রস্তাবিত বিরতি',
    visitMinutes: FOOD_BREAK_MINUTES,
    sourceUrl: 'https://www.openstreetmap.org/node/4571180589',
    sourceLabel: 'OpenStreetMap name, address, cuisine and coordinate; edited 2023-12-05',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'mapped-place', entrySurveyed: false,
  },
  {
    id: 'food-kolkata-kewpies', city: 'kolkata', kind: 'restaurant', district: 'Kolkata',
    name: "Kewpie's", nameBn: 'কিউপিজ',
    lat: 22.5365892, lng: 88.3509509,
    address: '2 Elgin Lane, Kolkata 700020',
    description: 'A mapped Elgin Lane restaurant whose source tags specify Bengali and Indian food. Current menu, prices and hours remain unverified.',
    descriptionBn: 'এলগিন লেনের মানচিত্রে চিহ্নিত রেস্তোরাঁ; উৎসে বাঙালি ও ভারতীয় খাবারের উল্লেখ আছে। বর্তমান মেনু, দাম ও খোলার সময় যাচাই হয়নি।',
    highlight: 'Suggested food stop', highlightBn: 'খাবারের জন্য প্রস্তাবিত বিরতি',
    visitMinutes: FOOD_BREAK_MINUTES,
    sourceUrl: 'https://www.openstreetmap.org/node/4393259890',
    sourceLabel: 'OpenStreetMap name, address, cuisine and coordinate; checked 2023-10-28 by mapper',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'mapped-place', entrySurveyed: false,
  },
  {
    id: 'food-asansol-66-grand-trunk', city: 'asansol', kind: 'restaurant', district: 'Paschim Bardhaman',
    name: '66 Grand Trunk Restaurant', nameBn: '৬৬ গ্র্যান্ড ট্রাঙ্ক রেস্তোরাঁ',
    lat: 23.6817, lng: 86.988,
    address: 'Hotel Asansol International, 66 G.T. Road (East), Murgasol, Asansol 713303',
    description: 'The operator lists Indian, Chinese and Continental food, with vegetarian and non-vegetarian options. The approximate pin is the separately published hotel location.',
    descriptionBn: 'হোটেলের নিজস্ব পাতায় নিরামিষ ও আমিষ ভারতীয়, চাইনিজ ও কন্টিনেন্টাল খাবারের উল্লেখ আছে। আনুমানিক বিন্দুটি আলাদাভাবে প্রকাশিত হোটেলের অবস্থান।',
    highlight: 'Suggested food stop', highlightBn: 'খাবারের জন্য প্রস্তাবিত বিরতি',
    visitMinutes: FOOD_BREAK_MINUTES,
    sourceUrl: 'https://hotelasansolinternational.com/barandrestaurant/',
    sourceLabel: 'Hotel operator dining/address; Wikivoyage hotel listing coordinate',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'host-venue', entrySurveyed: false,
  },
  {
    id: 'food-asansol-gangar-hotel', city: 'asansol', kind: 'restaurant', district: 'Paschim Bardhaman',
    name: 'Gangar Hotel', nameBn: 'গঙ্গার হোটেল',
    lat: 23.6889, lng: 86.9497,
    address: 'Court Compound, Asansol',
    description: 'The public travel listing identifies this Court Compound eatery and describes Bengali food. Its listing is undated, so operation and menu need reconfirmation.',
    descriptionBn: 'প্রকাশ্য ভ্রমণ তালিকায় কোর্ট কম্পাউন্ডের এই খাবারের স্থান ও বাঙালি খাবারের উল্লেখ আছে। তালিকাটির তারিখ নেই; বর্তমানে চালু থাকা ও মেনু আবার যাচাই করুন।',
    highlight: 'Suggested food stop', highlightBn: 'খাবারের জন্য প্রস্তাবিত বিরতি',
    visitMinutes: FOOD_BREAK_MINUTES,
    sourceUrl: 'https://en.wikivoyage.org/wiki/Asansol#Eat_and_drink',
    sourceLabel: 'Wikivoyage: named food listing, address, cuisine and listing coordinate',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'mapped-place', entrySurveyed: false,
  },
  {
    id: 'food-asansol-garam-masala', city: 'asansol', kind: 'restaurant', district: 'Paschim Bardhaman',
    name: 'Garam Masala Restaurant', nameBn: 'গরম মশলা রেস্তোরাঁ',
    lat: 23.6857872, lng: 86.974351,
    address: 'Asansol, West Bengal; street address not verified',
    description: 'A named restaurant in the public map catalogue. Cuisine, current operation and opening hours have not been verified.',
    descriptionBn: 'প্রকাশ্য মানচিত্রে নামসহ চিহ্নিত রেস্তোরাঁ। খাবারের ধরন, বর্তমানে চালু থাকা ও খোলার সময় যাচাই হয়নি।',
    highlight: 'Suggested food stop', highlightBn: 'খাবারের জন্য প্রস্তাবিত বিরতি',
    visitMinutes: FOOD_BREAK_MINUTES,
    sourceUrl: 'https://www.openstreetmap.org/node/7466818596',
    sourceLabel: 'OpenStreetMap restaurant node; last edited 2021-07-05',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'mapped-place', entrySurveyed: false,
  },
  {
    id: 'food-durgapur-roor', city: 'durgapur', kind: 'restaurant', district: 'Paschim Bardhaman',
    name: 'The Roor, Peerless Hotel', nameBn: 'দ্য রুর, পিয়ারলেস হোটেল',
    lat: 23.540114, lng: 87.2925209,
    address: 'Peerless Hotel, Sahid Khudiram Sarani, City Centre, Durgapur 713216',
    description: 'The hotel operator lists this lobby-level restaurant with Indian, Chinese, Continental and Italian dishes. The pin identifies the mapped host venue.',
    descriptionBn: 'হোটেলের নিজস্ব পাতায় লবির এই রেস্তোরাঁয় ভারতীয়, চাইনিজ, কন্টিনেন্টাল ও ইতালীয় খাবারের উল্লেখ আছে। বিন্দুটি হোটেলের মানচিত্রের অবস্থান।',
    highlight: 'Suggested food stop', highlightBn: 'খাবারের জন্য প্রস্তাবিত বিরতি',
    visitMinutes: FOOD_BREAK_MINUTES,
    sourceUrl: 'https://www.peerlesshotels.com/peerless-hotel-durgapur-dining.php',
    sourceLabel: 'Peerless Hotels dining page; OpenStreetMap host-venue coordinate',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'host-venue', entrySurveyed: false,
  },
  {
    id: 'food-durgapur-qmin', city: 'durgapur', kind: 'restaurant', district: 'Paschim Bardhaman',
    name: 'Qmin Restaurant & Bar, Ginger Durgapur', nameBn: 'কিউমিন রেস্তোরাঁ ও বার, জিঞ্জার দুর্গাপুর',
    lat: 23.4857607, lng: 87.3856893,
    address: 'NH-2, Rajbandh, Durgapur',
    description: 'A mapped restaurant at Ginger Durgapur on the Rajbandh highway corridor. A meal stop is optional; road access and detour time are not verified.',
    descriptionBn: 'রাজবাঁধের সড়কপথে জিঞ্জার দুর্গাপুরের মানচিত্রে চিহ্নিত রেস্তোরাঁ। খাবারের বিরতি ঐচ্ছিক; গাড়ির প্রবেশপথ ও অতিরিক্ত যাত্রাসময় যাচাই হয়নি।',
    highlight: 'Suggested food stop', highlightBn: 'খাবারের জন্য প্রস্তাবিত বিরতি',
    visitMinutes: FOOD_BREAK_MINUTES,
    sourceUrl: 'https://www.openstreetmap.org/node/11977697144',
    sourceLabel: 'OpenStreetMap restaurant name, address and coordinate; edited 2024-06-13',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'mapped-place', entrySurveyed: false,
  },
  {
    id: 'food-durgapur-saffron-grill', city: 'durgapur', kind: 'restaurant', district: 'Paschim Bardhaman',
    name: 'Saffron Grill', nameBn: 'স্যাফরন গ্রিল',
    lat: 23.5696998, lng: 87.33568665,
    address: 'IQ City Road, Durgapur 713206',
    description: 'The public map identifies a restaurant building on IQ City Road. The name does not establish a cuisine; hours and current operation need checking.',
    descriptionBn: 'প্রকাশ্য মানচিত্রে আইকিউ সিটি রোডে রেস্তোরাঁর ভবন চিহ্নিত আছে। নাম থেকে খাবারের ধরন অনুমান করা হয়নি; খোলার সময় ও বর্তমানে চালু থাকা যাচাই করা দরকার।',
    highlight: 'Suggested food stop', highlightBn: 'খাবারের জন্য প্রস্তাবিত বিরতি',
    visitMinutes: FOOD_BREAK_MINUTES,
    sourceUrl: 'https://www.openstreetmap.org/way/778606067',
    sourceLabel: 'OpenStreetMap restaurant building, address and centre; edited 2020-03-05',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'mapped-place', entrySurveyed: false,
  },
]

export const SIGHT_STOPS: RegionalPlace[] = [
  {
    id: 'sight-kolkata-victoria-memorial',
    city: 'kolkata', kind: 'sight', district: 'Kolkata',
    name: 'Victoria Memorial', nameBn: 'ভিক্টোরিয়া মেমোরিয়াল',
    lat: 22.5449, lng: 88.3425,
    address: '1 Queens Way, Maidan, Kolkata 700071',
    description: 'The marble memorial and museum beside the Maidan. The published monument coordinate is not a car entrance; opening, tickets and access need a separate check.',
    descriptionBn: 'ময়দানের পাশে মার্বেলের স্মৃতিসৌধ ও সংগ্রহশালা। প্রকাশিত বিন্দুটি সৌধের, গাড়ির প্রবেশপথের নয়; সময়, টিকিট ও প্রবেশের তথ্য আলাদাভাবে যাচাই করা দরকার।',
    highlight: 'Editor pick: museum and architecture', highlightBn: 'সম্পাদকের পছন্দ: সংগ্রহশালা ও স্থাপত্য',
    visitMinutes: 60,
    sourceUrl: 'https://en.wikipedia.org/wiki/Victoria_Memorial,_Kolkata',
    sourceLabel: 'Wikipedia: Victoria Memorial, Kolkata; published monument coordinate',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'mapped-place', entrySurveyed: false,
  },
  {
    id: 'sight-asansol-kalyaneshwari-temple',
    city: 'asansol', kind: 'sight', district: 'Paschim Bardhaman',
    name: 'Kalyaneshwari Temple', nameBn: 'কল্যাণেশ্বরী মন্দির',
    lat: 23.777222, lng: 86.828333,
    address: 'Kalyaneshwari, Asansol Sadar, West Bengal',
    description: 'A Shakti shrine at Kalyaneshwari in Asansol Sadar subdivision. This is a year-round sight, not a Durga Puja pandal.',
    descriptionBn: 'আসানসোল সদর মহকুমার কল্যাণেশ্বরীর শক্তি মন্দির। এটি সারা বছরের দর্শনীয় স্থান, দুর্গাপুজোর মণ্ডপ নয়।',
    highlight: 'Editor pick: Shakti shrine', highlightBn: 'সম্পাদকের পছন্দ: শক্তি মন্দির',
    visitMinutes: 30,
    sourceUrl: 'https://en.wikipedia.org/wiki/Kalyaneshwari_Temple',
    sourceLabel: 'Wikipedia: Kalyaneshwari Temple, including published coordinate',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'mapped-place', entrySurveyed: false,
  },
  {
    id: 'sight-durgapur-barrage',
    city: 'durgapur', kind: 'sight', district: 'Paschim Bardhaman / Bankura',
    name: 'Durgapur Barrage', nameBn: 'দুর্গাপুর ব্যারেজ',
    lat: 23.4754, lng: 87.3023,
    address: 'Damodar River, Durgapur, West Bengal',
    description: 'The Damodar irrigation barrage associated with Durgapur. The map point identifies the structure, not a stopping place, parking area or approved pedestrian entrance.',
    descriptionBn: 'দুর্গাপুরের দামোদর নদের সেচ ব্যারেজ। মানচিত্রের বিন্দুটি কাঠামোর অবস্থান; গাড়ি থামানো, পার্কিং বা অনুমোদিত হাঁটার প্রবেশপথ নয়।',
    highlight: 'Editor pick: Damodar engineering heritage', highlightBn: 'সম্পাদকের পছন্দ: দামোদরের প্রকৌশল ঐতিহ্য',
    visitMinutes: 30,
    sourceUrl: 'https://en.wikipedia.org/wiki/Durgapur_Barrage',
    sourceLabel: 'Wikipedia: Durgapur Barrage, including published coordinate',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'mapped-place', entrySurveyed: false,
  },
  {
    id: 'sight-durgapur-garh-jungle',
    city: 'durgapur', kind: 'sight', district: 'Paschim Bardhaman',
    name: 'Garh Jungle', nameBn: 'গড় জঙ্গল',
    lat: 23.6061, lng: 87.4296,
    address: 'Kanksa, Durgapur subdivision, West Bengal',
    description: 'A Shakta heritage area listed by the district administration. This is an optional out-of-city sight, not Deul Park, a surveyed entrance or a confirmed car-access point.',
    descriptionBn: 'জেলা প্রশাসনের তালিকাভুক্ত শাক্ত ঐতিহ্যের স্থান। এটি শহরের বাইরের ঐচ্ছিক দর্শনীয় স্থান; দেউল পার্ক, যাচাই করা প্রবেশপথ বা নিশ্চিত গাড়ির গন্তব্য নয়।',
    highlight: 'Editor pick: Shakta cultural tradition', highlightBn: 'সম্পাদকের পছন্দ: শাক্ত সংস্কৃতির ঐতিহ্য',
    visitMinutes: 45,
    sourceUrl: 'https://paschimbardhaman.gov.in/tourist-place/garh-jungle/',
    sourceLabel: 'District tourism identity/history; Wikipedia published area coordinate',
    verifiedOn: '2026-10-17', coordinateAccuracy: 'approximate',
    coordinateRole: 'mapped-place', entrySurveyed: false,
  },
]

export const REGIONAL_PLACES: RegionalPlace[] = [
  ...REGIONAL_PANDALS,
  ...FOOD_STOPS,
  ...SIGHT_STOPS,
]