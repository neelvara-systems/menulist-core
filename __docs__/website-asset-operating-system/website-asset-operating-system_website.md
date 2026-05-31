# Website Asset Operating System - Website Content

**Audience:** Website/content review  
**Public page decision:** No public landing page now  
**Reason:** Internal infrastructure, not a market-facing product

---

## Public Website Decision

Do not create a public website, route, SEO landing page, or pricing page for Website Asset Operating System.

The current need is internal: make Codex understand and maintain MenuList/Answerlattice website assets. The architecture is productized internally, but publishing it as a public product would create product confusion and compete with future GrowthOS/KitStamp boundaries.

If this is ever shown externally, the safest first context is an Answerlattice ecosystem or engineering case study: Answerlattice keeps product knowledge truthful; AssetOS keeps product media truthful. That is different from launching a fourth broad product.

## Where It May Appear

| Surface | Allowed? | Rule |
| --- | --- | --- |
| Internal docs | Yes | This folder is the source of truth. |
| Internal package | Yes | `packages/asset-factory/` is the implementation boundary. |
| Internal changelog | Yes | Mention as docs/planning only. |
| MenuList public website | No | MenuList buyers do not need to see internal asset tooling. |
| Answerlattice public website | No | Answerlattice buyers need governed support answers, not our asset workflow. |
| MyCodex/internal reader | Yes | Internal docs may be readable through private MyCodex. |
| Public blog/case study | Later only | Prefer an Answerlattice ecosystem or engineering case study after the system works and has no product-boundary confusion. |

## If A Future Public Page Is Ever Approved

The public page must not present this as a fourth product. It should be a technical case study, Answerlattice ecosystem note, or internal workflow note only.

Draft public framing, if needed later:

- **Headline:** How Our Product Media Stays Current
- **Subheadline:** A repo-based asset contract keeps website visuals connected to product truth.
- **CTA:** None, or link to engineering note.

## Banned Public Claims

- "New product"
- "Brand automation platform"
- "AI asset studio"
- "All-in-one content engine"
- "Generate every marketing asset automatically"
- "No review needed"
- "Works for every SaaS"
- "Replaces designers/editors"

## SEO Decision

No SEO target should be created. There is no external acquisition intent for this system today.

## Content Impact

No changes are required to:

- `src/app/(website)/`;
- `src/components/website/`;
- `public/locales/menulist.ai/`;
- `src/app/sites/answerlattice/`;
- Answerlattice public copy;
- MenuList public copy.

This remains an internal tooling layer until a specific public content change is approved.
