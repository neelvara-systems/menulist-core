# Hosted Offer Page And QR - Validation Ledger

**Status:** Code-complete and locally verified; authenticated publish/browser evidence remains pending

- [x] Public-safe schema and builder implemented.
- [x] Publish/unpublish transaction implemented.
- [x] Public cached route and `noindex` metadata implemented.
- [x] Owner open/copy/QR/unpublish controls implemented.
- [x] Firestore rules explicitly deny direct client access.
- [x] No visitor analytics write or cookie introduced.
- [x] Typecheck and focused tests pass.
- [x] Scoped lint, rules tests, and full CampaignCue verifier pass in the final expansion validation pass.
- [x] Campaign Pack and ZIP reflect the already-loaded live pointer without an additional Firebase read and omit public-path claims for expired/unpublished pages.
- [x] Idempotent publish replay parses the public record against current time and cannot revive an expired page in the mutation response.
- [ ] Authenticated publish and public-route browser evidence recorded.

The remaining browser item requires a configured CampaignCue Firebase project and authenticated CampaignCue workspace. It is external runtime evidence, not missing source code.
