# Festival Release QA

**2026-10-17: deployed and publicly verified through 13:45:56.203 UTC.**
The completed [public deployment](#public-deployment) is separate from the retained
local QA and pre-publication snapshots below.
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

The preceding sections retain the local QA basis and pre-publication state. The
completed public release is recorded below; historical pending wording is not a
claim about the current live site.

## Public Deployment

The authorized public repository is
[ArindamChatterjee007/kolkata-puja-guide](https://github.com/ArindamChatterjee007/kolkata-puja-guide).
[PujaPath](https://arindamchatterjee007.github.io/kolkata-puja-guide/) and the
[public office](https://arindamchatterjee007.github.io/kolkata-puja-guide/office.html)
are deployed and verified.

| Receipt | Observed value |
| --- | --- |
| Feature/build source | `b2c64206163a9d7e581f68e08a15f2a038a411ec` |
| Source parent | `716d227904ae348f28744c272d8621c454cd312c` |
| Published artifact | `ce2b7dfa1656be1aa0d161f1ba700c704fc34f91` |
| Artifact parent | `faacbb31ca683650efa98ac271b1a7dc4f054c7e` |
| Built-in Pages run | [39036548670](https://github.com/ArindamChatterjee007/kolkata-puja-guide/actions/runs/39036548670), success |
| Deploy job completed | `2026-10-17T13:26:42.000Z` |
| Public checks | `2026-10-17T13:38:40.257Z` through `13:45:56.203Z` |
| Browser | Isolated installed headless Chrome `155.0.8059.82`, naturally visible documents |

Both branches were advanced with ordinary commits and pushes. The source commit
contains exactly 66 reviewed feature/metadata paths. The artifact contains 110
audited `dist` files plus an empty `.nojekyll`, with explicit deletions of only
`assets/main-BrP1ODdf.js` and `assets/main-Dj2CGfrN.css`. Index verification used
`--no-renames`; Git's later display of a CSS rename does not change those explicit
delete/add records. All 13 QA-pinned input hashes matched before publication.

Pages remains **Deploy from a branch**, `gh-pages`, `/(root)`, API
`build_type: "legacy"`. No active workflow was tracked or pushed, no authentication
scope was changed, and the inactive Actions example was not activated. The four
protected untracked files were excluded without reading their contents. The exact
built-in run was watched synchronously to success; its API name is `pages build
and deployment`, while the CLI workflow label is `pages-build-deployment`.

### Public Acceptance

- All **110 public build files** returned HTTP 200, appropriate MIME types and
  exact SHA-256/byte matches. This includes all **42 new WebPs**, all notices,
  project-prefixed fonts/scripts, worker, graph and office snapshot. `.nojekyll`
  is the additional artifact control file, not a public content asset.
- Real-time intro checks passed at **320x568 Bengali, 390x844 English, 1440x900
  English and 1920x800 English**, on both first open and reload. The eight measured
  open intervals were **1600.9-1609.4 ms**; the CSS exit remains 160 ms. Face geometry
  kept forehead, eyes, nose, mouth and chin inside the viewport and separate from
  text/Skip. The primary image was unblurred; the wide secondary background was
  blurred. No test clock, automatic Skip fixture or image fixture was used.
- Actual Skip, Escape, another real tab open, language rerender and reduced-motion
  checks passed. Route, seeded visit and language persisted, with no intro storage
  flag, GPS call or permission change. All planning data was synthetic and confined
  to fresh QA contexts; no user tabs or stored plans were accessed.
- All **33 thumbnails and 33 individual fallback files decoded**, and all eight
  historical photo captions, capture years, authors and license links matched the
  manifest. The legacy image decoded under the Pages project prefix. Photo/Area
  switching changed both picture and credit correctly without changing the plan.
- Mobile popup and detail controls were reachable without overlap or stacked
  active dialogs. Measured primary controls were **44 px**, using the established
  43.5 px fractional-layout tolerance, not a claimed 45 px minimum. One bounded
  real-OSM check reached `ready`, with four decoded 256px tiles and six successful
  tile responses. Other checks blocked tiles or were offline; no fixture basemap
  was presented as real public map evidence.
- The naturally visible public office at 1440px and 390px matched the exact
  **19-task, 230-test, 11-file, 8-role** snapshot. Festival task search, combined
  Design/Verified filters, List/Board and empty state passed. All model assignments
  remain requested/runtime-unverified. Its release object still deliberately names
  the **previous verified street checkpoint**, not this new artifact.
- After actual initial worker installation, **108 same-origin/project-scoped
  cache entries** matched the artifact hashes. The HTTP cache was cleared and the
  previous document closed before opening a fresh document with the browser offline.
  The new document was controlled by the correct worker; intro, Bagbazar's 2025 photo
  and its area map returned HTTP 200 **from the service worker**, decoded and showed
  the correct credits. The separate offline office showed all 19 tasks. The seeded
  route, visits and language were unchanged; no external assets were cached.

The build declares **114 precache entries** resolving to those **108 unique files**.
Measured cached bodies total **11,954,077 bytes (11.95 MB; 11.40 MiB)**, including
the 7,899,330-byte graph. The build's `11673.90 KiB` output was previously described
as approximately 11.67 MB; the byte measurement corrects that unit conversion.
The dated pre-publication board retains its earlier approximation. New image bytes
remain 2,212,474, not the whole installation size.

Twelve public captures were retained, and nine were visually inspected: all four
intro viewports, mobile photo/area/popup, mobile office and offline area. These are
ignored local evidence under `test-results/festival-release/public/`, not files
published to Pages. The earlier local server-stopped proof remains intact; no
second loopback audit or existing development-server shutdown was performed.

### Verifier Corrections And Limits

The first public run passed **10 of 11 checks**; its offline check waited for
control on a reloaded page before installation had completed. A focused attempt
then observed a null active worker. The diagnostic reproduced that this installed
Playwright's `waitForFunction(async () => false)` resolves immediately with false,
so it was not a valid readiness gate. An intermediate 20-second readiness probe
also expired; an unrouted diagnostic completed the full initial download in about
24 seconds and served a fresh offline office successfully, with no worker errors.

Only the ignored verifier changed: it now awaits `navigator.serviceWorker.ready`
and the actual activation event within a 60-second initial-download deadline,
then verifies control on the fresh offline document. The final focused check
passed at **13:45:56.203Z**, including all image, cache-hash, office and persistence
assertions. Public acceptance therefore combines the ten earlier passing checks
with this passing offline check; it is not presented as a clean first-run result.
The deployed app, worker lifecycle and original test assertions were not changed.

Machine evidence is retained locally in `publication-audit.json`,
`source-publication.json`, `artifact-plan.json`, `artifact-publication.json`,
`pages-run.json`, and the timestamped public reports beneath
`test-results/festival-release/`. The fresh 230-unit/build/10-office gates above
remain the final source gates; the prior passing **89 E2E checks were not rerun**
for this publication-only work.

Native Safari, physical phones, native Bengali acceptance and real foreground GPS
remain unverified. Earlier automated image-background contrast analysis was
incomplete; visual inspection is not a perfect-contrast or whole-UI certificate.
Historical photos are not current 2026 appearances; area maps are not venue photos
or offline interactive basemaps. Current crowds, entrances, closures and access
remain unverified. Requested GPT-6 Astra runtime remains unverified; no fallback
or subagents were used.

This completed receipt is a **source-only documentation commit** after the
artifact deployment. The board retains its previous verified checkpoint; no
second static deployment is required merely to embed this artifact's own SHA.