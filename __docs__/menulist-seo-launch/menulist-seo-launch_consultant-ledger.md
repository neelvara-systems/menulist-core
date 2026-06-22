# MenuList SEO Launch Consultant Ledger

**Status:** Active  
**Created:** June 22, 2026  
**Product:** MenuList only

---

## How To Use This Ledger

Add one entry for every meaningful SEO/AEO decision, review, implementation pass, Search Console finding, indexing change, structured-data change, sitemap/robots update, public page expansion, or claim-boundary decision.

Each entry should answer:

- What was reviewed or changed?
- What evidence was checked?
- What decision was made?
- What follow-up remains?

Keep implementation details in the source docs. This ledger records the consultant view and links back to the real source of truth.

---

## Entries

### June 22, 2026 - Demo Universe Gate Added Before Service-List SEO Pages

**Trigger:** Founder asked Codex to proceed with the multi-category demo/proof universe or prepare what is needed before adding salon, spa, service-list, or local-service SEO pages.

**Decision / change:** Added `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_demo-universe.md` as the canonical proof brief. SEO page expansion now has a concrete gate: service-list and salon/spa pages should wait for demo source lists, screenshots, workflow depth, claim-boundary review, and CTA readiness.

**Evidence checked:**

- Current marketing distribution execution plan already listed demo universe creation as the next step.
- Existing main website SEO/AEO marketing brief says broad-SMB pages require concrete examples, workflows, screenshots, and CTA paths.
- Archived marketing conversation contained useful rough demo ideas, but they were not operational or linked to action IDs.

**Follow-up:** Fictional source lists and screenshot capture plan are now created. Next is Product Hunt gallery copy and short video scripts, or a founder decision to create routed demo tenants for real product screenshots.

---

### June 22, 2026 - Broad SMB Website Runtime Copy Aligned

**Trigger:** Founder clarified that MenuList must not target a single market and should visibly serve restaurants, cafes, salons, spas, and similar list-driven SMBs in a crowded digital-menu/list market.

**Decision / change:** The code-side website copy now carries the broad customer-facing list position in the live runtime layer, not only in planning docs. Shared website metadata, the footer AI-summary prompt, and primary English/Hindi homepage copy were broadened from food-menu-only examples toward menu, service list, price list, catalogue, current list, public list, and official customer link language.

**Evidence checked:**

- `src/data/shared/businessTypes.ts` already supports food, service, retail, professional, creative, health/wellness, and specialty SMB types.
- `src/lib/schema/index.ts` already supports non-food `OfferCatalog` / `service` / `product` schema behavior and only falls back to restaurant schema for food unknowns.
- `src/constants/menulist/website.ts`, `src/components/website/Footer.tsx`, and `public/locales/menulist.ai/en-US.json` / `hi-IN.json` carry the changed live website copy.

**Follow-up:** Build the MLD-A001 demo universe and proof assets before adding salon/spa/service-list SEO routes. Existing restaurant/cafe resource and industry pages remain valid proof pages when they are menu-specific.

---

### June 22, 2026 - Broad SMB Scope Locked

**Trigger:** Founder clarified that MenuList should not target one single market and should cover as many relevant SMBs as possible, including restaurants, cafes, salons, and spas, because the digital menu/list market is already crowded.

**Decision / change:** SEO planning now treats broad customer-facing SMB list truth as the market scope. Restaurants/cafes and salons/spas are proof categories, not product limits. The shared line is current customer-facing list -> one official customer link.

**Evidence checked:**

- Founder direction in this session.
- Marketing distribution strategy and execution docs that already frame broad SMB proof categories.
- Existing launch SEO claim boundaries that prevent MenuList from becoming a generic QR menu, restaurant SEO, or "AI visibility" product.

**Follow-up:** Review existing high-value pages for broad-SMB fit before creating new category pages. New salon/spa/service-list or local-service pages require real workflow depth, not keyword-only templates.

---

### June 22, 2026 - Code-Side SEO Cross-Check Completed

**Trigger:** Founder asked to cross-check everything after the SEO launch docs and code-side-first sequence were created.

**Decision / change:** Added `menulist-seo-launch_verification.md` and reconciled stale docs so code-side readiness remains ahead of Search Console and external setup.

**Evidence checked:**

- SEO launch operating docs, action register, ledger, research brief, and code-readiness checklist.
- Main website README, content, design-system, SEO/AEO marketing brief, and global changelog.
- Public locale files, `llms.txt`, `llms-full.txt`, static sitemap, robots policy, canonical constants, discovery policy, public truth indexing gate, tenant sitemap/robots, and structured data wrappers.

**Verification:** Passed:

```bash
npm run verify:agent-readiness
npm run verify:website-resource-locales
git diff --check
npx tsc --noEmit --incremental false --pretty false
```

Additional locale JSON parse and Website namespace blocked-copy scans passed.

**Follow-up:** Keep Search Console and other non-code setup queued until the founder starts that workstream. Review high-value existing pages before adding new SEO pages.

---

### June 22, 2026 - Public AI-Powered Shorthand Removed

