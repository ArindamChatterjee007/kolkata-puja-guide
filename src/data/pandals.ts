import type { Landmark, Pandal } from '../types'
import { METRO_STATIONS } from './metro'

export { METRO_STATIONS } from './metro'

export const SOURCE_CHECKED_ON = '2026-10-14'

export const CATALOGUE_NOTICE = {
  en: 'Public pages checked on 14 October 2026, not confirmation of 2026 events or opening hours. Pins are approximate, not verified entrances. Visit times are planning allowances, not live queue estimates.',
  bn: '১৪ অক্টোবর ২০২৬-এ প্রকাশ্য ওয়েবপৃষ্ঠা দেখা হয়েছে; এটি ২০২৬-এর পুজো বা খোলার সময়ের নিশ্চয়তা নয়। মানচিত্রের বিন্দু আনুমানিক, যাচাই করা প্রবেশদ্বার নয়। দর্শনের সময় পরিকল্পনার জন্য, সরাসরি ভিড়ের হিসাব নয়।',
}

type CatalogueEntry = Omit<Pandal, 'sourceUrl' | 'sourceLabel' | 'verifiedOn' | 'coordinateAccuracy'>
  & Partial<Pick<Pandal, 'sourceUrl' | 'sourceLabel'>>

const entries: CatalogueEntry[] = [
  {
    id: 'bagbazar', name: 'Bagbazar Sarbojanin', nameBn: 'বাগবাজার সর্বজনীন', zone: 'North',
    lat: 22.60470, lng: 88.36613, address: 'Bagbazar, north Kolkata',
    description: 'A longstanding community puja in the riverside Bagbazar neighbourhood.',
    descriptionBn: 'নদীর কাছের বাগবাজার পাড়ার বহুদিনের সর্বজনীন পুজো।',
    highlight: 'Bagbazar heritage', highlightBn: 'বাগবাজারের ঐতিহ্য',
    popularity: 3, visitMinutes: 35, nearestMetro: 'blue-shyambazar', featured: true,
  },
  {
    id: 'kumartuli-park', name: 'Kumartuli Park', nameBn: 'কুমোরটুলি পার্ক', zone: 'North',
    lat: 22.59903, lng: 88.36149, address: 'Kumartuli, north Kolkata',
    description: 'An established park puja beside the Kumartuli idol-making neighbourhood.',
    descriptionBn: 'কুমোরটুলির প্রতিমাশিল্পীদের পাড়ার কাছে পরিচিত পার্কের পুজো।',
    highlight: 'Kumartuli neighbourhood', highlightBn: 'কুমোরটুলির পাড়া',
    popularity: 3, visitMinutes: 30, nearestMetro: 'blue-sovabazar-sutanuti',
  },
  {
    id: 'sovabazar-rajbari', name: 'Sovabazar Rajbari', nameBn: 'শোভাবাজার রাজবাড়ি', zone: 'North',
    lat: 22.59683, lng: 88.36719, address: 'Shobhabazar, north Kolkata',
    description: 'The historic family puja at Sovabazar Rajbari, distinct from a community pandal.',
    descriptionBn: 'শোভাবাজার রাজবাড়ির ঐতিহাসিক পারিবারিক পুজো; সর্বজনীন মণ্ডপের থেকে আলাদা।',
    highlight: 'Bonedi bari puja', highlightBn: 'বনেদি বাড়ির পুজো',
    popularity: 3, visitMinutes: 30, nearestMetro: 'blue-sovabazar-sutanuti',
  },
  {
    id: 'tala-prattoy', name: 'Tala Prattoy', nameBn: 'টালা প্রত্যয়', zone: 'North',
    lat: 22.60892, lng: 88.38227, address: 'Tala, north Kolkata',
    description: 'A major community puja in the Tala neighbourhood, north of Shyambazar.',
    descriptionBn: 'শ্যামবাজারের উত্তরে টালা পাড়ার অন্যতম বড় সর্বজনীন পুজো।',
    highlight: 'Tala community puja', highlightBn: 'টালার সর্বজনীন পুজো',
    popularity: 3, visitMinutes: 40, featured: true,
  },
  {
    id: 'ahiritola', name: 'Ahiritola Sarbojanin', nameBn: 'আহিরীটোলা সর্বজনীন', zone: 'North',
    lat: 22.59459, lng: 88.35705, address: 'Ahiritola, north Kolkata',
    description: 'A familiar north-Kolkata puja in Ahiritola, towards the river from Shobhabazar.',
    descriptionBn: 'শোভাবাজার থেকে নদীর দিকে আহিরীটোলা পাড়ার পরিচিত পুজো।',
    highlight: 'Ahiritola lanes', highlightBn: 'আহিরীটোলার অলিগলি',
    popularity: 3, visitMinutes: 30, nearestMetro: 'blue-sovabazar-sutanuti',
  },
  {
    id: 'sreebhumi', name: 'Sreebhumi Sporting Club', nameBn: 'শ্রীভূমি স্পোর্টিং ক্লাব', zone: 'North',
    lat: 22.60040, lng: 88.40260, address: 'Sreebhumi, Lake Town',
    description: 'The large Lake Town-side club puja at Sreebhumi, separate from Salt Lake block pujas.',
    descriptionBn: 'লেকটাউনের দিকে শ্রীভূমির বড় ক্লাবের পুজো; সল্টলেকের ব্লক পুজোগুলি থেকে আলাদা।',
    highlight: 'Sreebhumi, Lake Town', highlightBn: 'লেকটাউনের শ্রীভূমি',
    popularity: 3, visitMinutes: 45, featured: true,
  },
  {
    id: 'college-square', name: 'College Square', nameBn: 'কলেজ স্কোয়ার', zone: 'Central',
    lat: 22.57453, lng: 88.36446, address: 'College Square, College Street',
    description: 'The landmark puja around the College Square waterbody in the book-market district.',
    descriptionBn: 'বইপাড়ার কলেজ স্কোয়ারের জলাশয় ঘিরে পরিচিত পুজো।',
    highlight: 'College Street square', highlightBn: 'কলেজ স্ট্রিটের স্কোয়ার',
    popularity: 3, visitMinutes: 40, nearestMetro: 'blue-mahatma-gandhi-road', featured: true,
  },
  {
    id: 'md-ali-park', name: 'Md Ali Park (Muhammad Ali Park)', nameBn: 'মহম্মদ আলি পার্ক', zone: 'Central',
    lat: 22.57724, lng: 88.36074, address: 'Muhammad Ali Park, central Kolkata',
    description: 'A central-Kolkata puja associated with Muhammad Ali Park near College Street.',
    descriptionBn: 'কলেজ স্ট্রিটের কাছে মহম্মদ আলি পার্কের সঙ্গে যুক্ত মধ্য কলকাতার পুজো।',
    highlight: 'Central Kolkata landmark', highlightBn: 'মধ্য কলকাতার পরিচিত পুজো',
    popularity: 3, visitMinutes: 35, nearestMetro: 'blue-mahatma-gandhi-road',
  },
  {
    id: 'santosh-mitra-square', name: 'Santosh Mitra Square', nameBn: 'সন্তোষ মিত্র স্কোয়ার', zone: 'Central',
    lat: 22.56593, lng: 88.36544, address: 'Santosh Mitra Square, central Kolkata',
    description: 'The large square-side community puja west of Sealdah.',
    descriptionBn: 'শিয়ালদহের পশ্চিমে সন্তোষ মিত্র স্কোয়ারের বড় সর্বজনীন পুজো।',
    highlight: 'Sealdah-side square', highlightBn: 'শিয়ালদহের কাছের স্কোয়ার',
    popularity: 3, visitMinutes: 40, nearestMetro: 'green-sealdah', featured: true,
  },
  {
    id: 'chaltabagan', name: 'Chaltabagan Lohapatty', nameBn: 'চালতাবাগান লোহাপট্টি', zone: 'North',
    lat: 22.58518, lng: 88.37208, address: 'Chaltabagan, Maniktala',
    description: 'The established Lohapatty puja in the Chaltabagan-Maniktala neighbourhood.',
    descriptionBn: 'চালতাবাগান-মানিকতলা পাড়ার বহুদিনের লোহাপট্টির পুজো।',
    highlight: 'Chaltabagan neighbourhood', highlightBn: 'চালতাবাগানের পাড়া',
    popularity: 2, visitMinutes: 30, nearestMetro: 'blue-girish-park',
  },
  {
    id: 'ekdalia-evergreen', name: 'Ekdalia Evergreen', nameBn: 'একডালিয়া এভারগ্রিন', zone: 'South',
    lat: 22.52125, lng: 88.36596, address: 'Ekdalia, Gariahat',
    description: 'An established Gariahat-area club puja close to Singhi Park.',
    descriptionBn: 'সিংহী পার্কের কাছে গড়িয়াহাট এলাকার বহুদিনের ক্লাবের পুজো।',
    highlight: 'Ekdalia and Gariahat', highlightBn: 'একডালিয়া ও গড়িয়াহাট',
    popularity: 3, visitMinutes: 35, nearestMetro: 'blue-kalighat', featured: true,
  },
  {
    id: 'singhi-park', name: 'Singhi Park Sarbojanin', nameBn: 'সিংহী পার্ক সর্বজনীন', zone: 'South',
    lat: 22.52122, lng: 88.36301, address: 'Singhi Park, Gariahat',
    description: 'A major Gariahat puja in the Singhi Park neighbourhood, west of Ekdalia.',
    descriptionBn: 'একডালিয়ার পশ্চিমে সিংহী পার্ক পাড়ার বড় পুজো।',
    highlight: 'Gariahat neighbourhood puja', highlightBn: 'গড়িয়াহাট পাড়ার পুজো',
    popularity: 3, visitMinutes: 30, nearestMetro: 'blue-kalighat',
  },
  {
    id: 'deshapriya-park', name: 'Deshapriya Park', nameBn: 'দেশপ্রিয় পার্ক', zone: 'South',
    lat: 22.51840, lng: 88.35352, address: 'Deshapriya Park, south Kolkata',
    description: 'The large park-side puja between Kalighat and the Ballygunge neighbourhoods.',
    descriptionBn: 'কালীঘাট ও বালিগঞ্জের পাড়াগুলির মাঝের বড় পার্কের পুজো।',
    highlight: 'Deshapriya Park setting', highlightBn: 'দেশপ্রিয় পার্কের প্রাঙ্গণ',
    popularity: 3, visitMinutes: 40, nearestMetro: 'blue-kalighat', featured: true,
  },
  {
    id: 'ballygunge-cultural', name: 'Ballygunge Cultural Association', nameBn: 'বালিগঞ্জ কালচারাল অ্যাসোসিয়েশন', zone: 'South',
    lat: 22.51588, lng: 88.35582, address: 'Ballygunge, south Kolkata',
    description: 'A well-known community puja in the compact cluster near Samaj Sebi Sangha.',
    descriptionBn: 'সমাজসেবী সংঘের কাছের পুজোগুচ্ছে পরিচিত সর্বজনীন পুজো।',
    highlight: 'Ballygunge puja cluster', highlightBn: 'বালিগঞ্জের পুজোগুচ্ছ',
    popularity: 3, visitMinutes: 30, nearestMetro: 'blue-kalighat',
  },
  {
    id: 'samaj-sebi', name: 'Samaj Sebi Sangha', nameBn: 'সমাজসেবী সংঘ', zone: 'South',
    lat: 22.51474, lng: 88.35600, address: 'Lake View Road, south Kolkata',
    description: 'The Lake View Road community puja beside the Ballygunge Cultural cluster.',
    descriptionBn: 'বালিগঞ্জ কালচারালের পুজোগুচ্ছের পাশে লেক ভিউ রোডের সর্বজনীন পুজো।',
    highlight: 'Lake View Road', highlightBn: 'লেক ভিউ রোড',
    popularity: 3, visitMinutes: 30, nearestMetro: 'blue-kalighat',
    sourceUrl: 'https://www.pujomap.com/p/samaj-sebi-sangha',
    sourceLabel: 'Pujo Map listing; approximate published coordinate, not a verified entrance',
  },
  {
    id: 'tridhara', name: 'Tridhara Sammilani', nameBn: 'ত্রিধারা সম্মিলনী', zone: 'South',
    lat: 22.51958, lng: 88.35535, address: 'Tridhara, near Deshapriya Park',
    description: 'A prominent neighbourhood puja just east of Deshapriya Park.',
    descriptionBn: 'দেশপ্রিয় পার্কের ঠিক পূর্বদিকে পাড়ার অন্যতম পরিচিত পুজো।',
    highlight: 'Deshapriya Park neighbourhood', highlightBn: 'দেশপ্রিয় পার্কের পাড়া',
    popularity: 3, visitMinutes: 35, nearestMetro: 'blue-kalighat',
  },
  {
    id: 'hindustan-park', name: 'Hindustan Park (Hindusthan Park)', nameBn: 'হিন্দুস্থান পার্ক', zone: 'South',
    lat: 22.51787, lng: 88.36209, address: 'Hindustan Park, Gariahat',
    description: 'The Hindustan Park neighbourhood puja south of Gariahat; not Hindusthan Club.',
    descriptionBn: 'গড়িয়াহাটের দক্ষিণে হিন্দুস্থান পার্ক পাড়ার পুজো; হিন্দুস্থান ক্লাব নয়।',
    highlight: 'Hindustan Park lanes', highlightBn: 'হিন্দুস্থান পার্কের অলিগলি',
    popularity: 2, visitMinutes: 30, nearestMetro: 'blue-kalighat',
  },
  {
    id: '66-pally', name: '66 Pally', nameBn: '৬৬ পল্লী', zone: 'South',
    lat: 22.51824, lng: 88.34286, address: '66 Pally, Kalighat',
    description: 'A longstanding Kalighat puja close to Badamtala Ashar Sangha.',
    descriptionBn: 'বাদামতলা আষাঢ় সংঘের কাছে কালীঘাটের বহুদিনের পুজো।',
    highlight: 'Kalighat puja cluster', highlightBn: 'কালীঘাটের পুজোগুচ্ছ',
    popularity: 2, visitMinutes: 25, nearestMetro: 'blue-kalighat',
  },
  {
    id: 'badamtala-ashar-sangha', name: 'Badamtala Ashar Sangha', nameBn: 'বাদামতলা আষাঢ় সংঘ', zone: 'South',
    lat: 22.51793, lng: 88.34416, address: 'Badamtala, Kalighat',
    description: 'The established Badamtala neighbourhood puja near Kalighat Metro.',
    descriptionBn: 'কালীঘাট মেট্রোর কাছে বাদামতলা পাড়ার পরিচিত পুজো।',
    highlight: 'Badamtala neighbourhood', highlightBn: 'বাদামতলার পাড়া',
    popularity: 3, visitMinutes: 30, nearestMetro: 'blue-kalighat',
  },
  {
    id: 'mudiali', name: 'Mudiali Club', nameBn: 'মুদিয়ালি ক্লাব', zone: 'South',
    lat: 22.51007, lng: 88.34663, address: 'Mudiali, near Rabindra Sarobar',
    description: 'The Mudiali club puja in the neighbourhood north of Rabindra Sarobar Metro.',
    descriptionBn: 'রবীন্দ্র সরোবর মেট্রোর উত্তরের পাড়ায় মুদিয়ালি ক্লাবের পুজো।',
    highlight: 'Mudiali neighbourhood', highlightBn: 'মুদিয়ালির পাড়া',
    popularity: 3, visitMinutes: 30, nearestMetro: 'blue-rabindra-sarobar',
  },
  {
    id: 'shib-mandir', name: 'Shib Mandir Sarbojanin', nameBn: 'শিবমন্দির সর্বজনীন', zone: 'South',
    lat: 22.51106, lng: 88.35002, address: 'Shib Mandir, near Mudiali',
    description: 'The well-known Shib Mandir puja east of Mudiali, near the lake neighbourhood.',
    descriptionBn: 'মুদিয়ালির পূর্বে লেকের পাড়ার কাছে পরিচিত শিবমন্দিরের পুজো।',
    highlight: 'Mudiali and lake neighbourhood', highlightBn: 'মুদিয়ালি ও লেকের পাড়া',
    popularity: 2, visitMinutes: 30, nearestMetro: 'blue-rabindra-sarobar',
  },
  {
    id: 'suruchi-sangha', name: 'Suruchi Sangha', nameBn: 'সুরুচি সংঘ', zone: 'South',
    lat: 22.50910, lng: 88.33418, address: 'New Alipore, south Kolkata',
    description: 'A major club puja in New Alipore, southwest of the Kalighat cluster.',
    descriptionBn: 'কালীঘাটের পুজোগুচ্ছের দক্ষিণ-পশ্চিমে নিউ আলিপুরের বড় ক্লাবের পুজো।',
    highlight: 'New Alipore community puja', highlightBn: 'নিউ আলিপুরের সর্বজনীন পুজো',
    popularity: 3, visitMinutes: 40, featured: true,
  },
  {
    id: 'chetla-agrani', name: 'Chetla Agrani', nameBn: 'চেতলা অগ্রণী', zone: 'South',
    lat: 22.51643, lng: 88.33719, address: 'Chetla, south Kolkata',
    description: 'The prominent Chetla club puja west of the Kalighat neighbourhood.',
    descriptionBn: 'কালীঘাট পাড়ার পশ্চিমে চেতলার পরিচিত ক্লাবের পুজো।',
    highlight: 'Chetla neighbourhood', highlightBn: 'চেতলার পাড়া',
    popularity: 3, visitMinutes: 35, nearestMetro: 'blue-kalighat', featured: true,
  },
  {
    id: 'naktala-udayan', name: 'Naktala Udayan Sangha', nameBn: 'নাকতলা উদয়ন সংঘ', zone: 'South',
    lat: 22.47435, lng: 88.36653, address: 'Naktala, south Kolkata',
    description: 'A major Naktala puja, farther south than the compact Kalighat and Gariahat clusters.',
    descriptionBn: 'কালীঘাট ও গড়িয়াহাটের কাছাকাছি পুজোগুচ্ছ থেকে আরও দক্ষিণে নাকতলার বড় পুজো।',
    highlight: 'Naktala neighbourhood', highlightBn: 'নাকতলার পাড়া',
    popularity: 3, visitMinutes: 35,
  },
  {
    id: 'bosepukur-sitala-mandir', name: 'Bosepukur Sitala Mandir', nameBn: 'বোসপুকুর শীতলা মন্দির', zone: 'South',
    lat: 22.51917, lng: 88.38475, address: 'Bosepukur, Kasba',
    description: 'The established Sitala Mandir puja in Bosepukur, on the Kasba side of the city.',
    descriptionBn: 'শহরের কসবার দিকে বোসপুকুরের বহুদিনের শীতলা মন্দিরের পুজো।',
    highlight: 'Bosepukur, Kasba', highlightBn: 'কসবার বোসপুকুর',
    popularity: 3, visitMinutes: 35,
  },
  {
    id: 'barisha-club', name: 'Barisha Club', nameBn: 'বড়িশা ক্লাব', zone: 'Behala',
    lat: 22.48071, lng: 88.31295, address: 'Barisha, Behala',
    description: 'A major Barisha club puja south of central Behala.',
    descriptionBn: 'বেহালার মূল এলাকার দক্ষিণে বড়িশার বড় ক্লাবের পুজো।',
    highlight: 'Barisha neighbourhood', highlightBn: 'বড়িশার পাড়া',
    popularity: 3, visitMinutes: 35, featured: true,
  },
  {
    id: 'behala-notun-dal', name: 'Behala Notun Dal (Nutan Dal)', nameBn: 'বেহালা নূতন দল', zone: 'Behala',
    lat: 22.49629, lng: 88.31765, address: 'Behala, southwest Kolkata',
    description: 'The established Notun Dal community puja in Behala.',
    descriptionBn: 'বেহালার বহুদিনের নূতন দলের সর্বজনীন পুজো।',
    highlight: 'Behala community puja', highlightBn: 'বেহালার সর্বজনীন পুজো',
    popularity: 3, visitMinutes: 30,
  },
  {
    id: 'behala-friends', name: 'Behala Friends', nameBn: 'বেহালা ফ্রেন্ডস', zone: 'Behala',
    lat: 22.50135, lng: 88.32021, address: 'Behala tram depot neighbourhood',
    description: 'A well-known Behala puja associated with the tram-depot neighbourhood.',
    descriptionBn: 'ট্রাম ডিপোর পাড়ার সঙ্গে যুক্ত বেহালার পরিচিত পুজো।',
    highlight: 'Behala tram depot neighbourhood', highlightBn: 'বেহালা ট্রাম ডিপোর পাড়া',
    popularity: 2, visitMinutes: 30,
  },
  {
    id: 'sb-park', name: 'SB Park Sarbojanin (Thakurpukur)', nameBn: 'এস বি পার্ক সর্বজনীন, ঠাকুরপুকুর', zone: 'Behala',
    lat: 22.46776, lng: 88.30901, address: 'State Bank Park, Thakurpukur',
    description: 'The State Bank Park community puja in Thakurpukur, south of Barisha.',
    descriptionBn: 'বড়িশার দক্ষিণে ঠাকুরপুকুরের স্টেট ব্যাঙ্ক পার্কের সর্বজনীন পুজো।',
    highlight: 'Thakurpukur community puja', highlightBn: 'ঠাকুরপুকুরের সর্বজনীন পুজো',
    popularity: 3, visitMinutes: 35,
    sourceUrl: 'https://www.pujomap.com/p/thakurpukur-sb-park-sarbojanin',
    sourceLabel: 'Pujo Map listing; approximate published coordinate, not a verified entrance',
  },
  {
    id: 'salt-lake-fd-block', name: 'Salt Lake FD Block', nameBn: 'সল্টলেক এফ ডি ব্লক', zone: 'Salt Lake',
    lat: 22.58393, lng: 88.41208, address: 'FD Block, Sector III, Salt Lake',
    description: 'The established FD Block puja in Salt Lake Sector III.',
    descriptionBn: 'সল্টলেকের সেক্টর তিনে এফ ডি ব্লকের বহুদিনের পুজো।',
    highlight: 'FD Block community puja', highlightBn: 'এফ ডি ব্লকের সর্বজনীন পুজো',
    popularity: 3, visitMinutes: 35, nearestMetro: 'green-central-park', featured: true,
  },
  {
    id: 'salt-lake-ak-block', name: 'Salt Lake AK Block', nameBn: 'সল্টলেক এ কে ব্লক', zone: 'Salt Lake',
    lat: 22.588639, lng: 88.431252, address: 'AK Block, Sector II, Salt Lake; pin is the sector centre',
    description: 'The AK Block community puja; the published map reference is the Sector II locality centre.',
    descriptionBn: 'এ কে ব্লকের সর্বজনীন পুজো; প্রকাশিত মানচিত্রের বিন্দুটি সেক্টর দুইয়ের এলাকার কেন্দ্র।',
    highlight: 'Sector II locality reference', highlightBn: 'সেক্টর দুইয়ের এলাকার নির্দেশক',
    popularity: 2, visitMinutes: 25,
    sourceUrl: 'https://pujorshohor.in/pandals/salt-lake-ak-block-sarbojanin',
    sourceLabel: 'Pujor Shohor; approximate Sector II centre explicitly used by source, not the pandal gate',
  },
  {
    id: 'salt-lake-bj-block', name: 'Salt Lake BJ Block', nameBn: 'সল্টলেক বি জে ব্লক', zone: 'Salt Lake',
    lat: 22.59066, lng: 88.42660, address: 'BJ Block, Sector II, Salt Lake',
    description: 'The BJ Block neighbourhood puja in Salt Lake Sector II.',
    descriptionBn: 'সল্টলেকের সেক্টর দুইয়ে বি জে ব্লকের পাড়ার পুজো।',
    highlight: 'BJ Block community puja', highlightBn: 'বি জে ব্লকের সর্বজনীন পুজো',
    popularity: 2, visitMinutes: 30, nearestMetro: 'green-karunamoyee',
  },
  {
    id: 'new-town-sarbojanin', name: 'New Town Sarbojanin', nameBn: 'নিউ টাউন সর্বজনীন', zone: 'New Town',
    lat: 22.58227, lng: 88.45885, address: 'New Town; published locality/pandal map reference',
    description: 'The listed New Town community puja, east of Salt Lake Sector V.',
    descriptionBn: 'সল্টলেক সেক্টর পাঁচের পূর্বদিকে তালিকাভুক্ত নিউ টাউনের সর্বজনীন পুজো।',
    highlight: 'New Town community puja', highlightBn: 'নিউ টাউনের সর্বজনীন পুজো',
    popularity: 3, visitMinutes: 35, featured: true,
  },
]

