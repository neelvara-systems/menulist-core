# Menu Link Import Website Notes

## Website Impact

Main website copy now includes owner-provided existing menu links as one setup source beside photo, PDF, and typed input. The copy is limited to source intake and review:

> Start with a photo, PDF, existing menu link, or typed menu. MenuList prepares the official customer-facing version from one owner-approved source.

Updated surfaces:

- Homepage hero subline and workflow source map.
- `/how-it-works` hero/source map/upload explanation.
- Features setup card.
- Homepage FAQ trust answers for existing menu link import and review-before-publish behavior.

The public `/create-menu` route runtime is not changed by this website pass. Menu Link Import remains an authenticated owner-app feature guarded by `ENABLE_MENU_LINK_IMPORT`.

Do not add a public "Import from menu link" CTA unless `/create-menu` supports that input directly. The public website may mention existing menu links as an owner setup source, but the conversion CTA should stay on the current upload flow until the public runtime supports link import.

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
