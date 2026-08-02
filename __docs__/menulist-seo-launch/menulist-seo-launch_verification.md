# MenuList SEO Launch Verification Log

**Status:** Active verification log  
**Created:** June 22, 2026  
**Product:** MenuList only  
**Scope:** SEO launch docs, public website claim boundary, LLM context, sitemap/robots/canonical/schema/indexing readiness

---

## July 1, 2026 - Owner SEO/AEO Value Layer Verification

### Trigger

Founder asked to check what exists, identify useful SMB-owner improvements still missing from the SEO/AEO system, and implement the valid work without adding public snapshots.

### Scope

- Public Truth owner readiness modules in desktop/mobile Business Health.
- Google Business Profile handoff guide in Official Business Page settings.
- Visible customer quick answers on Official Business Pages.
- Locale, diagnostic, cost, mobile, and SEO launch documentation parity.

### Checks Performed

```bash
git diff --check -- src/lib/public-truth-tools/ownerPublicTruthReadiness.ts src/components/templates/main-app/businessSettings/tabs/GoogleListingGuide.tsx src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx src/app/client/obp/OBPResolvedSurface.tsx src/app/client/obp/obp.module.scss public/locales/menulist.ai/en-US.json public/locales/menulist.ai/hi-IN.json scripts/verification/verify-public-truth-check.js scripts/verification/verify-public-business-truth.js __docs__/menulist-tools/public-truth-tools/README.md __docs__/menulist-tools/public-truth-tools/public-truth-tools_impl.md __docs__/menulist-tools/public-truth-tools/public-truth-tools_firebase.md __docs__/menulist-tools/public-truth-tools/public-truth-tools_mobile-support.md __docs__/menulist-tools/public-truth-check/public-truth-check_validation.md __docs__/menulist-tools/public-truth-check/public-truth-check_mobile-support.md __docs__/official-business-page/official-business-page_impl.md __docs__/official-business-page/official-business-page_firebase.md __docs__/owner-business-assistant/owner-business-assistant_impl.md __docs__/owner-business-assistant/owner-business-assistant_architecture.md __docs__/menulist-seo-launch/menulist-seo-launch_consultant-ledger.md __docs__/menulist-seo-launch/menulist-seo-launch_action-register.md __docs__/changelog.md
npm run verify:public-truth-check
node scripts/verification/verify-public-business-truth.js
npm run verify:owner-business-assistant
npm run lint -- --file src/lib/public-truth-tools/ownerPublicTruthReadiness.ts --file src/components/templates/main-app/businessSettings/tabs/GoogleListingGuide.tsx --file src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx --file src/app/client/obp/OBPResolvedSurface.tsx
node - <<'NODE'
const fs=require('fs');
for (const f of ['public/locales/menulist.ai/en-US.json','public/locales/menulist.ai/hi-IN.json']) {
  JSON.parse(fs.readFileSync(f,'utf8'));
}
console.log('Touched locale JSON parsed');
NODE
npx tsc --noEmit --incremental false --pretty false
```

### Result

| Check | Result |
| --- | --- |
| Diff whitespace check | Pass |
| Public Truth verifier | Pass |
| Public business truth verifier | Pass |
| Owner Business Assistant hardening verifier | Pass |
| Focused lint | Pass |
| Touched locale JSON parse | Pass |
| Full TypeScript | Blocked by pre-existing media-admin worktree errors in `src/database/storage/uploadBase64MediaImageAdmin.ts` and untracked `src/lib/media/prepareMediaImageAdmin.ts` |

### Notes

- No Firebase rules, indexes, or Cloud Function logic changed, so no Firebase deploy was required.
- No Vercel deploy was run.
- The TypeScript blocker is unrelated to this SEO/OBP/Public Truth pass and was left untouched.

---

## June 30, 2026 - AI/Search Discovery Refresh Verification

### Trigger

Founder asked for current web research around search and AI discovery because the market is changing quickly, and asked Codex to do the valid work while keeping public snapshots out of scope.

### Scope

- Primary-source review of Google AI/search guidance, structured data policy, OpenAI crawler docs, IndexNow, and current AI crawler docs.
- Named crawler allowlist and public/tenant robots parity.
- Public menu JSON-LD identity and language signals.
- SEO launch action register, consultant ledger, and main website SEO/AEO docs.
- Live host refresh for the current canonical-host blocker.