**Trigger:** Code-side launch SEO readiness pass found public AI Menu Manager locale copy using positive `AI-powered` shorthand.

**Decision / change:** Replaced the positive public shorthand with approval-based wording across MenuList public locale packs and LLM context files. Updated main website docs so the design/content guidance no longer allows the old exception.

**Evidence checked:**

- Public locale files under `public/locales/menulist.ai/`.
- `public/llms.txt` and `public/llms-full.txt`.
- Main website design/content/SEO docs.
- SEO claim boundary that forbids broad `AI-powered` SEO or generic AI-software framing.

**Verification:** Passed after the wording update:

```bash
npm run verify:agent-readiness
npm run verify:website-resource-locales
node -e "const fs=require('fs'); const path='public/locales/menulist.ai'; for (const f of fs.readdirSync(path)) { if (f.endsWith('.json')) JSON.parse(fs.readFileSync(path+'/'+f,'utf8')); } console.log('MenuList locale JSON parsed')"
rg -n "AI-powered" public/locales/menulist.ai public/llms.txt public/llms-full.txt src/app/'(website)' src/components/website
git diff --check
npx tsc --noEmit --incremental false --pretty false
```

The public `AI-powered` scan returned no matches.

**Follow-up:** Keep future AI Menu Manager public copy approval-based: owner intent -> prepared card -> approval when needed -> existing MenuList operation -> receipt.

---

### June 22, 2026 - Code-Side-First SEO Sequence Adopted

**Trigger:** Founder clarified that MenuList should finish code-side SEO changes end to end before doing non-code setup such as Google Search Console.

**Decision / change:** Added `menulist-seo-launch_code-readiness-checklist.md` and moved Search Console tasks into an external setup queue until code-side readiness passes.

**Evidence checked:**

- Existing SEO launch operating index and action register.
- Current runtime evidence anchors for canonical constants, sitemap, robots, structured data, public tenant indexing, and SEO verifiers.
- Founder sequence preference: repo/runtime readiness first, external setup second.

**Verification:** Passed after the documentation update:

```bash
npm run verify:agent-readiness
npm run verify:website-resource-locales
git diff --check
```

TypeScript was not run because this pass changed documentation and operating process only.

**Follow-up:** Keep rerunning the code-side checklist after SEO/discovery changes. Start Search Console only when the founder starts non-code setup.

---

### June 22, 2026 - Primary-Source SEO Research Brief Added

**Trigger:** Founder asked to do web search around MenuList launch SEO, gather useful data, and add Codex's thoughts as the MenuList SEO expert.

**Decision / change:** Added a dated research brief: `menulist-seo-launch_research-brief-2026-06-22.md`.

**Evidence checked:**

- Google guidance on hiring SEOs, Search Console, SEO starter guide, generative AI Search optimization, sitemaps, robots, noindex, structured data, LocalBusiness structured data, AI-generated content, and spam policies.
- IndexNow documentation and overview.
- Existing MenuList SEO/AEO docs, discovery infrastructure docs, and the current SEO launch operating folder.

**Consultant interpretation:**

- AEO/GEO should stay an internal shorthand for search-readiness work; Google treats generative AI search optimization as normal SEO.
- `llms.txt` and `llms-full.txt` are useful for non-Google agent context and product clarity, but should not be described as Google ranking or AI Overview levers.
- Search Console is the launch measurement source.
- IndexNow/Bing Webmaster Tools may be useful later, but should not become launch P0 before Google baseline and public-truth gates are stable.

**Verification:** Documentation-only research update. Run `git diff --check` before final handoff.

**Follow-up:** Create Search Console setup checklist when owner access exists, and evaluate Bing Webmaster Tools/IndexNow after Google baseline data is available.

---

### June 22, 2026 - Launch SEO Operating Model Created

**Trigger:** Founder asked to log all MenuList SEO work productwise, maintain a dedicated docs folder, and treat Codex as the MenuList SEO consultant.

**Decision:** Accepted. MenuList launch SEO will be tracked in `__docs__/menulist-seo-launch/`, with source-truth links back to `main-website/` and `discovery-infrastructure/`.

**Consultant stance:**

- Keep SEO mostly in-house for launch.
- Use Codex as the internal technical/product SEO consultant.
- Only hire outside help for a fixed-scope audit if needed.
- Do not hire a broad agency or full marketing team before Search Console and conversion data exist.

**Evidence checked:**

- Existing main website SEO/AEO docs.
- Existing SEO/AEO marketing brief.
- Discovery infrastructure docs.
- Platform and tenant sitemap/robots/indexing code.
- Google Search Central guidance on hiring SEOs, sitemaps, robots/noindex, structured data, helpful content, and ranking guarantees.

**Verification run:**

```bash
npm run verify:agent-readiness
npm run verify:website-resource-locales
```

**Result:** Both passed on June 22, 2026.

**Follow-up:** Start Search Console owner setup and keep this ledger updated after every SEO/AEO change or review.

---

## Entry Template

```markdown
### YYYY-MM-DD - Short Title

**Trigger:** 

**Decision / change:** 

**Evidence checked:** 

**Verification:** 

**Follow-up:** 
```
