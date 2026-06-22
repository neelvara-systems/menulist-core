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