### Checks Performed

```bash
curl -sSI https://menulist.ai/
curl -sSI https://menulist.ai/robots.txt
curl -sSI https://menulist.ai/sitemap.xml
curl -sSI https://menulist.online/
curl -sS https://menulist.ai/
curl -sS https://menulist.ai/robots.txt
curl -sS https://menulist.ai/sitemap.xml
curl -sS https://menulist.online/robots.txt
curl -sS https://menulist.online/sitemap.xml
git diff --check -- src/lib/seo/discoveryPolicy.ts public/robots.txt src/app/client/robots.ts src/app/client/robots/route.ts 'src/app/client/[[...slug]]/page.tsx' __docs__/main-website/main-website_seo-aeo.md __docs__/main-website/main-website_resources-plan.md __docs__/main-website/main-website_seo-aeo-marketing-brief.md __docs__/menulist-seo-launch/menulist-seo-launch_action-register.md __docs__/menulist-seo-launch/menulist-seo-launch_code-readiness-checklist.md __docs__/menulist-seo-launch/menulist-seo-launch_consultant-ledger.md
npm run verify:agent-readiness
npm run lint -- --file src/lib/seo/discoveryPolicy.ts --file src/app/client/robots.ts --file src/app/client/robots/route.ts --file 'src/app/client/[[...slug]]/page.tsx'
npx tsc --noEmit --incremental false --pretty false
```

### Result

All code-side verification passed.

Live host checks still show the same owner/deployment blocker:

- `https://menulist.online/` returns the MenuList app and emits `https://menulist.ai` as the canonical URL.
- `https://menulist.online/robots.txt` returns the repo public robots policy and advertises `Sitemap: https://menulist.ai/sitemap.xml`.
- `https://menulist.online/sitemap.xml` returns platform sitemap URLs under `https://menulist.ai`.
- `https://menulist.ai/` returns a static `/lander` redirect shell.
- `https://menulist.ai/robots.txt` returns a minimal shell robots file.
- `https://menulist.ai/sitemap.xml` lists only `https://menulist.ai/lander`.

### Remaining SEO/Discovery Blockers

- Search Console verification, sitemap submission, and URL inspection remain blocked until `menulist.ai` serves the MenuList app or the canonical host strategy is deliberately changed.
- IndexNow remains deferred until host/key strategy, publish triggers, abuse limits, and noindex gates are designed.
- No public snapshot/CDN implementation was added in this pass.

---

## June 23, 2026 - Placeholder-Backed Service Industry Route Verification

### Trigger

Founder approved adding demo placeholders so Codex could proceed past the pending demo public pages/screenshots/videos gate before salon/spa/service-list SEO pages.

### Scope

- New placeholder-backed industry routes:
  - `/industries/salons-spas`
  - `/industries/service-list-businesses`
  - `/industries/local-service-businesses`
- Placeholder SVG assets under `public/images/website/demo-placeholders/`.
- Platform discovery registry, static sitemap, `llms.txt`, and `llms-full.txt`.
- SEO launch and marketing-distribution docs.

### Checks Performed

```bash
git diff --check
npm run verify:agent-readiness
npm run verify:website-resource-locales
npx tsc --noEmit --incremental false --pretty false
npm run lint
npx next dev -p 3033
# local HTTP/text smoke for the three new industry routes and four SVG assets
# browser desktop/mobile render checks for title/H1, placeholder image loading,
# placeholder label visibility, and horizontal overflow
```

### Result

All final checks passed.

The first local text-smoke probe used full H1 strings and falsely failed two routes because the website headline component splits highlighted text. The corrected probe used stable title/body/image strings and passed.

Browser checks passed for all three new routes on desktop/default width and `390 x 844` mobile width:

- expected page title present;
- expected H1 present;
- placeholder SVG image present and loaded;
- `Placeholder proof asset` label visible;
- no horizontal overflow.

### Remaining SEO/Discovery Blockers

- Placeholder assets still need approved routed screenshots/videos or permissioned proof before broad campaign use.
- Production host alignment remains blocked before Search Console: the chosen canonical host must serve the MenuList app consistently with sitemap/canonical URLs.
- Search Console verification/submission/URL inspection remains owner-side and should wait for host alignment/deploy.

---

## June 23, 2026 - Full Session Verification Refresh