export const PANDALS: Pandal[] = entries.map((entry) => ({
  sourceUrl: 'https://kolkatakhoj.com/pandals/',
  sourceLabel: 'KolkataKhoj directory; approximate listing map pin, not a verified entrance',
  verifiedOn: SOURCE_CHECKED_ON,
  coordinateAccuracy: 'approximate',
  ...entry,
}))

const manualStationStarts = new Set([
  'blue-esplanade', 'blue-shyambazar', 'blue-kalighat', 'blue-girish-park',
  'blue-rabindra-sarobar', 'green-sector-v', 'green-karunamoyee',
])

export const START_POINTS: Landmark[] = [
  ...METRO_STATIONS.filter((station) => manualStationStarts.has(station.id)).map((station) => ({
    id: `start-${station.id}`, name: `${station.name} Metro area`,
    nameBn: `${station.nameBn} মেট্রো এলাকা`, lat: station.lat, lng: station.lng,
  })),
  {
    id: 'start-new-town', name: 'New Town Sarbojanin locality', nameBn: 'নিউ টাউন সর্বজনীনের এলাকা',
    lat: 22.58227, lng: 88.45885,
  },
]

export interface CuratedRoute {
  id: string
  name: string
  nameBn: string
  description: string
  descriptionBn: string
  stopIds: string[]
  startId: string
}

