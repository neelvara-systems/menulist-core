# Tools Hub - Implementation

**Status:** Implemented
**Local Source Gate:** `npm run verify:tools-hub`

## Runtime Files

| File | Purpose |
| --- | --- |
| `src/app/(website)/tools/page.tsx` | Feature-flagged public route |
| `src/components/website/toolsHub/ToolsHubPage.tsx` | Static hub UI and grouped tool registry |
| `src/styles/website.css` | Scoped responsive hub styles |
| `src/config/features.ts` | `ENABLE_PUBLIC_TRUTH_TOOLS_HUB` gate |
| `src/components/website/Header.tsx` | Resources dropdown and mobile resources link |
| `src/components/website/Footer.tsx` | Footer Start link |
| `src/lib/seo/discoveryPolicy.ts` | Public discovery entry |
| `public/locales/menulist.ai/en-US.json` | English hub copy |
| `public/locales/menulist.ai/hi-IN.json` | Hindi hub copy |
| `public/sitemap.xml` | Route discovery |
| `public/llms.txt` | Agent-readable route summary |
| `public/llms-full.txt` | Agent-readable URL list |
| `scripts/verification/verify-tools-hub.js` | Source gate |

## Feature Flag

```ts
ENABLE_PUBLIC_TRUTH_TOOLS_HUB: true
```

The route also requires:

```ts
ENABLE_PUBLIC_TRUTH_TOOLS: true
```

## Registry

`TOOLS_HUB_GROUPS` lives in the component because this is a static website index, not a shared runtime registry. Do not extract it into a generalized plugin system until at least two non-website surfaces need the same grouped navigation contract.

## Runtime Boundary

No report builder, API route, Firebase read/write, provider call, crawler, upload, or contact handoff is added.

The hub is allowed to:

- render static localized copy
- link to implemented tool routes
- link to `/create-menu`
- link to `/features/business-health`
- appear in header Resources navigation and footer Start navigation

The hub is not allowed to:

- fetch external URLs
- inspect Google profiles or social profiles
- submit reports
- store leads
- call AI/search providers
- mutate external platforms
- promise ranking, citations, AI visibility, or search results

## Verification

`npm run verify:tools-hub` checks:

- route exists and is feature-flagged
- component uses `Website.ToolsHubPage` locale copy
- all 13 current tool routes are listed
- no API/report/contact/runtime fetch path exists
- docs live under `__docs__/menulist-tools/tools-hub/`
- header/footer/discovery/sitemap/LLM context are wired
- English and Hindi locale keys exist
