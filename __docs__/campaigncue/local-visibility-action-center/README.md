# Local Visibility Action Center

**Status:** Implemented and locally verified; authenticated owner QA remains pending

The Local Visibility Action Center turns already-loaded CampaignCue truth into a short, ordered list of local visibility actions. It tells an SMB owner what is missing, what needs review, and what is ready without pretending to audit a live Google, WhatsApp, website, or social profile.

CampaignCue does not inspect external profiles, scrape search results, claim rankings, or update provider accounts. Owners review and use handoff material manually.

## Runtime Shape

`Business Brain + current source inputs + approved assets + current Campaign Packs + locations -> deterministic visibility actions -> owner fixes source truth or opens a manual handoff`

The projection is built by `src/lib/campaigncue/localVisibility.ts` from the existing workspace overview. It adds no collection, listener, query, Storage object, model call, or provider request.

## Documents

- [Specification](./local-visibility-action-center_spec.md)
- [Implementation](./local-visibility-action-center_impl.md)
- [Firebase](./local-visibility-action-center_firebase.md)
- [Mobile](./local-visibility-action-center_mobile-support.md)
- [Tests](./local-visibility-action-center_test-cases.md)
- [Help](./local-visibility-action-center_helpdoc.md)
- [Marketing](./local-visibility-action-center_marketing.md)
- [Website](./local-visibility-action-center_website.md)
- [Validation](./local-visibility-action-center_validation.md)
