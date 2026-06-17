# Visual Profile Completion Test Cases

## Helper

- No cover, no photos returns `Needs attention`.
- Cover only marks main photo complete and business photos missing.
- Required number of gallery photos marks business photos complete.
- Empty strings in `photos[]` are ignored.
- Missing category still returns a stable category fallback.
- Project summaries absent omit the menu/service image task.
- Active project with `projectImage` marks menu/service image task complete.
- Special menu-only project does not satisfy menu/service image task.

## Desktop

- Feature flag enabled shows the card in Official Page settings.
- Feature flag disabled hides the card.
- Changing the cover field updates the card before save.
- Adding/removing gallery photos updates the card before save.
- Existing save flow still works.

## Mobile

- Feature flag enabled shows the card in the mobile Official Page screen.
- Feature flag disabled hides the card.
- Mobile card uses already-loaded project summaries.
- No direct route or shell bypass is introduced.
- Upload, reorder, remove, and save controls still work.

## Firebase

- No new Firestore collection is created.
- No Firestore rule or index change is required.
- No Cloud Function is invoked by the card.
- No provider route is invoked by the card.
