# Media Image System Validation

## Status

Completed on May 9, 2026.

## Automated Checks

```bash
npx tsc --noEmit --incremental false
```

Result: passed.

```bash
git diff --check
```

Result: passed.

## Code Review Notes

- ChatGPT's server-side Sharp/CDN recommendation is documented as a later migration contract, not implemented now, because the current repo uses Firebase Storage and client-side DAL image preparation.
- ChatGPT's canonical identity, variant, focal point, transparency, minimum-dimension, static-animation, EXIF normalization, and immutable cache feedback is accepted and now reflected in the media profile contract.
- `prepareMediaImage` now returns `mediaId`, `checksum`, `version`, `status`, primary Blob/data URL compatibility output, named variants, focal point, dominant color, EXIF normalization state, and transparency policy.
- The current DAL still persists the primary image URL in existing fields. This preserves existing owner/public flows while keeping the prepared media contract ready for future media asset documents and variant-aware storage.
- Business logo Storage writes now use a fingerprinted nested path instead of overwriting `stores/logos/{storeId}`.
- Desktop and mobile item, project, background, logo, and Official Business Page photo paths now use shared media profiles or shared preparation.
- Desktop and mobile Digital Screens custom-slide uploads now use the `digitalScreenSlide` media profile.
- Project image, menu background, business logo, Official Business Page gallery, and Digital Screens custom-slide surfaces now use the shared `MediaImageCard` presentation shell.
- Manual Adjust is wired only for project image, menu background, business logo, Official Business Page gallery, and Digital Screens custom slides.
- Item-image upload and AI generation paths stay automatic and do not expose the Adjust modal.
- Desktop logo save now only sends `imageToUpdate` for prepared base64 uploads, and the store DAL preserves non-base64 logo URLs if a caller sends one.
- Output budgets are hard-enforced. If a profile cannot be prepared under its configured KB budget, the save fails instead of accepting an oversized best-effort output.
- The media feature flag now has runtime behavior: when disabled, manual adjust is hidden and `prepareMediaImage` returns validated raw image data without profile crop/resize/compression.
- Rotate crop scale and drag math now account for the rotated image bounds.
- Official Business Page gallery photo replacements/removals queue old Storage URLs and delete them after the related store save succeeds.
- Manual browser upload checks were not run in this session.
