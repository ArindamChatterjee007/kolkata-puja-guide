# Festival Release QA

**2026-10-17: PASS for the tested local release gates. Publication pending.**
Exact GPT-6 Astra runtime identity is unverified; no fallback or subagents were used.
The local QA pass performed no Git, publishing, account or private-parent-document
actions. The subsequent authorized deployment pass is recorded separately below.

## Final Gates

| Gate | Verified result |
| --- | --- |
| Unit | 230 passed across 11 files |
| Build | Passed; generated precache manifest has 114 entries |
| Office | 10 checks passed; its existing publication metadata is not a festive-UI deployment receipt |
| Lint | Exit 0, 19 existing warnings; not warning-free |
| Full E2E | 89 passed, 0 failed, 0 skipped, 0 retries; 1 worker |
| E2E breakdown | Festival 12, previews 14, planner 33, streets 30 |
| Independent production | 16 checks passed, 0 failed |

The final E2E run started at **13:04:15.467 UTC** and took **294.513 seconds**.
All 13 pinned source/config/test hashes stayed unchanged during that run.
The standard gates ran after the production fix; the subsequent change was test-only.
No tests were added: three existing clock setups were corrected, with nine passing
focused clock executions plus three passing repeats of the untouched focus test.

Receipts: [summary](../test-results/festival-release/summary.json),
[full E2E](../test-results/festival-release/final-e2e.json),
[standard gates](../test-results/festival-release/final-gates.json),
[production](../test-results/festival-release/production.json).

## Publication Preparation

At `2026-10-17T13:17:24.823Z`, release metadata was updated for the completed local
feature checks: 230 unit tests in 11 files (completed `12:51:23.665Z`), 89 E2E
checks, build, 10 office checks and 16 independent production checks. The public
office now has a 19-task source snapshot, adding requested Fable Design and Astra
Data/QA tasks without asserting any exact runtime or parallel execution.

The existing public site remains deployed. Its board advances only to the previous
verified street artifact `faacbb31ca683650efa98ac271b1a7dc4f054c7e`, built-in Pages
run [38971497378](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/38971497378),
deploy completed `2026-10-16T21:45:53.000Z`. That is not a festival deployment
receipt. The initial Git guard matched source
`716d227904ae348f28744c272d8621c454cd312c` and that artifact on the approved remote.
Only branch-based Pages publication is authorized; the inactive Actions example
stays documentation, and the four protected untracked files remain excluded.

The first focused metadata check rejected two `.spec.ts` evidence links under the
office's existing allowlist, causing 8 derived failures. Those board links now point
to this Markdown release record; no security rule, app code or assertion changed.
The identical focused rerun passed all **57 office tests**.

Fresh final metadata gates passed on Node 25.5.0:

| Gate | UTC start | UTC completion | Result |
| --- | --- | --- | --- |
| Full unit | 2026-10-17T13:20:07.219Z | 13:20:10.493Z | 230 passed, 11 files |
| TypeScript/Vite build | 2026-10-17T13:20:10.496Z | 13:20:13.465Z | Exit 0 |
| Office browser checks | 2026-10-17T13:20:13.466Z | 13:20:18.253Z | 10 passed |

The office browser receipt observed snapshot `2026-10-17T13:17:24.823Z` at
`13:20:18.054Z` in isolated Chrome 155.0.8059.82. The board intentionally retains
the earlier completed full-suite timestamp. The previously completed **89 E2E
checks were not rerun** for this metadata-only pass. Local receipts remain ignored
under `test-results/festival-release/deployment-gates.json` and
`test-results/office-verification.json`. Public feature verification and the actual
source/artifact/run will be appended after deployment.

## Corrections And Retained Failures

- The [initial full run](../test-results/festival-release/initial-e2e/results.json)
  was 87/89: a past-time clock pause and a 320px map-focus failure.
  Two neighboring [planner tests](../tests/e2e/planner.spec.ts) now pause before
  navigation at the installed clock's current time plus 1,000 ms; focused result: 6/6.
- The focus scenario passed 3/3 unchanged repeats and both subsequent full runs.
  Its initial trace is retained. The intermittent cause is not established; no Map,
  Street, GPS or App behavior or focus assertion was changed.
- An [intermediate full run](../test-results/festival-release/intermediate-e2e/results.json)
  was 88/89: delayed assertion delivery missed the short-lived intro in the preview
  persistence test. That [test](../tests/e2e/previews.spec.ts) now installs and pauses
  its clock before navigation, preserving real Skip clicks, reload and storage assertions;
  focused result: 3/3. Real-time deadline tests remain unchanged.
