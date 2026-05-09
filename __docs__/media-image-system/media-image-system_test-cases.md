# Media Image System Test Cases

## Validation

| Case | Expected result |
| --- | --- |
| Upload JPG menu item image under 8MB | Accepted and prepared to menu item profile. |
| Upload SVG as menu item image | Rejected. |
| Upload HEIC as logo | Rejected. |
| Upload 12MB background | Rejected before save. |
| Upload 7MB background | Accepted as source, compressed to public budget. |
| Upload very small item image | Rejected with clear message. |
| Upload logo | Prepared with square output and gentler quality. |
| Upload digital screen slide | Accepted only as widescreen and prepared to the screen slide budget. |
| Upload small digital screen slide | Rejected below the minimum screen-slide resolution. |
| Select AI menu item shape | Only Square and Landscape are available. |

## Public Output

| Case | Expected result |
| --- | --- |
| Item image loads slowly | Layout slot stays reserved. |
| Item image fails | Reserved slot remains stable and no layout jump occurs. |
| Background image exists | Existing overlay/readability behavior remains active. |
| Project image appears on OBP card | Image is already prepared for project profile. |
| Digital screen custom slide appears in Highlights | Image has already been prepared for the digital screen slide profile. |
