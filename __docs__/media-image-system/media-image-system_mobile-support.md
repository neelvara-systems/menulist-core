# Media Image System Mobile Support

## Mobile Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Owners add and replace menu images from phones. |
| Speed | Pass | Preparation happens locally before the existing save, with optional Adjust only when framing needs correction. |
| Touch | Pass | Mobile keeps simple upload/replace actions and uses a bottom-sheet adjust surface for approved profiles. |
| Value | Pass | Owners often have menu/product photos on their phone. |

## Mobile Rules

- Mobile uses the same media profiles as desktop.
- Mobile keeps the current Tailwind-driven `MobileShell` surfaces and existing sheet patterns; this feature adds no mobile UI dependency.
- Mobile does not add a complex Canva-style editor.
- Mobile preparation auto-prepares first, then exposes Adjust for project image, menu background, business logo, Official Business Page business cover, Official Business Page gallery photos, and Digital Screens custom slides.
- Mobile item images do not get a manual adjust step; the shared item-image preparation remains fast and automatic.
- Adjust supports profile-locked crop, drag, Fit to frame, slider zoom, two-finger pinch zoom on touch screens, rotate, and reset. Final resize/compression still runs through `prepareMediaImage`.
- Mobile shows customer-frame previews for menu background and Official Business Page business cover, because those images affect what customers see first.
- Touch targets remain at least 44px where actions already render as buttons.

## Mobile Surfaces Wired

- mobile project selector image
- mobile design editor background image
- mobile item edit inline image
- mobile menu item upload background save
- mobile brand logo upload
- mobile Official Business Page business cover upload/generation
- mobile Official Business Page gallery photos
- mobile Digital Screens custom slides
- mobile AI defaults ratio selector