### Trigger

Founder asked Codex to cross-check everything done in the whole session.

### Scope

- SEO launch docs and action register.
- Public website discovery policy, robots, middleware noindex headers, and verifier updates.
- Public tenant stale menu slug metadata/canonical behavior.
- WhatsApp-first marketing/distribution docs that affect future SEO/content route decisions.
- Public claim boundaries in website/docs/LLM context.

### Checks Performed

```bash
git diff --check
npm run verify:env-targets
npm run verify:agent-readiness
npm run verify:website-resource-locales
npm run verify:public-business-truth
npx tsc --noEmit --incremental false --pretty false
npm run lint
# plus markdown relative-link checker for touched SEO and marketing docs
# plus live endpoint refresh for menulist.online and menulist.ai
```

### Result

All commands passed.

Additional consistency checks confirmed:

- Messaging-onboarding app and Functions flags remain enabled for MenuList.
- `/whatsapp` still uses the supplied test number and is still gated before production traffic.
- New WhatsApp SEO/content briefs do not create routes and keep route expansion behind proof assets.
- Stale public menu slug and item/category detail paths now remain customer recovery surfaces while emitting `noindex, follow`.
- Auth/internal pages and paths are covered by metadata, middleware `X-Robots-Tag`, robots/discovery policy, and verifier checks.
- Markdown relative links in the touched SEO and marketing-distribution docs resolve.
- Live endpoint refresh still shows the production host alignment blocker: `menulist.online` serves app discovery while advertising `menulist.ai`, and `menulist.ai` still serves the `/lander` shell.

### Remaining SEO/Discovery Blockers

- Production host alignment remains blocked: Search Console should wait until the chosen production host serves the MenuList app consistently with canonical/sitemap URLs.
- Country/channel SEO pages remain deferred until proof assets, localized copy, intake path, and claim review exist.
- WhatsApp child SEO pages remain deferred until production CTA, screenshots, and pilot questions justify them.

---

## June 23, 2026 - Pending SEO Cross-Check And Stale Menu Noindex Fix

### Trigger

Founder asked whether anything was still pending and asked Codex to cross-check and do the needed work.

### Scope

- SEO launch action register pending-state review.
- Public tenant sitemap and metadata gate review.
- Stale or deleted project/menu slug behavior.
- Worktree status and verification coverage.
- Current live host/discovery endpoint behavior.

### Finding Fixed

The public tenant route intentionally keeps a customer fallback ladder when a requested project/menu slug no longer resolves, so old QR links and PWA entry points can guide customers back to `/menu`, outlet OBP, or brand OBP. The metadata path did not distinguish that stale project URL from an OBP when no project resolved, which could let a soft-not-found URL inherit indexable OBP metadata.

Fix:

- `src/app/client/[[...slug]]/page.tsx` now detects missing project paths and stale item/category detail paths during metadata generation.
- Missing project/menu slug paths emit `noindex, follow`.
- The canonical for a missing project path falls back to the tenant root or outlet root instead of the stale requested URL.
- Stale item/category detail paths emit `noindex, follow` and canonicalize to the current menu page.
- The visible customer fallback ladder remains unchanged.
- `scripts/verification/verify-agent-readiness.js` now checks the stale public menu and detail noindex guards.

### Checks Performed

```bash
git diff --check
npm run verify:agent-readiness
npm run verify:website-resource-locales
npx tsc --noEmit --incremental false --pretty false
npm run lint
```

### Live Host Refresh

After the code/doc fix, live endpoint checks still showed the same owner/deployment blocker:

- `https://menulist.online/robots.txt` returned `200` and advertised `Sitemap: https://menulist.ai/sitemap.xml`.
- `https://menulist.online/sitemap.xml` returned `200` and its first `<loc>` was `https://menulist.ai`.
- `https://menulist.online/client/sitemap.xml` returned `301` to `/`, which is expected because tenant sitemap access is via tenant-host `/sitemap.xml`, not direct platform `/client/sitemap.xml`.
- `https://menulist.ai/` returned `200` with the `/lander` shell, so Search Console remains blocked until production hosting is aligned.

### Pending After This Fix