export const CURATED_ROUTES: CuratedRoute[] = [
  {
    id: 'north-riverside', name: 'Bagbazar to Ahiritola', nameBn: 'বাগবাজার থেকে আহিরীটোলা',
    description: 'From Shyambazar through Bagbazar, Kumartuli and the old Shobhabazar neighbourhood.',
    descriptionBn: 'শ্যামবাজার থেকে বাগবাজার, কুমোরটুলি ও পুরনো শোভাবাজারের পাড়া ধরে।',
    startId: 'start-blue-shyambazar',
    stopIds: ['bagbazar', 'kumartuli-park', 'sovabazar-rajbari', 'ahiritola'],
  },
  {
    id: 'central-squares', name: 'Central Kolkata squares', nameBn: 'মধ্য কলকাতার স্কোয়ারগুলি',
    description: 'From Esplanade through Santosh Mitra Square, College Square and Muhammad Ali Park.',
    descriptionBn: 'এসপ্ল্যানেড থেকে সন্তোষ মিত্র স্কোয়ার, কলেজ স্কোয়ার ও মহম্মদ আলি পার্ক।',
    startId: 'start-blue-esplanade',
    stopIds: ['santosh-mitra-square', 'college-square', 'md-ali-park'],
  },
  {
    id: 'deshapriya-ballygunge', name: 'Deshapriya and Ballygunge', nameBn: 'দেশপ্রিয় ও বালিগঞ্জ',
    description: 'From Kalighat to the nearby Deshapriya Park, Tridhara and Ballygunge puja cluster.',
    descriptionBn: 'কালীঘাট থেকে কাছের দেশপ্রিয় পার্ক, ত্রিধারা ও বালিগঞ্জের পুজোগুচ্ছ।',
    startId: 'start-blue-kalighat',
    stopIds: ['deshapriya-park', 'tridhara', 'ballygunge-cultural', 'samaj-sebi'],
  },
  {
    id: 'kalighat-chetla', name: 'Kalighat and Chetla', nameBn: 'কালীঘাট ও চেতলা',
    description: 'From Kalighat through Badamtala and 66 Pally to Chetla Agrani.',
    descriptionBn: 'কালীঘাট থেকে বাদামতলা ও ৬৬ পল্লী হয়ে চেতলা অগ্রণী।',
    startId: 'start-blue-kalighat',
    stopIds: ['badamtala-ashar-sangha', '66-pally', 'chetla-agrani'],
  },
]