import type { CrowdLevel, Language, MinuteRange, Pace, TravelPreference, Zone } from './types'
import type { TravelMode } from './domain/travel'

const strings = {
  appName: ['Puja Path', 'পুজোর পথে'],
  appNameOther: ['পুজোর পথে', 'Puja Path'],
  city: ['Kolkata 2026', 'কলকাতা ২০২৬'],
  skipToPlanner: ['Skip to planner', 'পরিকল্পনায় যান'],
  skipToMap: ['Skip to map', 'মানচিত্রে যান'],
  language: ['Language', 'ভাষা'],
  online: ['Online', 'অনলাইন'],
  offline: ['Offline', 'অফলাইন'],
  offlineHint: ['Offline: your route is kept on this device. Street tiles pause until you reconnect.', 'অফলাইন: আপনার পথ এই ডিভাইসে রাখা আছে। সংযোগ ফিরলে রাস্তার মানচিত্র আবার আসবে।'],
  share: ['Share route', 'পথ শেয়ার করুন'],
  about: ['About & privacy', 'তথ্য ও গোপনীয়তা'],
  tabExplore: ['Explore', 'ঘুরে দেখুন'],
  tabRoute: ['Your route', 'আপনার পথ'],
  viewMap: ['Map', 'মানচিত্র'],
  viewList: ['List', 'তালিকা'],
  collapsePanel: ['Collapse panel, show more map', 'প্যানেল গুটিয়ে মানচিত্র বড় করুন'],
  expandPanel: ['Expand panel', 'প্যানেল বড় করুন'],
  splitPanel: ['Show map and panel together', 'মানচিত্র ও প্যানেল একসঙ্গে দেখান'],
  searchLabel: ['Search pandals', 'পুজো খুঁজুন'],
  searchPlaceholder: ['Search pandals…', 'পুজো খুঁজুন…'],
  clearSearch: ['Clear search', 'খোঁজ মুছুন'],
  zoneFilter: ['Zone', 'এলাকা'],
  allZones: ['All', 'সব'],
  sortLabel: ['Sort by', 'সাজান'],
  sortZone: ['Zone', 'এলাকা'],
  sortName: ['Name', 'নাম'],
  sortNearest: ['Nearest', 'শুরুর কাছে'],
  sortPopular: ['Popular', 'জনপ্রিয়তা'],
  resultCount: ['{n} pandals', '{n}টি পুজো'],
  noResults: ['No pandals match your search.', 'আপনার খোঁজের সঙ্গে মেলে এমন পুজো নেই।'],
  suggestedRoutes: ['Suggested routes', 'প্রস্তাবিত পথ'],
  stopsCount: ['{n} stops', '{n}টি স্টপ'],
  useRoute: ['Use this route', 'এই পথ নিন'],
  routeInUse: ['In use', 'চালু আছে'],
  replaceTitle: ['Replace your route?', 'আপনার পথ বদলাবেন?'],
  replaceBody: ['Your current {n} stops will be replaced by "{name}". Visits and crowd reports are kept.', 'আপনার বর্তমান {n}টি স্টপের বদলে "{name}" নেওয়া হবে। দর্শন ও ভিড়ের রিপোর্ট থাকবে।'],
  replace: ['Replace', 'বদলান'],
  cancel: ['Cancel', 'বাতিল'],
  photoCaption: ['Durga Puja in Kolkata, photographed in 2024; pandal not identified.', 'কলকাতার দুর্গাপুজো, ২০২৪-এ তোলা ছবি; কোন পুজো তা চিহ্নিত নয়।'],
  photoCredit: ['Photo: HridoyKundu via Wikimedia Commons, CC BY-SA 4.0; resized and converted to WebP.', 'ছবি: HridoyKundu, উইকিমিডিয়া কমন্স, CC BY-SA 4.0; আকার বদলে WebP করা হয়েছে।'],
  add: ['Add', 'যোগ করুন'],
  added: ['Added', 'যোগ হয়েছে'],
  remove: ['Remove', 'বাদ দিন'],
  addToRoute: ['Add {name} to route', '{name} পথে যোগ করুন'],
  removeFromRoute: ['Remove {name} from route', '{name} পথ থেকে বাদ দিন'],
  details: ['Details', 'বিস্তারিত'],
  detailsFor: ['Details for {name}', '{name}-এর বিস্তারিত'],
  routeFull: ['Route is full: 12 stops', 'পথ পূর্ণ: ১২টি স্টপ'],
  visitAllowance: ['{n} min visit', '{n} মিনিট দর্শন'],
  crowdEstimated: ['Estimated', 'আনুমানিক'],
  crowdReported: ['Your report', 'আপনার রিপোর্ট'],
  crowdLight: ['Light', 'হালকা'],
  crowdModerate: ['Moderate', 'মাঝারি'],
  crowdHeavy: ['Heavy', 'ভারী'],
  popularity: ['Popularity {n} of 3', 'জনপ্রিয়তা ৩-এর মধ্যে {n}'],
  startFrom: ['Start from', 'শুরু কোথা থেকে'],
  startLandmark: ['Start landmark', 'শুরুর জায়গা'],
  useMyLocation: ['Use my location', 'আমার অবস্থান ব্যবহার করুন'],
  locating: ['Finding your location…', 'আপনার অবস্থান খোঁজা হচ্ছে…'],
  yourLocation: ['Your location', 'আপনার অবস্থান'],
  yourLocationAccuracy: ['Your location · about ±{m} m', 'আপনার অবস্থান · প্রায় ±{m} মি'],
  forgetLocation: ['Forget location', 'অবস্থান মুছুন'],
  locationInMemory: ['Kept in memory only; not saved or included in shared plans.', 'শুধু মেমোরিতে থাকে; সংরক্ষণ বা প্ল্যানের সঙ্গে শেয়ার হয় না।'],
  locDenied: ['Location permission was denied. Choose a start landmark instead, or allow location in browser settings and try again.', 'অবস্থানের অনুমতি দেওয়া হয়নি। বদলে শুরুর জায়গা বেছে নিন, বা ব্রাউজার সেটিংসে অনুমতি দিয়ে আবার চেষ্টা করুন।'],
  locUnavailable: ['Location is unavailable right now. Choose a start landmark instead.', 'এখন অবস্থান পাওয়া যাচ্ছে না। বদলে শুরুর জায়গা বেছে নিন।'],
  locTimeout: ['Finding your location took too long. Choose a start landmark or try again.', 'অবস্থান খুঁজতে বেশি সময় লাগছে। শুরুর জায়গা বেছে নিন বা আবার চেষ্টা করুন।'],
  locOutside: ['Your location is outside the Kolkata planning area, so a landmark start is used instead.', 'আপনার অবস্থান কলকাতার পরিকল্পনা এলাকার বাইরে, তাই শুরুর জায়গা ব্যবহার হচ্ছে।'],
  locUnsupported: ['This browser does not provide location. Choose a start landmark.', 'এই ব্রাউজারে অবস্থান পাওয়া যায় না। শুরুর জায়গা বেছে নিন।'],
  locInsecure: ['Location needs a secure (https) page. Choose a start landmark.', 'অবস্থানের জন্য সুরক্ষিত (https) পাতা দরকার। শুরুর জায়গা বেছে নিন।'],
  travel: ['Travel', 'যাতায়াত'],
  prefBalanced: ['Balanced', 'মিশ্র'],
  prefBalancedHint: ['Walk + Metro', 'হাঁটা + মেট্রো'],
  prefWalk: ['Walking', 'হেঁটে'],
  prefLess: ['Less walking', 'কম হাঁটা'],
  timeBudget: ['Time budget', 'সময়'],
  hours: ['{n} h', '{n} ঘণ্টা'],
  pace: ['Pace', 'গতি'],
  paceRelaxed: ['Relaxed', 'ধীরে-সুস্থে'],
  paceSteady: ['Steady', 'স্থির'],
  leaveAt: ['Leave', 'রওনা'],
  now: ['Now', 'এখন'],
  todayAt: ['Today {time}', 'আজ {time}'],
  tomorrowAt: ['Tomorrow {time}', 'আগামীকাল {time}'],
  stopsHeading: ['Stops', 'স্টপ'],
  stopsOf: ['{n} of 12', '১২-এর মধ্যে {n}'],
  emptyStops: ['No stops yet. Add pandals from Explore or pick a suggested route.', 'এখনও কোনও স্টপ নেই। ঘুরে দেখুন থেকে পুজো যোগ করুন বা প্রস্তাবিত পথ বেছে নিন।'],
  moveUp: ['Move {name} up', '{name} উপরে তুলুন'],
  moveDown: ['Move {name} down', '{name} নীচে নামান'],
  clearStops: ['Clear all stops', 'সব স্টপ মুছুন'],
  optimize: ['Optimize route', 'পথ সাজিয়ে নিন'],
  reoptimize: ['Re-optimize', 'আবার সাজান'],
  optimizing: ['Estimating…', 'হিসাব চলছে…'],
  planChanged: ['Stops, settings or crowd reports changed since the last estimate. Re-optimize for fresh times.', 'শেষ হিসাবের পর স্টপ, সেটিংস বা ভিড়ের রিপোর্ট বদলেছে। নতুন সময়ের জন্য আবার সাজান।'],
  planVisitsChanged: ['Times below were estimated before your latest visits. Re-optimize to refresh them.', 'নীচের সময়গুলি আপনার শেষ দর্শনের আগের হিসাব। নতুন করে পেতে আবার সাজান।'],
  planFailed: ['The route could not be estimated. Check the stops and try again.', 'পথের হিসাব করা যায়নি। স্টপগুলি দেখে আবার চেষ্টা করুন।'],
  estimateHeading: ['Optimized estimate', 'আনুমানিক সাজানো পথ'],
  estimateMeta: ['Leaving {time} from {origin}', '{origin} থেকে {time}-এ রওনা'],
  totalDuration: ['Total {range}', 'মোট {range}'],
  finishBy: ['finish about {a}–{b}', 'শেষ আনুমানিক {a}–{b}'],
  breakdown: ['Travel {travel} · queues {queue} · visits {visit} min · walking about {km} km', 'যাতায়াত {travel} · লাইন {queue} · দর্শন {visit} মিনিট · হাঁটা প্রায় {km} কিমি'],
  estimateNote: ['Ranges are planning estimates, not live times. Queues, Metro service and road conditions are uncertain; confirm locally.', 'সীমাগুলি পরিকল্পনার আনুমান, সরাসরি সময় নয়। লাইন, মেট্রো পরিষেবা ও রাস্তার অবস্থা অনিশ্চিত; স্থানীয়ভাবে যাচাই করুন।'],
  overBudget: ['The upper estimate exceeds your {h} h budget. No stop is removed automatically.', 'সর্বোচ্চ আনুমানিক সময় আপনার {h} ঘণ্টার বাজেট ছাড়িয়ে যাচ্ছে। কোনও স্টপ নিজে থেকে বাদ যায় না।'],
  fitsBudget: ['Within budget: {names}', 'বাজেটের মধ্যে: {names}'],
  fitsNone: ['Even the first stop may not fit the budget.', 'প্রথম স্টপটিও বাজেটে না-ও কুলোতে পারে।'],
  extendBudget: ['Allow {n} h instead', 'বদলে {n} ঘণ্টা ধরুন'],
  trimToBudget: ['Keep only the stops that fit', 'শুধু বাজেটে কুলোনো স্টপ রাখুন'],
  arriveWindow: ['Arrive {a}–{b}', 'পৌঁছনো {a}–{b}'],
  queueRange: ['queue {range}', 'লাইন {range}'],
  visitRange: ['visit {n} min', 'দর্শন {n} মিনিট'],
  modeWalk: ['Walk', 'হাঁটা'],
  modeMetro: ['Metro', 'মেট্রো'],
  modeRoad: ['By road', 'সড়কপথে'],
  modeRoadHint: ['taxi, auto or bus; not a timetable', 'ট্যাক্সি, অটো বা বাস; সময়সূচি নয়'],
  recommended: ['Recommended', 'প্রস্তাবিত'],
  otherOptions: ['Other options', 'অন্য উপায়'],
  via: ['via {stations}', '{stations} হয়ে'],
  transfers: ['{n} transfer', '{n}টি বদল'],
  walkingPart: ['{m} m on foot', '{m} মি হেঁটে'],
  minutes: ['{range} min', '{range} মিনিট'],
  minutesShort: ['min', 'মিনিট'],
  whyWalkShort: ['Short walk; avoids Metro access and waiting.', 'অল্প হাঁটা; মেট্রোয় ঢোকা ও অপেক্ষা এড়ানো যায়।'],
  whyWalkOnly: ['No Metro station close enough on both ends; walking stays simplest.', 'দু-প্রান্তেই কাছে মেট্রো নেই; হাঁটাই সবচেয়ে সহজ।'],
  whyMetroSaves: ['Metro saves about {m} m of walking versus the {walk} min walk.', '{walk} মিনিট হাঁটার তুলনায় মেট্রোয় প্রায় {m} মি কম হাঁটা।'],
  whyMetroFaster: ['Metro is faster than walking here, including waits and transfers.', 'অপেক্ষা ও বদল ধরেও এখানে মেট্রো হাঁটার চেয়ে দ্রুত।'],
  whyRoad: ['Long hop with no Metro link; includes 10–20 min pickup and traffic allowance.', 'মেট্রো যোগ নেই এমন লম্বা পথ; ১০–২০ মিনিট গাড়ি ধরা ও যানজটের হিসাব ধরা।'],
  whyPreference: ['Chosen for your {pref} preference.', 'আপনার {pref} পছন্দ অনুযায়ী বাছা।'],
  journey: ['Journey', 'যাত্রা'],
  startJourney: ['Start journey', 'যাত্রা শুরু করুন'],
  stopJourney: ['Stop journey', 'যাত্রা শেষ করুন'],
  journeyActive: ['Journey in progress', 'যাত্রা চলছে'],
  progress: ['{done} of {total} visited', '{total}টির মধ্যে {done}টি দেখা হয়েছে'],
  nextStop: ['Next stop', 'পরের স্টপ'],
  allVisited: ['All stops visited.', 'সব স্টপ দেখা হয়ে গেছে।'],
  autoToggle: ['Auto-mark visited with GPS', 'জিপিএস দিয়ে নিজে থেকে দেখা হয়েছে চিহ্নিত'],
  autoHint: ['Only while this tab is open: about 45 s within 90 m of the next stop with a good fix (±60 m). Manual marking always works.', 'শুধু এই ট্যাব খোলা থাকলে: পরের স্টপের ৯০ মিটারের মধ্যে ভাল সিগনালে (±৬০ মি) প্রায় ৪৫ সেকেন্ড থাকলে। হাতে চিহ্নিত করা সব সময় চলবে।'],
  autoWaiting: ['Waiting for a good GPS fix…', 'ভাল জিপিএস সিগনালের অপেক্ষায়…'],
  autoDwelling: ['Near {name}: stay about 45 s to confirm.', '{name}-এর কাছে: নিশ্চিত হতে প্রায় ৪৫ সেকেন্ড থাকুন।'],
  autoFar: ['Not within 90 m of the next stop yet.', 'এখনও পরের স্টপের ৯০ মিটারের মধ্যে নয়।'],
  autoInaccurate: ['GPS accuracy ±{m} m is too low for auto check-in (needs ±60 m).', 'জিপিএস নির্ভুলতা ±{m} মি যথেষ্ট নয় (±৬০ মি দরকার)।'],
  autoPaused: ['Paused while the tab is hidden.', 'ট্যাব আড়ালে থাকায় থামানো আছে।'],
  autoOutside: ['Outside the Kolkata area; auto check-in is paused.', 'কলকাতা এলাকার বাইরে; নিজে থেকে চিহ্নিত করা থামানো।'],
  autoSuppressed: ['Auto-marking is held for {name} until you move away.', 'সরে না যাওয়া পর্যন্ত {name}-এর জন্য নিজে থেকে চিহ্নিত করা থামানো।'],
  markVisited: ['Mark visited', 'দেখা হয়েছে'],
  markVisitedFor: ['Mark {name} as visited', '{name} দেখা হয়েছে বলে চিহ্নিত করুন'],
  unmarkVisited: ['Undo visited', 'দেখা হয়নি করুন'],
  unmarkVisitedFor: ['Undo visited for {name}', '{name}-এর দেখা হয়েছে চিহ্ন তুলুন'],
  visited: ['Visited', 'দেখা হয়েছে'],
  visitedAt: ['Visited {time}', 'দেখা হয়েছে {time}'],
  visitedAuto: ['auto', 'নিজে থেকে'],
  autoToast: ['Marked {name} as visited automatically.', '{name} নিজে থেকে দেখা হয়েছে বলে চিহ্নিত হল।'],
  undo: ['Undo', 'ফিরিয়ে নিন'],
  approximatePin: ['Approximate pin from a public listing, not a verified entrance. Follow local signs.', 'প্রকাশ্য তালিকার আনুমানিক বিন্দু, যাচাই করা প্রবেশদ্বার নয়। স্থানীয় নির্দেশ মেনে চলুন।'],
  source: ['Source', 'উৎস'],
  sourceChecked: ['Listing checked {date}; not confirmation of 2026 events or hours.', 'তালিকা দেখা হয়েছে {date}; ২০২৬-এর পুজো বা সময়ের নিশ্চয়তা নয়।'],
  nearestMetro: ['Nearest Metro', 'কাছের মেট্রো'],
  metroNone: ['No modelled Metro station nearby', 'কাছে কোনও মডেল করা মেট্রো স্টেশন নেই'],
  metroStraightLine: ['about {d} straight line, not a walking route', 'সরলরেখায় প্রায় {d}, হাঁটার পথ নয়'],
  metres: ['{m} m', '{m} মি'],
  address: ['Area', 'এলাকা'],
  reportCrowd: ['Report the crowd here', 'এখানকার ভিড় জানান'],
  reportHint: ['Saved only on this device for 2 hours and used in your estimates.', 'শুধু এই ডিভাইসে ২ ঘণ্টা থাকে এবং আপনার হিসাবে ব্যবহার হয়।'],
  yourReport: ['Your report · on this device', 'আপনার রিপোর্ট · এই ডিভাইসে'],
  expiresIn: ['expires in {t}', '{t} পরে মুছে যাবে'],
  clearReport: ['Clear report', 'রিপোর্ট মুছুন'],
  crowdBasisModel: ['Typical pattern for this hour (IST), not a live observation', 'এই সময়ের (IST) সাধারণ ধরণ, সরাসরি পর্যবেক্ষণ নয়'],
  crowdBasisReport: ['Based on your local report', 'আপনার স্থানীয় রিপোর্টের ভিত্তিতে'],
  directions: ['Directions in Google Maps', 'গুগল ম্যাপসে পথনির্দেশ'],
  navigation: ['Navigation', 'পথনির্দেশ'],
  navigationNext: ['Next destination', 'পরের গন্তব্য'],
  navigate: ['Navigate', 'পথনির্দেশ নিন'],
  navigateTo: ['Navigate to {name}', '{name} যাওয়ার পথনির্দেশ নিন'],
  navigationAnywhere: ['Navigate somewhere', 'অন্য কোথাও যান'],
  navigationNoStops: ['No route stops selected.', 'পথের কোনও স্টপ বাছা হয়নি।'],
  navigationFrom: ['From', 'কোথা থেকে'],
  navigationTo: ['To', 'কোথায়'],
  navigationCurrent: ['Current location', 'বর্তমান অবস্থান'],
  navigationPlannedStart: ['Planned start: {name}', 'পরিকল্পিত শুরু: {name}'],
  navigationPreviousStop: ['Previous stop: {name}', 'আগের স্টপ: {name}'],
  navigationPlacePlaceholder: ['Pandal, landmark or address', 'পুজো, পরিচিত জায়গা বা ঠিকানা'],
  navigationDestinationRequired: ['Destination required.', 'গন্তব্য দিতে হবে।'],
  navigationSearchQuery: ['Google Maps place search; no pandal pin selected.', 'গুগল ম্যাপসে এই লেখা দিয়ে খোঁজা হবে; পুজোর পিন বাছা হয়নি।'],
  navigationTravel: ['Travel mode', 'যাতায়াতের মাধ্যম'],
  navigationMetroBus: ['Metro + bus', 'মেট্রো + বাস'],
  navigationDrive: ['Drive', 'গাড়ি'],
  navigationCurrentNote: ['Google Maps may ask for location permission or a starting place. Your GPS is not sent by this app.', 'গুগল ম্যাপস অবস্থানের অনুমতি বা শুরুর জায়গা চাইতে পারে। এই অ্যাপ আপনার জিপিএস পাঠায় না।'],
  navigationPreviewNote: ['Route preview from a selected place, not your current position.', 'বাছা জায়গা থেকে পথের পূর্বরূপ, আপনার বর্তমান অবস্থান থেকে নয়।'],
  navigationWalking: ['Start walking navigation', 'হাঁটার পথনির্দেশ শুরু করুন'],
  navigationTransit: ['Open Metro/bus directions', 'মেট্রো/বাসের পথনির্দেশ খুলুন'],
  navigationDriving: ['Start driving navigation', 'গাড়ির পথনির্দেশ শুরু করুন'],
  navigationPreview: ['Open route preview', 'পথের পূর্বরূপ খুলুন'],
  navigationProvider: ['Google Maps', 'গুগল ম্যাপস'],
  navigationProviderNote: ['Opens the Maps app or browser; navigation may fall back to a preview.', 'ম্যাপস অ্যাপ বা ব্রাউজারে খোলে; সরাসরি পথনির্দেশের বদলে পূর্বরূপ আসতে পারে।'],
  navigationApproximate: ['Pandal pins are approximate. Entrances and road closures are not verified; follow local signs.', 'পুজোর বিন্দুগুলি আনুমানিক। প্রবেশদ্বার ও রাস্তা বন্ধের তথ্য যাচাই করা নয়; স্থানীয় নির্দেশ মেনে চলুন।'],
  navigationBackground: ['Location following and auto check-in pause while this app is in the background.', 'এই অ্যাপ আড়ালে থাকলে অবস্থান অনুসরণ ও নিজে থেকে দেখা হয়েছে চিহ্নিত করা থেমে যায়।'],
  navigationOffline: ['Offline: your navigation draft is kept in this tab. Google Maps may need a connection.', 'অফলাইন: পথনির্দেশের খসড়া এই ট্যাবে আছে। গুগল ম্যাপসের জন্য সংযোগ লাগতে পারে।'],
  navigationPlannedMode: ['Mode from your latest plan.', 'শেষ পরিকল্পনার যাতায়াতের মাধ্যম।'],
  streetDirections: ['Directions', 'পথনির্দেশ'],
  streetShowRoutes: ['Show walking routes', 'হাঁটার পথ দেখান'],
  streetLocal: ['Walking routes on this device', 'এই ডিভাইসে হাঁটার পথ'],
  streetCurrentNote: ['Location permission on request. GPS stays on this device; map tiles reveal the viewed area and IP.', 'চাইলে অবস্থানের অনুমতি নেওয়া হয়। জিপিএস এই ডিভাইসেই থাকে; মানচিত্রের টাইলে দেখা এলাকা ও আইপি যায়।'],
  streetExternalWalking: ['Walking in Google Maps', 'গুগল ম্যাপসে হাঁটার পথ'],
  streetExternal: ['Google Maps (external)', 'গুগল ম্যাপস (বাইরে)'],
  streetPickStart: ['Pick start on map', 'মানচিত্রে শুরু বাছুন'],
  streetPickDestination: ['Pick destination on map', 'মানচিত্রে গন্তব্য বাছুন'],
  streetChoosePoint: ['Choose this point', 'এই বিন্দু বাছুন'],
  streetPoint: ['Selected map point', 'মানচিত্রে বাছা বিন্দু'],
  streetPickHint: ['Select a point within the mapped area', 'মানচিত্রের এলাকার মধ্যে একটি বিন্দু বাছুন'],
  streetEdit: ['Edit directions', 'পথনির্দেশ বদলান'],
  streetClose: ['Close directions', 'পথনির্দেশ বন্ধ করুন'],
  streetShortest: ['Shortest', 'সবচেয়ে ছোট'],
  streetMappedRoads: ['Mapped roads', 'মানচিত্রের রাস্তা'],
  streetQuieter: ['Lower estimated crowd', 'আনুমানিক কম ভিড়'],
  streetNoAlternative: ['No different lower-exposure route found', 'কম ভিড়ের আলাদা পথ পাওয়া যায়নি'],
  streetGraphOnly: ['Shortest within this mapped walking network.', 'এই মানচিত্রের হাঁটার রাস্তার মধ্যে সবচেয়ে ছোট পথ।'],
  streetGraphQuieter: ['Lower estimated crowd: compared with the shortest mapped route, this mapped route detours around zones of estimated near-pandal pressure. An estimate only — not live, not crowd-free and not safer.', 'আনুমানিক কম ভিড়: সবচেয়ে ছোট মানচিত্রের পথের তুলনায় এই পথ পুজোর কাছের আনুমানিক চাপের এলাকা এড়িয়ে যায়। শুধুই অনুমান — সরাসরি তথ্য নয়, ভিড়হীন বা নিরাপদতর নয়।'],
  streetAltLegend: ['Other option: {name}', 'অন্য বিকল্প: {name}'],
  streetExtra: ['Extra {distance} · {time}', 'বাড়তি {distance} · {time}'],
  streetWalkEstimate: ['Estimated walk · road segments only', 'আনুমানিক হাঁটা · শুধু রাস্তার অংশ'],
  streetLoading: ['Loading walking streets', 'হাঁটার রাস্তা লোড হচ্ছে'],
  streetLoadProgress: ['{n} / 8 MiB', '{n} / ৮ MiB'],
  streetRetry: ['Retry walking route', 'আবার হাঁটার পথ খুঁজুন'],
  streetNetworkError: ['Walking data unavailable. Retry online or after the offline download is complete.', 'হাঁটার তথ্য নেই। অনলাইনে বা অফলাইন ডাউনলোড শেষ হলে আবার চেষ্টা করুন।'],
  streetTimeout: ['Street loading timed out. Retry when the connection is ready.', 'রাস্তার তথ্য আনতে সময় শেষ। সংযোগ ঠিক হলে আবার চেষ্টা করুন।'],
  streetDataError: ['Walking data could not be validated. No route is shown.', 'হাঁটার তথ্য যাচাই করা যায়নি। কোনও পথ দেখানো হচ্ছে না।'],
  streetOutside: ['Outside this walking dataset. Choose a point inside the mapped area.', 'এই হাঁটার মানচিত্রের বাইরে। এলাকার ভিতরে বিন্দু বাছুন।'],
  streetNoNearby: ['No mapped walking street within 120 m. Choose another point; no distant-road jump was made.', '১২০ মিটারের মধ্যে হাঁটার রাস্তা নেই। অন্য বিন্দু বাছুন; দূরের রাস্তায় সরিয়ে দেওয়া হয়নি।'],
  streetDisconnected: ['No connected walking path in this dataset. This is a map gap, not a claim that the place is inaccessible.', 'এই মানচিত্রে সংযুক্ত হাঁটার পথ নেই। এটি তথ্যের ফাঁক, জায়গাটি অগম্য এমন দাবি নয়।'],
  streetUnknown: ['No local coordinate for this text. Pick a map point or use Google Maps search.', 'এই লেখার স্থানীয় অবস্থান নেই। মানচিত্রে বিন্দু বাছুন বা গুগল ম্যাপসে খুঁজুন।'],
  streetLocationFailed: ['No current start location. Choose a public start or try location again.', 'বর্তমান শুরুর অবস্থান নেই। পরিচিত জায়গা বাছুন বা আবার অবস্থান নিন।'],
  streetPoorFix: ['GPS accuracy is worse than 60 m. A walking start needs a better fix.', 'জিপিএস নির্ভুলতা ৬০ মিটারের বেশি। হাঁটার শুরুর জন্য আরও ভাল সিগনাল দরকার।'],
  streetStaleFix: ['Location is older than 30 seconds or has an invalid time. Request a fresh location.', 'অবস্থান ৩০ সেকেন্ডের বেশি পুরনো বা সময় ভুল। নতুন অবস্থান নিন।'],
  streetChanged: ['Directions changed. Calculate a new walking route.', 'পথনির্দেশ বদলেছে। নতুন হাঁটার পথ হিসাব করুন।'],
  streetStale: ['Crowd estimate is out of date or settings changed. Recalculate to refresh the route.', 'ভিড়ের হিসাব পুরনো বা সেটিংস বদলেছে। নতুন পথের জন্য আবার হিসাব করুন।'],
  streetRecalculate: ['Recalculate', 'আবার হিসাব করুন'],
  streetRecalculateHere: ['Recalculate from here', 'এখান থেকে আবার হিসাব করুন'],
  streetStartWalking: ['Start walking', 'হাঁটা শুরু করুন'],
  streetPause: ['Pause guidance', 'পথনির্দেশ থামান'],
  streetFollowing: ['Following location', 'অবস্থান অনুযায়ী পথ'],
  streetPaused: ['Guidance paused', 'পথনির্দেশ থামানো'],
  streetReady: ['Ready to walk', 'হাঁটার জন্য প্রস্তুত'],
  streetOffRoute: ['Off mapped route. Progress paused.', 'মানচিত্রের পথের বাইরে। অগ্রগতি থামানো।'],
  streetUncertain: ['Location uncertain. Progress paused.', 'অবস্থান অনিশ্চিত। অগ্রগতি থামানো।'],
  streetNearDestination: ['Near mapped destination', 'মানচিত্রের গন্তব্যের কাছে'],
  streetRemaining: ['{distance} remaining', 'আর {distance}'],
  streetRemainingMapped: ['{distance} remaining on mapped roads', 'মানচিত্রের রাস্তায় আর {distance}'],
  streetArrivedRoad: ['Mapped road point reached', 'রাস্তার বিন্দুতে পৌঁছেছেন'],
  streetArrivedGap: ['Pin is about {distance} off this road. Entrance not verified.', 'বিন্দুটি এই রাস্তা থেকে প্রায় {distance} দূরে। প্রবেশপথ যাচাই করা নয়।'],
  streetNextTurn: ['Next · {action} in {distance}', 'পরের বাঁক · {distance} পরে {action}'],
  streetSteps: ['Walking directions', 'হাঁটার নির্দেশ'],
  streetDepart: ['Depart', 'রওনা দিন'],
  streetContinue: ['Continue', 'সোজা চলুন'],
  streetBearLeft: ['Bear left', 'একটু বাঁয়ে যান'],
  streetBearRight: ['Bear right', 'একটু ডাইনে যান'],
  streetTurnLeft: ['Turn left', 'বাঁয়ে ঘুরুন'],
  streetTurnRight: ['Turn right', 'ডাইনে ঘুরুন'],
  streetUTurn: ['Turn back', 'উল্টো দিকে ঘুরুন'],
  streetArrive: ['Mapped destination', 'মানচিত্রের গন্তব্য'],
  streetUnnamed: ['Unnamed road', 'নামহীন রাস্তা'],
  streetBridge: ['Bridge', 'সেতু'],
  streetStairs: ['Steps', 'সিঁড়ি'],
  streetTunnel: ['Tunnel', 'সুড়ঙ্গ'],
  streetStartGap: ['Start pin to mapped road: {distance}', 'শুরুর বিন্দু থেকে রাস্তা: {distance}'],
  streetDestinationGap: ['Destination pin to mapped road: {distance}', 'গন্তব্যের বিন্দু থেকে রাস্তা: {distance}'],
  streetGapNote: ['Off-street access unverified; gaps are not included in distance or time. Road arrival is not entrance arrival.', 'রাস্তার বাইরের প্রবেশপথ যাচাই করা নয়; ফাঁকের দূরত্ব ও সময় ধরা নেই। রাস্তায় পৌঁছনো মানে প্রবেশদ্বারে পৌঁছনো নয়।'],
  streetSnapStart: ['Mapped road start', 'রাস্তায় শুরুর বিন্দু'],
  streetSnapDestination: ['Mapped road destination', 'রাস্তায় গন্তব্যের বিন্দু'],
  streetPinStart: ['Approximate start pin', 'আনুমানিক শুরুর বিন্দু'],
  streetPinDestination: ['Approximate destination pin', 'আনুমানিক গন্তব্যের বিন্দু'],
  streetSource: ['Map source & limitations', 'মানচিত্রের উৎস ও সীমা'],
  streetSourceDate: ['OSM snapshot: {date}', 'ওএসএম তথ্য: {date}'],
  streetCrowdAsOf: ['Crowd estimate: {time} IST', 'ভিড়ের হিসাব: {time} ভারতীয় সময়'],
  streetCrowdModel: ['Estimated near-pandal pressure: 180 m zones; moderate weight 1, heavy 3. Not live street counts.', 'পুজোর কাছে আনুমানিক চাপ: ১৮০ মিটার এলাকা; মাঝারি ওজন ১, ভারী ৩। সরাসরি রাস্তার ভিড় গণনা নয়।'],
  streetLimits: ['No live closures or police controls; access is not guaranteed. Follow local signs.', 'রাস্তা বন্ধ বা পুলিশের নিয়ন্ত্রণের সরাসরি তথ্য নেই; প্রবেশের নিশ্চয়তা নয়। স্থানীয় নির্দেশ মানুন।'],
  streetCrowdLimits: ['Lower exposure is estimated, not crowd-free or safer.', 'কম ভিড় আনুমানিক, ভিড়হীন বা নিরাপদতর এমন নয়।'],
  streetAccessLimits: ['Mapped steps, bridges and tunnels are not accessibility certification.', 'মানচিত্রের সিঁড়ি, সেতু ও সুড়ঙ্গ সবার চলাচলের উপযোগিতার নিশ্চয়তা নয়।'],
  streetLicense: ['Local ODbL notice', 'স্থানীয় ODbL বিজ্ঞপ্তি'],
  streetLegend: ['Mapped walking route', 'মানচিত্রের হাঁটার পথ'],
  streetHotspots: ['Estimated crowd areas', 'আনুমানিক ভিড়ের এলাকা'],
  streetTilesOnly: ['Street route retained; background tiles unavailable.', 'রাস্তার পথ আছে; পটভূমির মানচিত্রের টাইল নেই।'],
  dirWalking: ['Walking', 'হেঁটে'],
  dirTransit: ['Compare bus & Metro', 'বাস ও মেট্রো তুলনা'],
  dirDriving: ['By road', 'সড়কপথে'],
  dirFrom: ['from {origin}', '{origin} থেকে'],
  externalNote: ['Opens Google Maps in a new tab with the approximate pin. If your start is your location, Google Maps uses the device location only when you open it.', 'আনুমানিক বিন্দু নিয়ে নতুন ট্যাবে গুগল ম্যাপস খোলে। শুরু যদি আপনার অবস্থান হয়, খোলার সময়েই শুধু গুগল ম্যাপস ডিভাইসের অবস্থান ব্যবহার করে।'],
  showOnMap: ['Show on map', 'মানচিত্রে দেখান'],
  close: ['Close', 'বন্ধ করুন'],
  legend: ['Legend', 'সংকেত'],
  legendRoute: ['Approximate route', 'আনুমানিক পথ'],
  legendMetroLeg: ['Metro leg (approximate)', 'মেট্রো অংশ (আনুমানিক)'],
  legendMetroLine: ['Metro line (schematic)', 'মেট্রো লাইন (রেখাচিত্র)'],
  legendPandal: ['Pandal', 'পুজো'],
  legendStop: ['Route stop', 'পথের স্টপ'],
  legendVisited: ['Visited', 'দেখা হয়েছে'],
  legendStart: ['Start', 'শুরু'],
  legendYou: ['You', 'আপনি'],
  offlineOverview: ['Offline overview', 'অফলাইন রূপরেখা'],
  streetsUnavailable: ['Streets unavailable', 'রাস্তার মানচিত্র পাওয়া যাচ্ছে না'],
  streetsSlow: ['Street map is slow to load', 'রাস্তার মানচিত্র লোড হতে দেরি হচ্ছে'],
  streetsSlowNote: ['Overview shown until street tiles arrive.', 'রাস্তার টাইল না আসা পর্যন্ত রূপরেখা দেখানো হচ্ছে।'],
  schematicNote: ['Schematic: river, Metro lines and pins are approximate; no streets are shown.', 'রেখাচিত্র: নদী, মেট্রো লাইন ও বিন্দু আনুমানিক; কোনও রাস্তা দেখানো নেই।'],
  hooghly: ['Hooghly (approximate)', 'হুগলি (আনুমানিক)'],
  retryStreets: ['Retry street map', 'রাস্তার মানচিত্র আবার চেষ্টা করুন'],
  loadingStreets: ['Loading street map…', 'রাস্তার মানচিত্র লোড হচ্ছে…'],
  locateMe: ['Show my location on the map', 'মানচিত্রে আমার অবস্থান দেখান'],
  fitRoute: ['Fit the whole route', 'পুরো পথ দেখান'],
  mapRegion: ['Map of Kolkata pandals', 'কলকাতার পুজোর মানচিত্র'],
  mapTools: ['Map tools', 'মানচিত্রের সরঞ্জাম'],
  mapListHint: ['Every pin is also listed in Explore and Your route.', 'প্রতিটি বিন্দু ঘুরে দেখুন ও আপনার পথ তালিকাতেও আছে।'],
  startMarker: ['Start: {name}', 'শুরু: {name}'],
  stopMarker: ['Stop {n}: {name}', 'স্টপ {n}: {name}'],
  aboutTitle: ['About Puja Path', 'পুজোর পথে সম্পর্কে'],
  aboutAssumptions: ['Estimates and limits', 'আনুমান ও সীমা'],
  aboutAssumptionsBody: ['Travel times, queues and crowd levels are planning assumptions, not live data. Your route uses straight planning connectors. Directions uses a dated OpenStreetMap walking network; off-street gaps and entrance access are unverified. Closures, police controls and Metro service can differ; confirm locally.', 'যাতায়াতের সময়, লাইন ও ভিড় আনুমানিক, সরাসরি তথ্য নয়। আপনার পথ-এ পরিকল্পনার সরল সংযোগ থাকে। পথনির্দেশ-এ তারিখযুক্ত OpenStreetMap হাঁটার রাস্তা ব্যবহৃত হয়; রাস্তার বাইরের ফাঁক ও প্রবেশপথ যাচাই করা নয়। রাস্তা বন্ধ, পুলিশের নিয়ন্ত্রণ ও মেট্রো পরিষেবা বদলাতে পারে; স্থানীয়ভাবে যাচাই করুন।'],
  aboutEvents: ['Public listings were checked on {date}. This does not confirm that any puja, theme, opening hour or gate applies in 2026.', 'প্রকাশ্য তালিকা {date}-এ দেখা হয়েছে। এতে ২০২৬-এর কোনও পুজো, থিম, খোলার সময় বা প্রবেশদ্বার নিশ্চিত হয় না।'],
  aboutSafety: ['Safety', 'নিরাপত্তা'],
  aboutSafetyBody: ['Expect dense crowds, long queues, one-way lanes and road closures around major pandals, especially after dusk. Keep children and companions close, agree a meeting point, and follow police and volunteer directions. Step-free access at entrances is not known.', 'বড় পুজোগুলির চারপাশে, বিশেষত সন্ধ্যার পর, প্রচণ্ড ভিড়, লম্বা লাইন, একমুখী গলি ও রাস্তা বন্ধ থাকতে পারে। শিশু ও সঙ্গীদের কাছে রাখুন, দেখা করার জায়গা ঠিক করুন, পুলিশ ও স্বেচ্ছাসেবকদের নির্দেশ মানুন। প্রবেশদ্বারে বাধামুক্ত প্রবেশের তথ্য জানা নেই।'],
  call112: ['Call 112 (emergency)', '১১২-এ ফোন করুন (জরুরি)'],
  aboutPrivacy: ['Privacy', 'গোপনীয়তা'],
  aboutPrivacyBody: ['Planned stops, visits, reports and language are saved in this browser. Walking directions and picked map points stay in memory only. On request, raw GPS coordinates are used in memory, not saved or included in shared plans. OpenStreetMap receives the viewed map area and your IP address through tile requests. Opening Google Maps makes a separate request to that provider; local walking calculations do not send GPS.', 'পরিকল্পিত স্টপ, দর্শন, রিপোর্ট ও ভাষা এই ব্রাউজারে সংরক্ষিত হয়। হাঁটার পথনির্দেশ ও মানচিত্রে বাছা বিন্দু শুধু মেমোরিতে থাকে। আপনি চাইলে জিপিএসের মূল স্থানাঙ্ক মেমোরিতে ব্যবহার হয়; সংরক্ষিত হয় না বা শেয়ার করা প্ল্যানে থাকে না। টাইলের অনুরোধের মাধ্যমে OpenStreetMap দেখা মানচিত্রের এলাকা ও আপনার IP ঠিকানা পায়। গুগল ম্যাপস খুললে সেই পরিষেবায় আলাদা অনুরোধ যায়; স্থানীয় হাঁটার হিসাবে জিপিএস পাঠানো হয় না।'],
  clearDevice: ['Clear device history', 'এই ডিভাইসের ইতিহাস মুছুন'],
  clearDeviceTitle: ['Clear everything on this device?', 'এই ডিভাইসের সব মুছবেন?'],
  clearDeviceBody: ['Your route, visits, crowd reports and remembered location will be removed. Language is kept.', 'আপনার পথ, দর্শন, ভিড়ের রিপোর্ট ও মনে রাখা অবস্থান মুছে যাবে। ভাষা থাকবে।'],
  clearConfirm: ['Clear', 'মুছুন'],
  cleared: ['Device history cleared.', 'এই ডিভাইসের ইতিহাস মুছে ফেলা হয়েছে।'],
  aboutCredits: ['Credits', 'কৃতজ্ঞতা'],
  creditsData: ['Pandal listings: KolkataKhoj, Pujo Map and Pujor Shohor public directories (approximate pins). Metro network: Metro Railway Kolkata system map (static subset).', 'পুজোর তালিকা: KolkataKhoj, Pujo Map ও Pujor Shohor-এর প্রকাশ্য ডিরেক্টরি (আনুমানিক বিন্দু)। মেট্রো নেটওয়ার্ক: মেট্রো রেলওয়ে কলকাতার সিস্টেম ম্যাপ (স্থির অংশ)।'],
  creditsMap: ['Street map: © OpenStreetMap contributors (ODbL), rendered with Leaflet.', 'রাস্তার মানচিত্র: © OpenStreetMap contributors (ODbL), Leaflet দিয়ে দেখানো।'],
  creditsFonts: ['Fonts: Outfit and Noto Sans Bengali (SIL Open Font License), bundled locally. Icons: Lucide (ISC).', 'ফন্ট: Outfit ও Noto Sans Bengali (SIL Open Font License), স্থানীয়ভাবে যুক্ত। আইকন: Lucide (ISC)।'],
  metroNotice: ['Metro notices', 'মেট্রো বিজ্ঞপ্তি'],
  storageSaveError: ['Could not save your route in this browser (storage may be full or blocked). Changes will be lost when you close the tab.', 'এই ব্রাউজারে আপনার পথ সংরক্ষণ করা যায়নি (স্টোরেজ ভরা বা বন্ধ থাকতে পারে)। ট্যাব বন্ধ করলে বদল হারিয়ে যাবে।'],
  storageLoadError: ['The saved route could not be read, so a fresh route is shown.', 'সংরক্ষিত পথ পড়া যায়নি, তাই নতুন পথ দেখানো হচ্ছে।'],
  storageBlocked: ['Browser storage is unavailable here, so nothing is saved between visits.', 'এখানে ব্রাউজার স্টোরেজ পাওয়া যাচ্ছে না, তাই পরের বার কিছু থাকবে না।'],
  shareTitle: ['Share this route', 'এই পথ শেয়ার করুন'],
  shareBody: ['Copy this link. It contains only your stops, start landmark and settings — never your location, visits or reports.', 'এই লিঙ্কটি কপি করুন। এতে শুধু আপনার স্টপ, শুরুর জায়গা ও সেটিংস আছে — আপনার অবস্থান, দর্শন বা রিপোর্ট নয়।'],
  shareLink: ['Share link', 'শেয়ার লিঙ্ক'],
  copyLink: ['Copy link', 'লিঙ্ক কপি করুন'],
  linkCopied: ['Link copied.', 'লিঙ্ক কপি হয়েছে।'],
  linkShared: ['Route shared.', 'পথ শেয়ার হয়েছে।'],
  shareEmpty: ['Add at least one stop before sharing.', 'শেয়ার করার আগে অন্তত একটি স্টপ যোগ করুন।'],
  sharedOpened: ['A shared route was opened: {n} stops from {start}.', 'একটি শেয়ার করা পথ খোলা হয়েছে: {start} থেকে {n}টি স্টপ।'],
  useShared: ['Use shared route', 'শেয়ার করা পথ নিন'],
  keepMine: ['Keep my route', 'আমার পথ রাখুন'],
  sharedInvalid: ['The shared link was not recognised, so your own route is shown.', 'শেয়ার করা লিঙ্কটি চেনা যায়নি, তাই আপনার নিজের পথ দেখানো হচ্ছে।'],
  dismiss: ['Dismiss', 'সরান'],
  catalogueNotice: ['About these listings', 'এই তালিকা সম্পর্কে'],
  featuredLabel: ['Featured', 'বিশেষ'],
  zoneNorth: ['North', 'উত্তর'],
  zoneCentral: ['Central', 'মধ্য'],
  zoneSouth: ['South', 'দক্ষিণ'],
  zoneSaltLake: ['Salt Lake', 'সল্টলেক'],
  zoneNewTown: ['New Town', 'নিউ টাউন'],
  zoneBehala: ['Behala', 'বেহালা'],
  hoursShort: ['{h} h {m} min', '{h} ঘণ্টা {m} মিনিট'],
  hoursOnly: ['{h} h', '{h} ঘণ্টা'],
  minutesOnly: ['{m} min', '{m} মিনিট'],
  distanceKm: ['{km} km', '{km} কিমি'],
  fromStart: ['{km} km from start', 'শুরু থেকে {km} কিমি'],
  leaveStop: ['leave about {time}', 'ছাড়া আনুমানিক {time}'],
  notifications: ['Notifications', 'বিজ্ঞপ্তি'],
  toastCurated: ['Route "{name}" is ready in Your route.', '"{name}" পথ আপনার পথ-এ তৈরি।'],
  toastTrimmed: ['Kept {n} stops that fit the budget.', 'বাজেটে কুলোনো {n}টি স্টপ রাখা হল।'],
  toastRemoved: ['Removed {name}.', '{name} বাদ দেওয়া হল।'],
  gpsNote: ['GPS on request only. Location following and opt-in check-in pause while this tab is hidden.', 'চাইলে তবেই জিপিএস। এই ট্যাব আড়ালে থাকলে অবস্থান অনুসরণ ও অনুমতি দেওয়া চেক-ইন থেমে যায়।'],
} as const satisfies Record<string, readonly [string, string]>