- Code-side stale menu soft-index risk is fixed.
- Production host alignment remains blocked by owner/deployment/DNS: `menulist.ai` must serve the MenuList app before Search Console.
- Search Console verification/submission/URL inspection remains owner-side and should wait for host alignment.
- Demo public pages/screenshots/videos remain the next blocker before salon/spa/service-list SEO page expansion.
- Production WhatsApp destination, consent/tracking, and launch proof assets remain marketing-distribution blockers, not SEO code blockers.

---

## June 23, 2026 - External Technical SEO Audit Validation

### Trigger

Founder pasted an external ChatGPT response listing pending technical SEO risks before launch and asked Codex to check it against the current MenuList codebase and live surface.

### Scope

- Live discovery endpoints and canonical host behavior.
- Auth/internal noindex behavior.
- Platform robots/discovery disallow policy.
- `/create-menu` indexability decision.
- SEO launch operating docs and verifier coverage.

### Checks Performed

```bash
curl -sSI https://menulist.online/robots.txt
curl -sSI https://menulist.online/sitemap.xml
curl -sSI https://menulist.online/client/sitemap.xml
curl -sSI https://www.menulist.online/
curl -sSI https://menulist.ai/robots.txt
curl -sS https://menulist.online/robots.txt
curl -sS https://menulist.online/sitemap.xml
curl -sS https://menulist.online/ | rg "canonical|menulist.ai|menulist.online"
curl -sS "https://menulist.online/signin?callbackUrl=%2Fdashboard" | rg "robots|canonical|Authentication"
curl -sS https://menulist.online/create-menu | rg "Create Your Official Customer Link|Checking your account|canonical"
git diff --check
npm run verify:agent-readiness
npm run verify:website-resource-locales
npx tsc --noEmit --incremental false --pretty false
npm run lint
npx next dev -p 3024
node - <<'NODE'
const routes = [
  '/signin?callbackUrl=%2Fdashboard',
  '/forgot-password',
  '/dashboard',
  '/api/health-check-seo-noindex-test',
  '/client',
  '/create-menu/success',
];
(async () => {
  for (const route of routes) {
    const res = await fetch(`http://localhost:3024${route}`, { redirect: 'manual' });
    console.log(`${route} -> ${res.status} x-robots=${res.headers.get('x-robots-tag') || '(missing)'} location=${res.headers.get('location') || ''}`);
  }
})().catch((err) => { console.error(err); process.exit(1); });
NODE
```

### Results

- External claim that `menulist.online` robots and sitemap endpoints return internal errors was not current: `/robots.txt` and `/sitemap.xml` returned 200 in live checks.
- Real blocker found: `menulist.online` serves the app but emits `menulist.ai` canonical/sitemap URLs, while `menulist.ai` currently serves a `/lander` shell. Search Console should wait until the chosen canonical host serves the app.
- Historical conclusion at the time: `/create-menu` was treated as an
  indexable public landing page. The August 2 host split supersedes this:
  marketing-host `/create-menu` redirects to the canonical app host, and the
  app-host onboarding route is `noindex`.
- `/signin` and `/forgot-password` now define explicit noindex/nofollow metadata.
- Middleware now emits `X-Robots-Tag: noindex, nofollow` for auth, app, account, billing, settings, API, direct internal client, create-menu success, and preview paths.
- Platform robots/discovery policy now includes the missing auth/internal disallow prefixes.
- `verify:agent-readiness`, `verify:website-resource-locales`, TypeScript, lint, and `git diff --check` passed.
- Local runtime header probe on `http://localhost:3024` confirmed `X-Robots-Tag: noindex, nofollow` for `/signin`, `/forgot-password`, `/dashboard`, `/api/*`, `/client` redirect, and `/create-menu/success`.

### Readiness Decision

The confirmed code-side noindex gap is fixed. Historical note: this pass was written before the owner finalized the host split. Current repo contract is `menulist.ai`/`www` for the production website, `app.menulist.ai` for the production owner app, `*.menulist.online` for production customer menus/OBP, `menulist.digital`/`www` for the QA website, `app.menulist.digital` for the QA owner app, and `*.menulist.digital` for QA customer tests. The later June 23 pending cross-check fixed the stale public menu soft-index risk by noindexing missing project slug fallback pages while preserving the customer fallback ladder.

---

## June 22, 2026 - Final Code-Side Readiness Pass

### Trigger

Founder asked to cross-check the broad-SMB SEO/runtime copy work and make it ready before moving to non-code setup.

### Scope

