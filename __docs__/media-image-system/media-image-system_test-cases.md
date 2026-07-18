# Media Image System Test Cases

## Validation

| Case | Expected result |
| --- | --- |
| Upload JPG menu item image under 15MB | Accepted and prepared to menu item profile. |
| Upload SVG as menu item image | Rejected. |
| Upload HEIC as logo | Rejected. |
| Upload 12MB background | Accepted as source, framed into the mobile menu background profile, and compressed to public budget. |
| Upload 7MB background | Accepted as source, compressed to public budget. |
| Upload 16MB background | Rejected by the source safety cap. |
| Upload icon-sized valid item image | Accepted and prepared without asking the owner to find another image. |
| Upload corrupted item image | Rejected with clear message. |
| Direct SDK writes a GIF to `media/{profile}/...` | Rejected by Storage rules even for an authenticated same-store owner. |
| Upload logo | Prepared with square output and gentler quality. |
| Upload digital screen slide | Accepted only as widescreen and prepared to the screen slide budget. |
| Upload small digital screen slide | Accepted when it is a valid image and prepared into the screen-slide frame. |
| Select AI menu item shape | Only Square and Landscape are available. |
| Upload OBP cover or gallery photo | Card immediately previews the prepared cropped output while upload runs, then persists the returned Firebase URL. |
| OBP cover or gallery upload fails after preparation | Prepared preview stays visible with Retry; store field is not updated until the retry returns a Firebase URL. |
| Remove failed OBP replacement draft | Failed draft is discarded and the previously saved public image remains intact. |
| Upload any profile image | Owner preview uses the prepared primary image, not the raw source file. |
| Save a prepared image with multiple local variants | Only the selected persisted variant is uploaded; unused sibling variants cause no Storage writes. |
| Tap Fit in Adjust preview | Image recenters and zooms out until the full source fits inside the profile frame. |
| Pinch inside mobile Adjust preview | Two-finger pinch changes zoom between Fit-to-frame and 3x, matching the slider bounds. |
| Upload menu background | Owner sees the prepared image in a customer menu frame with overlay/text treatment. |
| Upload or generate business cover | Owner sees the prepared image in an Official Business Page-style frame. |
| Browser retries the same prepared content/path | Existing immutable object URL is reused; bytes are not overwritten. |
| Batch worker or prompt-cache copy retries the same deterministic path | Generation-zero create conflict verifies size, MIME and identity metadata, then reuses the existing Firebase download token. |
| Batch project save commits but job acknowledgement fails, then owner discards | Already committed media remains available; browser review does not delete Storage objects. |
| Terminal batch job reaches metadata retention | `itemsList` is pruned after seven days and the row after 30 days; public media is retained without global exclusive-reference proof. |

## Public Output

| Case | Expected result |
| --- | --- |
| Item image loads slowly | Layout slot stays reserved. |
| Item image fails | Reserved slot remains stable and no layout jump occurs. |
| Background image exists | Existing overlay/readability behavior remains active. |
| Project image appears on OBP card | Image is already prepared for project profile. |
| Digital screen custom slide appears in Highlights | Image has already been prepared for the digital screen slide profile. |
| Owner approved a prepared preview | Public screen shows the same framed/cropped visual via the persisted prepared Storage URL. |
| Public item/project/business/gallery images render | Alt text is derived from item, project, or business names; decorative images use empty alt text. |
| Tap OBP business photo thumbnail | Shared public image viewer opens with zoom, reset, pan, next/previous, mobile swipe, Escape close, and body scroll lock. |
| Tap PDP image enlarge | Same shared public image viewer opens for menu item images, supports mobile swipe, and keeps image index in sync with the PDP carousel. |
