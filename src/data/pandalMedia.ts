import { PANDALS } from './pandals'

export interface PandalPreview {
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

export const AREA_MAP_CREDIT = {
  author: 'OpenStreetMap contributors; PujaPath rendering',
  sourceUrl: 'https://www.openstreetmap.org/copyright',
  license: 'ODbL-1.0 (map data)',
  licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
} as const

type PhotoPreview = Pick<PandalPreview,
  'image' | 'width' | 'height' | 'alt' | 'altBn' | 'year' | 'author' | 'sourceUrl' | 'license' | 'licenseUrl'>
  & { detail?: boolean }

const PANDAL_PHOTOS: Partial<Record<string, PhotoPreview>> = {
  bagbazar: {
    image: 'images/pandals/bagbazar-2025.webp', width: 720, height: 540, year: 2025,
    alt: 'Durga and accompanying idols beneath a white ornamental backdrop at Bagbazar Sarbojanin, 2025',
    altBn: 'সাদা অলংকৃত পটের সামনে বাগবাজার সর্বজনীনের দুর্গা ও সঙ্গী প্রতিমাগুলি, ২০২৫',
    author: 'Tarunsamanta',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bagbazar_Srbojanin_Durga_Puja_2025_03.jpg',
    license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  'kumartuli-park': {
    image: 'images/pandals/kumartuli-park-2023.webp', width: 720, height: 540, year: 2023,
    alt: 'Crowned Durga idol framed by a red arch at Kumartuli Park, 2023',
    altBn: 'কুমোরটুলি পার্কে লাল খিলানের মধ্যে মুকুট পরা দুর্গাপ্রতিমা, ২০২৩',
    author: 'শরদিন্দু ভট্টাচার্য্য',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:%E0%A7%A8%E0%A7%A6%E0%A7%A8%E0%A7%A9_%E0%A6%95%E0%A7%81%E0%A6%AE%E0%A6%BE%E0%A6%B0%E0%A6%9F%E0%A7%81%E0%A6%B2%E0%A6%BF_%E0%A6%AA%E0%A6%BE%E0%A6%B0%E0%A7%8D%E0%A6%95_%E0%A7%A7%E0%A7%A8.jpg',
    license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  sreebhumi: {
    image: 'images/pandals/sreebhumi-2022.webp', width: 720, height: 828, year: 2022,
    alt: 'Illuminated Vatican-inspired pandal facade at Sreebhumi Sporting Club, 2022',
    altBn: 'শ্রীভূমি স্পোর্টিং ক্লাবের ভ্যাটিকান-অনুপ্রাণিত আলোকিত মণ্ডপের সামনের অংশ, ২০২২',
    author: 'Soumava2002',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Sreebhumi_Durga_Puja_Pandal_(Vatican_City)_2022.jpg',
    license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  'college-square': {
    image: 'images/pandals/college-square-2009.webp', width: 720, height: 960, year: 2009,
    alt: 'Durga idol with ornate silver-coloured decorations at College Square, 2009',
    altBn: 'কলেজ স্কোয়ারে রুপালি রঙের অলংকরণে দুর্গাপ্রতিমা, ২০০৯',
    author: 'Dswaroop100',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Devi_Durga.jpg',
    license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  },
  'ekdalia-evergreen': {
    image: 'images/pandals/ekdalia-evergreen-2017.webp', width: 720, height: 479, year: 2017,
    alt: 'Durga and accompanying idols against a golden-coloured backdrop at Ekdalia Evergreen, 2017',
    altBn: 'একডালিয়া এভারগ্রিনে সোনালি রঙের পটের সামনে দুর্গা ও সঙ্গী প্রতিমাগুলি, ২০১৭',
    author: 'Biswarup Ganguly',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Durga_With_Her_Family_-_Ekdalia_Evergreen_-_Ekdalia_Road_-_Kolkata_2017-09-27_4114.JPG',
    license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  },
  'suruchi-sangha': {
    image: 'images/pandals/suruchi-sangha-2025.webp', width: 720, height: 1281, year: 2025,
    alt: 'A red-and-white decorated section of the Suruchi Sangha pandal, 2025',
    altBn: 'সুরুচি সংঘের মণ্ডপের লাল-সাদা সাজানো অংশ, ২০২৫',
    author: 'Goutam1962',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Suruchi_Sangha%27s_Durga_Puja_2025_07.jpg',
    license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  ahiritola: {
    image: 'images/pandals/ahiritola-2023.webp', width: 720, height: 540, year: 2023,
    alt: 'Illuminated exterior of the Ahiritola Sarbojanin pandal, 2023',
    altBn: 'আহিরীটোলা সর্বজনীনের মণ্ডপের আলোকিত বাইরের অংশ, ২০২৩',
    author: 'Tarunsamanta',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ahiritola_Sarbojanin_Durgotsab_2023_05.jpg',
    license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  'chetla-agrani': {
    image: 'images/pandals/chetla-agrani-2015.webp', width: 720, height: 479, year: 2015, detail: true,
    alt: 'Hanging illuminated decorations inside Chetla Agrani in 2015; a detail, not the full pandal',
    altBn: 'চেতলা অগ্রণীর ২০১৫ সালের মণ্ডপে আলোকিত ঝুলন্ত সাজের অংশ; পুরো মণ্ডপ নয়',
    author: 'Biswarup Ganguly',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Durga_Puja_Pandal_Detail_-_Chetla_Agrani_Club_-_Kolkata_2015-10-21_6463.JPG',
    license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
  },
}

export const PANDAL_MEDIA: Record<string, PandalPreview> = Object.fromEntries(
  PANDALS.map((pandal) => {
    const areaImage = `images/pandals/${pandal.id}-area.webp`
    const photo = PANDAL_PHOTOS[pandal.id]
    const photoYear = photo?.year === null ? 'year unknown' : String(photo?.year)
    const photoYearBn = photo?.year === null ? 'সাল অজানা' : photo?.year?.toLocaleString('bn-IN', { useGrouping: false })
    return [pandal.id, {
      id: pandal.id,
      image: photo?.image ?? areaImage,
      fallbackImage: areaImage,
      kind: photo ? 'photo' : 'area',
      width: photo?.width ?? 720,
      height: photo?.height ?? 480,
      alt: photo?.alt ?? `Street-map overview around the approximate ${pandal.name} pin`,
      altBn: photo?.altBn ?? `${pandal.nameBn}-এর আনুমানিক বিন্দুর আশপাশের রাস্তার মানচিত্র`,
      caption: photo
        ? `Historical ${photo.detail ? 'pandal detail' : 'photo'}, ${photoYear}; not the 2026 appearance`
        : 'Area overview, not pandal appearance',
      captionBn: photo
        ? `ঐতিহাসিক ${photo.detail ? 'মণ্ডপের সাজের অংশ' : 'ছবি'}, ${photoYearBn}; ২০২৬ সালের রূপ নয়`
        : 'এলাকার মানচিত্র, মণ্ডপের ছবি নয়',
      year: photo?.year ?? null,
      author: photo?.author ?? AREA_MAP_CREDIT.author,
      sourceUrl: photo?.sourceUrl ?? AREA_MAP_CREDIT.sourceUrl,
      license: photo?.license ?? AREA_MAP_CREDIT.license,
      licenseUrl: photo?.licenseUrl ?? AREA_MAP_CREDIT.licenseUrl,
      areaImage,
      areaWidth: 720,
      areaHeight: 480,
      approximateAreaLabel: `${pandal.name}: approximate area, not a verified entrance`,
      approximateAreaLabelBn: `${pandal.nameBn}: আনুমানিক এলাকা, যাচাই করা প্রবেশদ্বার নয়`,
    } satisfies PandalPreview]
  }),
)

export const FESTIVAL_PORTRAIT = {
  id: 'festival-portrait',
  kind: 'photo',
  image: 'images/intro-durga-face-2015.webp',
  width: 960,
  height: 1444,
  alt: 'Close-up of a Durga idol face draped in red-bordered cloth during Kolkata immersion ceremonies, 2015',
  altBn: 'কলকাতার বিসর্জন অনুষ্ঠানে লাল পাড়ের কাপড়ে ঢাকা দুর্গাপ্রতিমার মুখের ছবি, ২০১৫',
  caption: 'Durga idol, Kolkata immersion ceremony, 2015; pandal not identified',
  captionBn: 'কলকাতার বিসর্জন অনুষ্ঠানে দুর্গাপ্রতিমা, ২০১৫; মণ্ডপের পরিচয় জানা নেই',
  year: 2015,
  author: 'Biswarup Ganguly',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Durga_Face_-_Kolkata_2015-10-22_6595.JPG',
  license: 'CC BY 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
} satisfies Pick<PandalPreview,
  'id' | 'kind' | 'image' | 'width' | 'height' | 'alt' | 'altBn' | 'caption' | 'captionBn'
  | 'year' | 'author' | 'sourceUrl' | 'license' | 'licenseUrl'>