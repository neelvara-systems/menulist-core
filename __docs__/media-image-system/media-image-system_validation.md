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
- ChatGPT's canonical identity, variant, focal point, transparency, static-animation, EXIF normalization, and immutable cache feedback is accepted and now reflected in the media profile contract.
- Minimum source dimensions are intentionally not an owner-facing rejection rule. Owner photos and downloaded reference images are accepted even when they are smaller than the final target, blurry, or have the wrong orientation; MenuList frames and prepares them internally. Only unsupported, empty, corrupt, or over-safety-cap files are rejected.
- `prepareMediaImage` now returns `mediaId`, `checksum`, `version`, `status`, primary Blob/data URL compatibility output, named variants, focal point, dominant color, EXIF normalization state, and transparency policy.
- The current DAL still persists the primary image URL in existing fields. The upload boundary is now Blob-based for profile-aware media saves, and `uploadPreparedMediaImage` uploads every prepared named variant to deterministic sibling paths. Local data URLs are preview/form-state only.
- Menu item, project image, menu background, business logo, Official Business Page business cover, Official Business Page gallery, and digital screen slide saves route through immutable `media/{profile}/{tId}/{sId}/...` Storage paths.
- Firebase Storage rules now explicitly allow known media profiles under the tenant/store-scoped `media/` path.
- Desktop and mobile item, project, background, logo, and Official Business Page photo paths now use shared media profiles or shared preparation.
- Desktop and mobile Digital Screens custom-slide uploads now use the `digitalScreenSlide` media profile.
- Project image, menu background, business logo, Official Business Page business cover, Official Business Page gallery, and Digital Screens custom-slide surfaces now use the shared `MediaImageCard` presentation shell.
- The shared image card is profile-aware: menu backgrounds show a mobile-vertical frame, project/menu-card images and digital screen slides show widescreen frames, logos show square frames, and gallery photos show 4:3 frames.
- Manual Adjust is wired only for project image, menu background, business logo, Official Business Page business cover, Official Business Page gallery, and Digital Screens custom slides.
- Item-image upload and AI generation paths stay automatic and do not expose the Adjust modal.
- Desktop logo save now only sends `imageToUpdate` for prepared base64 uploads, and the store DAL preserves non-base64 logo URLs if a caller sends one.
- Output budgets are compression targets, not owner-facing blockers. If a profile cannot hit the configured KB target, `prepareMediaImage` keeps reducing quality/dimensions and saves the best prepared result instead of making the owner find another image.
- Raw source uploads use a sane 15MB safety cap and no per-profile minimum-resolution gate; final framing, format, and compression remain profile-controlled.
- The media feature flag now has runtime behavior: when disabled, manual adjust is hidden and `prepareMediaImage` returns validated raw image data without profile crop/resize/compression.
- Rotate crop scale and drag math now account for the rotated image bounds.
- Official Business Page cover/gallery replacements/removals queue old Storage URLs and delete them after the related store save succeeds.
- Manual browser upload checks were not run in this session.
