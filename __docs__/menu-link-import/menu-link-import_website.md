# Menu Link Import Website Notes

## Website Impact

Main website copy now includes owner-provided existing menu links as one setup source beside photo, PDF, and typed input. The copy is limited to source intake and review:

> Start with a photo, PDF, existing menu link, or typed menu. MenuList prepares the official customer-facing version from one owner-approved source.

Updated surfaces:

- Homepage hero subline and workflow source map.
- `/how-it-works` hero/source map/upload explanation.
- Features setup card.
- Homepage FAQ trust answers for existing menu link import and review-before-publish behavior.
- Public `/create-menu` input mode beside photo upload.

The public `/create-menu` route now supports owner-provided menu links directly. The public input is guarded by `ENABLE_MENU_LINK_IMPORT`, requires the owner to confirm that the source is theirs or import-permitted, reuses the SSRF-safe acquisition helper from the authenticated owner flow, creates a temporary public draft, and still requires authenticated claim before publishing.

Website copy may mention "paste a public menu link" on `/create-menu`, but the main homepage CTA should stay "Upload your menu →" so the top-level conversion action remains simple for non-technical owners.

## Do Not Use

- "AI-powered scraper"
- "Scrape any restaurant website"
- "Automatic publishing"
- "Works with delivery apps"

## Launch Readiness Before Website Copy

- Feature flag enabled for the target rollout.
- Real owner URLs tested.
- Failure-rate and extraction-quality logs reviewed.
- Helpdoc published.