- Broad-SMB public website metadata and homepage copy.
- `/create-menu` official-customer-link metadata and broad source-language copy.
- Pricing/customer-link copy continuity.
- Static discovery files: `robots.txt`, `sitemap.xml`, `llms.txt`, and `llms-full.txt`.
- SEO launch docs and verifier coverage.

### Checks Performed

```bash
node - <<'NODE'
const fs=require('fs');
for (const f of ['public/locales/menulist.ai/en-US.json','public/locales/menulist.ai/hi-IN.json']) {
  JSON.parse(fs.readFileSync(f,'utf8'));
  console.log(`${f} parsed`);
}
NODE
rg -n "Businesses lists|One Official Menu Source|official menu source preview|Business menus on the internet|Your menu should help customers|One menu for the places|official menu leaves|Update your menu by message|Turn your current menu into|Upload your menu →|Upload your current menu|health check for your menu|AI-powered|rank #1|guaranteed SEO|Google refresh|revenue lift" src/constants/menulist/website.ts src/components/website/Footer.tsx public/locales/menulist.ai/en-US.json public/locales/menulist.ai/hi-IN.json __docs__/main-website/README.md __docs__/main-website/main-website_content.md __docs__/main-website/main-website_impl.md __docs__/menulist-seo-launch public/llms.txt public/llms-full.txt
npm run verify:agent-readiness
npm run verify:website-resource-locales
npx tsc --noEmit --incremental false --pretty false
npm run lint
git diff --check
npx next dev -p 3023
node - <<'NODE'
const routes=['/','/pricing','/create-menu','/features','/robots.txt','/sitemap.xml','/llms.txt','/llms-full.txt'];
(async()=>{
  for (const route of routes) {
    const res=await fetch(`http://localhost:3023${route}`, { redirect: 'manual' });
    const text=await res.text();
    console.log(`${route} ${res.status} ${text.length}`);
    if (res.status !== 200) throw new Error(`${route} expected 200, got ${res.status}`);
    if (route==='/' && !text.includes('official customer link')) throw new Error('homepage missing official customer link');
    if (route==='/' && !text.includes('Urban Glow Studio')) throw new Error('homepage missing broad-SMB demo proof');
    if (route==='/create-menu' && !text.includes('Create Your Official Customer Link')) throw new Error('create-menu title missing');
    if (route==='/create-menu' && !/menu, catalogue, price-list, or service-list/i.test(text)) throw new Error('create-menu missing broad source metadata');
    if (route==='/pricing' && !text.includes('official customer link')) throw new Error('pricing missing official customer link');
    if (route==='/robots.txt' && !text.includes('Sitemap: https://menulist.ai/sitemap.xml')) throw new Error('robots missing sitemap');
    if (route==='/sitemap.xml' && !text.includes('https://menulist.ai/')) throw new Error('sitemap missing canonical domain');
    if (route==='/llms.txt' && !text.includes('Search engines and AI systems decide')) throw new Error('llms claim boundary missing');
    if (route==='/llms-full.txt' && !text.includes('guaranteed SEO')) throw new Error('llms-full boundary missing');
  }
})().catch(err=>{ console.error(err); process.exit(1); });
NODE
```

### Results

- Locale JSON parse passed for `en-US` and `hi-IN`.
- Targeted stale-copy and claim-boundary scan found only negative policy/documentation boundary language, not positive public ranking, revenue, Google-refresh, or AI-SEO claims.
- `npm run verify:agent-readiness` passed.
- `npm run verify:website-resource-locales` passed.
- `npx tsc --noEmit --incremental false --pretty false` passed.
- `npm run lint` passed.
- `git diff --check` passed.
- Fresh dev server smoke passed on `http://localhost:3023`:
  - `/` -> 200, includes official customer-link copy and `Urban Glow Studio` service-list proof.
  - `/pricing` -> 200, includes official customer-link copy.
  - `/create-menu` -> 200, includes `Create Your Official Customer Link` and menu/catalogue/price-list/service-list metadata language.
  - `/features` -> 200.
  - `/robots.txt` -> 200, includes `https://menulist.ai/sitemap.xml`.
  - `/sitemap.xml` -> 200, includes canonical `https://menulist.ai/` URLs.
  - `/llms.txt` -> 200, includes claim boundary language.
  - `/llms-full.txt` -> 200, includes SEO guarantee boundary language.