export type MessageKey = keyof typeof strings
export type MessageParams = Record<string, string | number>

export function t(language: Language, key: MessageKey, params?: MessageParams): string {
  const text = strings[key][language === 'bn' ? 1 : 0]
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name]
    return value === undefined ? match : String(value)
  })
}

export function locale(language: Language): string {
  return language === 'bn' ? 'bn-IN' : 'en-IN'
}

export function formatNumber(language: Language, value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(locale(language), { maximumFractionDigits }).format(value)
}

export function formatClock(language: Language, timestamp: number): string {
  return new Intl.DateTimeFormat(locale(language), {
    hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata',
  }).format(timestamp)
}

export function formatDate(language: Language, isoDate: string): string {
  const parsed = Date.parse(`${isoDate}T00:00:00Z`)
  if (!Number.isFinite(parsed)) return isoDate
  return new Intl.DateTimeFormat(locale(language), {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(parsed)
}

export function formatRangeDigits(language: Language, range: MinuteRange): string {
  const min = Math.round(range.min)
  const max = Math.round(range.max)
  return min === max ? formatNumber(language, min)
    : `${formatNumber(language, min)}–${formatNumber(language, max)}`
}

export function formatMinuteRange(language: Language, range: MinuteRange): string {
  return t(language, 'minutes', { range: formatRangeDigits(language, range) })
}

export function formatDuration(language: Language, minutes: number): string {
  const whole = Math.max(0, Math.round(minutes))
  const h = Math.floor(whole / 60)
  const m = whole % 60
  if (h === 0) return t(language, 'minutesOnly', { m: formatNumber(language, m) })
  if (m === 0) return t(language, 'hoursOnly', { h: formatNumber(language, h) })
  return t(language, 'hoursShort', { h: formatNumber(language, h), m: formatNumber(language, m) })
}

export function formatDurationRange(language: Language, range: MinuteRange): string {
  return `${formatDuration(language, range.min)} – ${formatDuration(language, range.max)}`
}

export function crowdLabel(language: Language, level: CrowdLevel): string {
  return t(language, level === 'light' ? 'crowdLight' : level === 'moderate' ? 'crowdModerate' : 'crowdHeavy')
}

export function zoneLabel(language: Language, zone: Zone): string {
  const keys: Record<Zone, MessageKey> = {
    'North': 'zoneNorth', 'Central': 'zoneCentral', 'South': 'zoneSouth',
    'Salt Lake': 'zoneSaltLake', 'New Town': 'zoneNewTown', 'Behala': 'zoneBehala',
  }
  return t(language, keys[zone])
}

export function modeLabel(language: Language, mode: TravelMode): string {
  return t(language, mode === 'walk' ? 'modeWalk' : mode === 'metro' ? 'modeMetro' : 'modeRoad')
}

export function preferenceLabel(language: Language, preference: TravelPreference): string {
  return t(language, preference === 'balanced' ? 'prefBalanced' : preference === 'walk' ? 'prefWalk' : 'prefLess')
}

export function paceLabel(language: Language, pace: Pace): string {
  return t(language, pace === 'relaxed' ? 'paceRelaxed' : 'paceSteady')
}

export function pickName(language: Language, item: { name: string, nameBn?: string }): string {
  return language === 'bn' && item.nameBn ? item.nameBn : item.name
}

export function otherName(language: Language, item: { name: string, nameBn?: string }): string | null {
  if (!item.nameBn) return null
  return language === 'bn' ? item.name : item.nameBn
}
