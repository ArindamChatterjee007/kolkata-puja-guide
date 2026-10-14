import type { MetroStation } from '../types'

export const METRO_NETWORK_URL = 'https://mtp.indianrailways.gov.in/view_section.jsp?lang=0&id=0,1,285'
export const METRO_NOTICES_URL = 'https://mtp.indianrailways.gov.in/index.jsp?lang=0'

export const METRO_NOTICE = {
  en: 'Static Blue and Green network subset, not live service. Check Metro Railway notices for operating sections, closures and last trains. Station pins represent approximate station areas, not gates or accessible entrances.',
  bn: 'নীল ও সবুজ লাইনের স্থির মানচিত্রের অংশ, সরাসরি পরিষেবার খবর নয়। চালু অংশ, বন্ধ থাকা পরিষেবা ও শেষ ট্রেনের জন্য মেট্রো রেলের বিজ্ঞপ্তি দেখুন। বিন্দুগুলি স্টেশনের আনুমানিক এলাকা, প্রবেশদ্বার বা বাধামুক্ত প্রবেশপথ নয়।',
}

export const METRO_STATIONS: MetroStation[] = [
  { id: 'blue-shyambazar', name: 'Shyambazar', nameBn: 'শ্যামবাজার', line: 'blue', order: 1, lat: 22.601313, lng: 88.372586 },
  { id: 'blue-sovabazar-sutanuti', name: 'Sovabazar Sutanuti', nameBn: 'শোভাবাজার সুতানুটি', line: 'blue', order: 2, lat: 22.59602, lng: 88.36528 },
  { id: 'blue-girish-park', name: 'Girish Park', nameBn: 'গিরিশ পার্ক', line: 'blue', order: 3, lat: 22.58714, lng: 88.36308 },
  { id: 'blue-mahatma-gandhi-road', name: 'Mahatma Gandhi Road', nameBn: 'মহাত্মা গান্ধী রোড', line: 'blue', order: 4, lat: 22.58085, lng: 88.36140 },
  { id: 'blue-central', name: 'Central', nameBn: 'সেন্ট্রাল', line: 'blue', order: 5, lat: 22.572470, lng: 88.358788 },
  { id: 'blue-chandni-chowk', name: 'Chandni Chowk', nameBn: 'চাঁদনি চক', line: 'blue', order: 6, lat: 22.56702, lng: 88.35415 },
  { id: 'blue-esplanade', name: 'Esplanade', nameBn: 'এসপ্ল্যানেড', line: 'blue', order: 7, lat: 22.56361, lng: 88.35120 },
  { id: 'blue-park-street', name: 'Park Street', nameBn: 'পার্ক স্ট্রিট', line: 'blue', order: 8, lat: 22.55445, lng: 88.34985 },
  { id: 'blue-maidan', name: 'Maidan', nameBn: 'ময়দান', line: 'blue', order: 9, lat: 22.54936, lng: 88.34906 },
  { id: 'blue-rabindra-sadan', name: 'Rabindra Sadan', nameBn: 'রবীন্দ্র সদন', line: 'blue', order: 10, lat: 22.54122, lng: 88.34727 },
  { id: 'blue-netaji-bhavan', name: 'Netaji Bhavan', nameBn: 'নেতাজি ভবন', line: 'blue', order: 11, lat: 22.53297, lng: 88.34571 },
  { id: 'blue-jatin-das-park', name: 'Jatin Das Park', nameBn: 'যতীন দাস পার্ক', line: 'blue', order: 12, lat: 22.52426, lng: 88.34648 },
  { id: 'blue-kalighat', name: 'Kalighat', nameBn: 'কালীঘাট', line: 'blue', order: 13, lat: 22.516652, lng: 88.346003 },
  { id: 'blue-rabindra-sarobar', name: 'Rabindra Sarobar', nameBn: 'রবীন্দ্র সরোবর', line: 'blue', order: 14, lat: 22.50570, lng: 88.34521 },
  { id: 'blue-mahanayak-uttam-kumar', name: 'Mahanayak Uttam Kumar', nameBn: 'মহানায়ক উত্তম কুমার', line: 'blue', order: 15, lat: 22.49445, lng: 88.34515 },
  { id: 'green-sector-v', name: 'Salt Lake Sector V', nameBn: 'সল্টলেক সেক্টর পাঁচ', line: 'green', order: 1, lat: 22.58131, lng: 88.42982 },
  { id: 'green-karunamoyee', name: 'Karunamoyee', nameBn: 'করুণাময়ী', line: 'green', order: 2, lat: 22.58638, lng: 88.42153 },
  { id: 'green-central-park', name: 'Central Park', nameBn: 'সেন্ট্রাল পার্ক', line: 'green', order: 3, lat: 22.59035, lng: 88.41559 },
  { id: 'green-city-centre', name: 'City Centre', nameBn: 'সিটি সেন্টার', line: 'green', order: 4, lat: 22.58706, lng: 88.40782 },
  { id: 'green-bengal-chemical', name: 'Bengal Chemical', nameBn: 'বেঙ্গল কেমিক্যাল', line: 'green', order: 5, lat: 22.58006, lng: 88.40129 },
  { id: 'green-salt-lake-stadium', name: 'Salt Lake Stadium', nameBn: 'সল্টলেক স্টেডিয়াম', line: 'green', order: 6, lat: 22.57311, lng: 88.40308 },
  { id: 'green-phoolbagan', name: 'Phoolbagan', nameBn: 'ফুলবাগান', line: 'green', order: 7, lat: 22.57212, lng: 88.39024 },
  { id: 'green-sealdah', name: 'Sealdah', nameBn: 'শিয়ালদহ', line: 'green', order: 8, lat: 22.56641, lng: 88.37002 },
  { id: 'green-esplanade', name: 'Esplanade', nameBn: 'এসপ্ল্যানেড', line: 'green', order: 9, lat: 22.56361, lng: 88.35120 },
]