### Final Browser Readiness Addendum

After the first static pass, Chrome exposed three runtime readiness issues that static scans missed:

- `en-GB` negotiation could still override fixed `en-US` broad-funnel copy on the homepage and `/create-menu`.
- Plain headless Chrome `--window-size=390` used a 500px layout viewport, so mobile screenshots needed Chrome DevTools mobile emulation instead.
- The first-load mobile consent banner could cover first-fold actions.

Fixes applied:

- Synced visible `en-GB` homepage and create-menu funnel overrides to the broad customer-link/list source.
- Shortened homepage hero and consent copy, compacted the shared consent banner, and tightened only mobile homepage hero spacing/actions.
- Broadened the pricing proof row to `No scattered list files`.

Final verification:

- All `52` MenuList locale JSON files parsed.
- English/Hindi Website namespace parity passed with `2778` keys each, `0` missing, `0` extra.
- HTTP/text smoke passed on `http://127.0.0.1:3000` for `/`, `/create-menu`, `/get-started`, `/pricing`, `/features`, `/features/official-business-page`, `/robots.txt`, `/sitemap.xml`, and `/llms.txt` under `en-GB` negotiation.
- Chrome DevTools mobile emulation passed at `390x844` for `/`, `/create-menu`, and `/pricing`: `innerWidth`, `documentElement.clientWidth`, `documentElement.scrollWidth`, and `body.scrollWidth` all stayed `390`.
- Final screenshots were saved in `tmp/readiness-smoke/`: `home-desktop.png`, `home-mobile.png`, `create-menu-mobile.png`, and `pricing-mobile.png`.

### Readiness Decision

Code-side readiness is clear for this SEO/runtime copy pass. Non-code setup remains separate: Search Console, Bing Webmaster Tools, IndexNow decisions, directory submissions, external audit work, production build, Vercel deployment, and Firebase deployment were not run. Authenticated upload -> preview -> claim/publish remains a separate runtime E2E before Product Hunt, paid traffic, or assisted-setup outreach.

---

## June 22, 2026 - Broad SMB Website Runtime Copy Check

### Trigger

Founder clarified that MenuList should not target one single market and that the public website should make restaurants, cafes, salons, spas, and similar list-driven SMBs feel included without becoming generic software.

### Files Reviewed / Updated

- `src/data/shared/businessTypes.ts`
- `src/lib/schema/index.ts`
- `src/constants/menulist/website.ts`
- `src/components/website/Footer.tsx`
- `public/locales/menulist.ai/en-US.json`
- `public/locales/menulist.ai/hi-IN.json`
- `__docs__/main-website/README.md`
- `__docs__/main-website/main-website_content.md`
- `__docs__/main-website/main-website_impl.md`
- `__docs__/menulist-seo-launch/menulist-seo-launch_consultant-ledger.md`
- `__docs__/menulist-seo-launch/menulist-seo-launch_action-register.md`

### Findings Fixed

1. **Runtime metadata still sounded narrower than the broad-SMB strategy**
   - Shared website title and preview alt text now use official customer-link language for menus and services.

2. **Footer AI-summary prompt still described MenuList as only a menu source**
   - Prompt now describes one owner-approved menu, service list, price list, or catalogue source becoming an official customer link.

3. **Homepage proof leaned too food-menu-specific in core sections**
   - English/Hindi homepage copy now uses current list, public list, service list, official customer link, and broader call/order/book action language.
   - Hero visual proof now uses a salon/spa-style service-list example so the first viewport does not trap the product as restaurant-only.

4. **Code did not need data/schema changes**
   - `businessTypes.ts` and schema generation already support non-food SMBs and non-food offer catalogs.

### Verification Commands

```bash
node - <<'NODE'
const fs=require('fs');
for (const f of ['public/locales/menulist.ai/en-US.json','public/locales/menulist.ai/hi-IN.json']) {
  JSON.parse(fs.readFileSync(f,'utf8'));
  console.log(`${f} parsed`);
}
NODE
rg -n "Businesses lists|One Official Menu Source|official menu source preview|Business menus on the internet|Your menu should help customers|One menu for the places|official menu leaves|Update your menu by message|Turn your current menu into|Upload your menu →|Upload your current menu|health check for your menu" src/constants/menulist/website.ts src/components/website/Footer.tsx public/locales/menulist.ai/en-US.json public/locales/menulist.ai/hi-IN.json __docs__/main-website/README.md __docs__/main-website/main-website_content.md __docs__/main-website/main-website_impl.md __docs__/menulist-seo-launch
npm run verify:agent-readiness
npm run verify:website-resource-locales
npx tsc --noEmit --incremental false --pretty false
npm run lint
git diff --check
```

