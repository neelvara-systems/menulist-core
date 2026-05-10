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
| Upload logo | Prepared with square output and gentler quality. |
| Upload digital screen slide | Accepted only as widescreen and prepared to the screen slide budget. |
| Upload small digital screen slide | Accepted when it is a valid image and prepared into the screen-slide frame. |
| Select AI menu item shape | Only Square and Landscape are available. |
| Upload OBP cover or gallery photo | Card immediately previews the prepared cropped output while upload runs, then persists the returned Firebase URL. |
| Upload any profile image | Owner preview uses the prepared primary image, not the raw source file. |

## Public Output

| Case | Expected result |
| --- | --- |
| Item image loads slowly | Layout slot stays reserved. |
| Item image fails | Reserved slot remains stable and no layout jump occurs. |
| Background image exists | Existing overlay/readability behavior remains active. |
| Project image appears on OBP card | Image is already prepared for project profile. |
| Digital screen custom slide appears in Highlights | Image has already been prepared for the digital screen slide profile. |
| Owner approved a prepared preview | Public screen shows the same framed/cropped visual via the persisted prepared Storage URL. |
