# Media Image System Spec

## Goal

MenuList must prepare every business image according to the place where it appears. The owner should not need to understand pixels, file formats, or compression.

## Product Rule

Every saved image has one media purpose. That purpose decides:

- accepted file types
- max source size
- final aspect ratio choices
- target output size
- compression quality
- public rendering behavior

## Image Profiles

| Type | Default ratio | Allowed ratios | Max source | Output target | Public target |
| --- | --- | --- | --- | --- | --- |
| Menu item | 1:1 | 1:1, 4:3 | 15MB | 1200px max | 500KB |
| Project image | 16:9 | 16:9, 1:1 | 15MB | 1600px max | 650KB |
| Menu background | 9:16 | 9:16 | 15MB | 1400px max | 800KB |
| Business logo | 1:1 | 1:1 | 15MB | 512px max | 350KB |
| Business cover | 16:9 | 16:9 | 15MB | 1600px max | 800KB |
| Digital screen slide | 16:9 | 16:9 | 15MB | 1920px max | 500KB |
| Gallery image | 4:3 | 4:3, 1:1 | 15MB | 1400px max | 700KB |

Menu cover is intentionally not a separate profile. If a menu needs a cover-like preview, use `projectImage` so menu previews, share cards, and discovery cards do not drift into separate image contracts.

Owner source images are not rejected for being below the final output size, being blurry, or having the wrong orientation. A normal downloaded reference image or phone photo is accepted, then framed inside the profile rectangle and prepared into MenuList's final dimensions and compression target. Owner-facing rejections are limited to unsupported file type, empty/corrupt image data, or the raw source safety cap.

## Canonical Prepared Image Contract

`prepareMediaImage` returns one prepared media object with stable identity and presentation metadata:

```ts
interface PreparedMediaImage {
  mediaId: string
  profile: MediaImageType
  version: number
  status: 'ready'
  checksum: string
  publicUrl?: string
  primaryVariant: MediaImageVariantId
  variants: Partial<Record<MediaImageVariantId, PreparedMediaVariant>>
  focalPoint: { x: number; y: number }
  dominantColor?: string
  blurHash?: string
}
```

Existing save flows persist the primary public URL field for compatibility, but the upload boundary is Blob-based and profile-aware. The canonical identity, version, checksum, focal point, and variant names are part of the frozen contract for future media documents, CDN migration, AI regeneration, and cleanup tooling.

Owner-facing previews must render the prepared primary output, not the raw source image. If a flow uploads immediately, the card may use the prepared local `dataUrl` as a temporary preview while Firebase Storage returns the public URL, but that `dataUrl` must not be persisted as public truth. The public screen should display the same framed/cropped visual the owner approved.

Menu background and Official Business Page business cover uploads also show a public context preview. The preview is not another editor; it renders the prepared image inside the relevant customer frame with the same readability intent as the public surface so the owner can judge the customer-facing result before saving.

## Variant Policy

Every profile has named variants even when the current UI initially saves one URL:

| Profile | Variants |
| --- | --- |
| Menu item | thumb, small, medium, large |
| Project image | card, hero |
| Menu background | mobile, desktop |
| Business logo | thumb, full |
| Business cover | card, hero |
| Digital screen slide | desktop, full |
| Gallery image | thumb, full |

Profile-aware saves upload all named variants to deterministic sibling paths. The current single persisted URL remains the profile primary variant for compatibility. Future renderers can move to the named variant URL map without changing the profile identifiers.

## Format Rules

Accepted source files:

- JPG/JPEG
- PNG
- WebP

Rejected source files:

- SVG
- GIF
- HEIC/HEIF
- PDF or non-image files

Logo output keeps PNG and preserves transparency. Transparency is removed for menu items, project images, backgrounds, business covers, digital slides, and gallery images. Other managed images prefer compact public-safe output through the shared canvas optimizer.

Animated public media is unsupported. GIF uploads are rejected, and accepted still-image formats are prepared into static outputs. Uploads are treated as static business presentation assets, not animation containers.

All prepared outputs normalize browser-decoded orientation before canvas preparation and strip source EXIF metadata by writing a new image. The media layer stores `exifNormalized: true` for prepared outputs.

## Storage Naming And Cache Rule

Prepared media outputs are immutable. A changed image must create a new path or version rather than overwrite the same public object.

Canonical future media paths follow:

```txt
media/{profile}/{tenantId}/{storeId}/{entityId}/{mediaId}_{variant}.{extension}
```

Example:

```txt
media/menuItem/t1/s1/item123/menuItem_a82bd0c2_medium.webp
```

Current legacy non-media upload paths can continue while they migrate, but profile-aware media code must use the immutable `media/{profile}/...` path.

## Focal Point Rule

Manual crop stores the owner's subject center as normalized focal point coordinates:

```ts
{ x: 0.42, y: 0.31 }
```

If the owner does not manually adjust, MenuList uses the center point. Focal point metadata is required for project images, backgrounds, covers, digital slides, and gallery assets so future responsive crops and AI-generated assets can preserve the subject.

## Owner UX

The owner sees only the controls that apply to the selected image type.

Examples:

- Menu item image: Square, Landscape
- Menu background: Mobile vertical only
- Logo: Square only
- Project image: Widescreen, Square
- Digital screen slide: Widescreen only

No generic "choose any shape" control is allowed on public-output images.

Owner-facing upload surfaces use one shared image card so placeholder, preview, upload, drag/drop, paste, replace, adjust, remove, and reset behavior stays consistent. The card is a UI shell only; media profile validation and output preparation stay in `prepareMediaImage`.

Manual Adjust is available only where owner framing control adds value without slowing everyday item work:

- Project image
- Menu background
- Business logo
- Official Business Page gallery image
- Digital screen slide
- Official Business Page business cover

The flow is upload, automatic preparation, preview, optional Adjust, then save. Adjust is profile-locked and supports drag, Fit to frame, slider zoom, two-finger pinch zoom on touch screens, rotate, and reset. Owners do not control final output size, output format, or compression.

Menu item images stay automatic. MenuList should not force owners through manual crop for every item photo.

## Alt Text Contract

Public images must have intentional alt text without asking owners to fill another field. MenuList derives it from existing source-of-truth names:

- Menu item image: item name, with category context when available.
- Project image: project/menu name.
- Business cover: business name plus cover purpose.
- Business logo: business name plus logo purpose.
- Official Business Page gallery: business name plus photo position.
- Decorative/fallback imagery: empty alt text when the image adds no information.

This follows W3C WAI guidance: informative images get concise purpose-based text alternatives, while decorative images use empty alt text.

## Public Output Rules

- Public menu item images use reserved image slots to avoid layout shift.
- Menu background images must never reduce readability.
- Logos must stay clear and should not be aggressively compressed.
- Raw originals are not served intentionally as the public presentation contract.
- Public `<img>`/`Image` usage must use derived alt text helpers rather than owner-entered fields.
- Public image enlargement uses the shared `PublicImageViewer` contract for all implemented public image-list surfaces. Official Business Page gallery thumbnails and menu item PDP images may keep different entry layouts, but the enlarged viewer behavior is shared: zoom, reset, pan, previous/next navigation, mobile swipe navigation, Escape close, and scroll lock.

## Non-Goals

- No new external image CDN vendor in this implementation.
- No dependency upgrade.
- No owner-facing advanced editor.
- No arbitrary image type creation.