### Results

- Locale JSON parse passed for `en-US` and `hi-IN`.
- Targeted stale-copy scan returned no matches.
- `npm run verify:agent-readiness` passed.
- `npm run verify:website-resource-locales` passed.
- `npx tsc --noEmit --incremental false --pretty false` passed.
- `npm run lint` passed.
- `git diff --check` passed.

---

## June 22, 2026 - Broad SMB Scope Docs Check

### Trigger

Founder clarified that MenuList should not target one market only. Restaurants, cafes, salons, spas, and similar SMBs should all be treated as valid launch proof categories where a current customer-facing menu, service list, package list, price list, rate card, catalog, or offering list matters.

### Files Reviewed / Updated

- `__docs__/menulist-seo-launch/README.md`
- `__docs__/menulist-seo-launch/menulist-seo-launch_research-brief-2026-06-22.md`
- `__docs__/menulist-seo-launch/menulist-seo-launch_action-register.md`
- `__docs__/menulist-seo-launch/menulist-seo-launch_consultant-ledger.md`
- `__docs__/main-website/main-website_seo-aeo-marketing-brief.md`
- `__docs__/menulist-marketing-distribution/`
- `__docs__/changelog.md`

### Findings Fixed

1. **SEO docs could still read restaurant-first by default**
   - Added explicit broad customer-facing SMB market scope.
   - Recorded restaurants/cafes and salons/spas as proof categories, not product limits.

2. **Current website route inventory could be mistaken for market strategy**
   - Main website SEO brief now states that current food/menu industry routes are implementation truth, not the full market boundary.
   - Future salon/spa/service-list pages are queued only after demo proof, workflow depth, screenshots, and CTA path exist.

3. **Crowded-market positioning needed to be durable**
   - Recorded that MenuList must avoid sounding like another QR menu tool, restaurant website builder, generic digital-menu maker, link-in-bio page, social/PDF workaround, or local-agency setup offer.
   - Locked the broad line: current customer-facing list -> one official customer link.

### Verification Commands

```bash
git diff --check
```

TypeScript was not run because this pass changed documentation and operating process only.

---

## June 22, 2026 - Code-Side SEO Cross-Check

### Trigger

Founder asked to cross-check everything after the MenuList SEO launch workstream was created and the sequence was changed to code-side work first, non-code setup later.

### Files Reviewed

- `__docs__/menulist-seo-launch/README.md`
- `__docs__/menulist-seo-launch/menulist-seo-launch_research-brief-2026-06-22.md`
- `__docs__/menulist-seo-launch/menulist-seo-launch_code-readiness-checklist.md`
- `__docs__/menulist-seo-launch/menulist-seo-launch_action-register.md`
- `__docs__/menulist-seo-launch/menulist-seo-launch_consultant-ledger.md`
- `__docs__/main-website/README.md`
- `__docs__/main-website/main-website_content.md`
- `__docs__/main-website/main-website_design-system.md`
- `__docs__/main-website/main-website_seo-aeo-marketing-brief.md`
- `__docs__/changelog.md`
- `public/llms.txt`
- `public/llms-full.txt`
- `public/locales/menulist.ai/*.json`
- `public/sitemap.xml`
- `public/robots.txt`
- `src/app/(website)/create-menu/page.tsx`
- `src/constants/menulist/website.ts`
- `src/lib/seo/discoveryPolicy.ts`
- `src/lib/seo/publicTruthIndexing.ts`
- `src/app/sitemap.ts`
- `src/app/client/sitemap.ts`
- `src/app/client/robots.ts`
- `src/app/client/[[...slug]]/page.tsx`
- `src/components/website/SchemaMarkup.tsx`
- `src/components/website/WebsitePageStructuredData.tsx`
- `scripts/verification/verify-agent-readiness.js`
- `scripts/verification/verify-website-resource-locales.js`

### Findings Fixed