- Production found an absolute legacy image URL in
  [ExploreTab](../src/components/ExploreTab.tsx). The sole app change prefixes it with
  `import.meta.env.BASE_URL`; real decoding under the deployment prefix now passes.
- The [initial production report](../test-results/festival-release/production-initial.json)
  also records a QA assumption corrected against the existing navigation contract:
  the Leaflet popup may remain behind Navigation. The final check verifies one native
  modal, blocked popup focus/hit-testing, proper dismissal and reusable popup controls.
- The shared Skip fixture, festival tests, test counts and behavioral assertions were
  not weakened. No forced DOM dismissal, storage bypass or production clock override.
  Three early media captures were replaced only after verifying full image opacity.

## Production Evidence

Headless installed Chrome rendered the actual build at a temporary loopback
`/kolkata-puja-guide/` prefix, with real CSS viewport sizes and no automatic Skip fixture.
The server and QA browser were closed; the pre-existing development server was preserved.

- Intro: 320x568 Bengali, 390x844 English, 1440x900, 1920x800 and 2560x900.
  Forehead, eyes, nose, mouth and chin fit; text/Skip do not overlap the face.
  The primary image is unblurred; ultra-wide layouts use contain plus a blurred copy.
  Observed open intervals were 1594.7-1603.1 ms, with the configured 160 ms exit fade.
  Skip, Escape, every refresh/new open, saved visits/route/language, zero GPS calls,
  unchanged prompt permission, no audio/video players and reduced-motion transforms pass.
- Desktop 200% computed-text-size stress passed at 1440x900. This was test-only text
  enlargement, not a claimed browser zoom setting or mobile text-resize result.
- All 33 rendered thumbnails and all 33 own area fallbacks decoded; all 42 new WebPs
  returned correct local content types/headers and matched source bytes. Eight photo
  credits and encoded links matched the manifest. Missing photo, missing area and both
  missing states kept active-image credits accurate, without invented years or broken images.
- At 320px, photo/area controls and Navigate remain reachable with 44px targets
  (43.5px fractional-layout tolerance). Marker popup, details and Navigation do not
  stack active dialogs or change saved plans. Fifteen production captures yielded
  twelve retained distinct frames, including three settled replacements.
- True offline: waited for SW installation/controller/cache readiness, cleared HTTP
  cache, closed the old document and own server, verified connection refusal, enabled
  browser offline, then opened a fresh document and reloaded. Intro, venue photo and
  area image decoded from confirmed SW responses, not prior image memory. All 108
  actual cache keys stayed on the same origin/prefix; 46 required assets included the
  7,899,330-byte graph, new images and font/ODbL/media notices. No external tile cache.

Screens: [Bengali intro](../test-results/festival-release/intro-320x568-bn.png),
[ultra-wide](../test-results/festival-release/intro-2560x900-en.png),
[mobile area](../test-results/festival-release/preview-320-area.png),
[mobile popup](../test-results/festival-release/preview-320-popup.png),
[offline area](../test-results/festival-release/offline-area-390.png).

## Rights And Limits

The [manifest](../src/data/pandalMedia.ts) has **8 historical photo primaries,
25 area-map primaries and 33 own area fallbacks**, not 33 venue photographs.
The 42 new WebPs total **2,212,474 bytes**. The intro is Biswarup Ganguly's 2015
Durga photograph, CC BY 3.0, distinct from the retained legacy HridoyKundu credit.
Venue photographs retain their individual CC0/CC BY/CC BY-SA terms; maps use real
OpenStreetMap data with ODbL attribution and original PujaPath rendering. See
[media rights](../public/images/MEDIA_LICENSES.md), [font rights](../public/FONT_LICENSES.md)
and [source provenance](MEDIA.md). Source identities/licenses were checked against
the existing local provenance, not independently re-researched online in this QA pass.

Axe reported zero violations for the tested production intros at 320px Bengali and
2560px English, but image-background color contrast remained incomplete; screenshots
were inspected, not a comprehensive contrast certification. Those axe checks used a
test clock only; production deadline measurements used real clocks. Live background
tiles were controlled fixtures, not proof of public OSM availability. No current-2026
appearance, live crowd, exact entrance or routing-access guarantee is made. The
initial intermittent focus failure and 19 unrelated lint warnings remain disclosed.

This is a local QA artifact, not a deployment receipt. Publication remains pending.