1. **Stale website content note**
   - `main-website_content.md` still allowed `AI-powered. Owner-approved.` for AI Menu Manager.
   - Fixed by changing the current content rule to approval-based language and explicitly banning `AI-powered` public shorthand.

2. **Stale launch priority order**
   - The research brief still listed Search Console verification as the first launch priority.
   - Fixed by moving code-side readiness and page review ahead of Search Console, with Search Console queued for non-code setup.

3. **Public claim boundary copy**
   - Public AI Menu Manager locale copy and LLM context wording had positive `AI-powered` shorthand.
   - Fixed by replacing it with approval-based language while preserving the `AI Menu Manager` product name.

4. **Create Menu SEO copy alignment**
   - The current worktree also includes `/create-menu` metadata and public copy changes toward official-customer-link positioning.
   - Cross-check found the title, description, page structured data, locale copy, `llms.txt`, `main-website_content.md`, and `main-website_seo-aeo.md` aligned with that positioning.

### Checks Performed

| Check | Result |
| --- | --- |
| Public Website namespace blocked-copy scan | No blocked `AI-powered`, ranking, traffic-growth, revenue-lift, or Google-refresh public website copy hits |
| Static sitemap bad URL scan | `158` URLs, no `www`, `/product`, private route, preview, auth, API, or tenant-demo URLs |
| Static sitemap duplicate scan | `0` duplicates |
| Discovery policy coverage in static sitemap | `30` discovery paths, all present |
| Robots policy scan | Required disallows, `llms.txt`, `llms-full.txt`, and sitemap present; no `www.menulist.ai` |
| Public tenant indexing policy review | Tenant sitemap and metadata use `evaluatePublicTruthIndexability` before index/sitemap inclusion |
| Structured data review | Homepage/page wrappers use canonical `MENULIST_SITE_URL`; no fake FAQ/review/rating additions were made |
| Locale JSON parse | Passed |
| SEO/AEO verifier | Passed `npm run verify:agent-readiness` |
| Resource locale verifier | Passed `npm run verify:website-resource-locales` |
| TypeScript | Passed `npx tsc --noEmit --incremental false --pretty false` |
| Whitespace diff check | Passed `git diff --check` |

### Non-Scope Dirty Worktree Items

These were present in the dirty worktree and were not treated as SEO launch work in this cross-check:

- `src/components/website/home/HeroSection.tsx`
- `src/styles/website.css`
- `src/components/shared/publicCookieConsent/PublicCookieConsentBanner.module.css`
- `routes-manifest.json`
- `tmp/`

### Verification Commands

```bash
npm run verify:agent-readiness
npm run verify:website-resource-locales
npm run verify:website-public-copy-boundary
node - <<'NODE'
const fs=require('fs');
const path='public/locales/menulist.ai';
for (const f of fs.readdirSync(path)) {
  if (f.endsWith('.json')) JSON.parse(fs.readFileSync(`${path}/${f}`,'utf8'));
}
console.log('MenuList locale JSON parsed');
NODE
node - <<'NODE'
const fs=require('fs');
const path='public/locales/menulist.ai';
const hits=[];
for (const f of fs.readdirSync(path).filter(f=>f.endsWith('.json')).sort()) {
  const data=JSON.parse(fs.readFileSync(`${path}/${f}`,'utf8'));
  const stack=[['Website', data.Website || {}]];
  while (stack.length) {
    const [p,v]=stack.pop();
    if (typeof v === 'string') {
      if (/AI-powered|AI powered|rank #?1|best QR menu|traffic growth|revenue lift|Google refresh/i.test(v)) hits.push(`${f}:${p}:${v}`);
    } else if (v && typeof v === 'object') {
      for (const [k,val] of Object.entries(v)) stack.push([`${p}.${k}`, val]);
    }
  }
}
if (hits.length) {
  console.error(hits.join('\n'));
  process.exit(1);
}
console.log('No blocked Website namespace copy hits');
NODE
git diff --check
npx tsc --noEmit --incremental false --pretty false
```

### Known Follow-Up

- Keep Search Console, Bing Webmaster Tools, IndexNow, directory submissions, and outside audits queued until the founder starts non-code setup.
- Pre-existing `Smart`/`Smart Picks` wording exists in older/unmounted website components and shared locale/runtime strings. It was not renamed in this SEO pass because that may affect product terminology outside public launch SEO copy.
