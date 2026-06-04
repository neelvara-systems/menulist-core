# Menu Kit — Mobile Support Assessment

**Version:** 1.2
**Status:** ✅ IMPLEMENTED — Desktop ZIP flow complete, mobile Share tab assets live
**Last Updated:** June 3, 2026
**Companion:** `menu-kit_spec.md`

---

## 4-Gate Mobile Admission Test

### Gate 1: Frequency — Does the owner do this often on mobile?

**YES.** Owners share menus and social assets primarily from their phone. WhatsApp status, Instagram stories, and Google Maps uploads are all mobile-first actions. Downloading Menu Kit on mobile and directly sharing to social apps is the natural flow.

**Score:** ✅ PASS

### Gate 2: Speed — Does it need to be fast (under 10 seconds)?

**YES.** Owner wants to download Menu Kit and immediately post to WhatsApp/Instagram. The "download ZIP → open → share" flow should complete in under 15 seconds. On mobile, individual asset downloads (not ZIP) may be more natural — tap to share directly.

**Score:** ✅ PASS

### Gate 3: Touch — Is it a touch-native action?

**YES.** "Tap to download" or "Tap to share to WhatsApp" is purely touch-native. No typing, no forms, no complex interactions. Just tap → download/share.

**Score:** ✅ PASS

### Gate 4: Value — Does mobile add unique value over desktop?

**YES.** Mobile is where social sharing happens. Owner opens Menu Kit on phone → taps "Share to WhatsApp Status" → done. This is impossible on desktop. Mobile is the primary use case for social assets.

**Score:** ✅ PASS

---

## Mobile Admission: ✅ ADMITTED (4/4 gates passed)

Menu Kit is a strong mobile candidate because its primary output (social images) is consumed on mobile.

---

## Mobile-Specific Considerations

### ZIP vs Individual Downloads

On desktop, ZIP bundle makes sense (10 asset files in one download).
On mobile, ZIP is awkward — users can't easily open ZIPs on many phones.

**Mobile approach:** Instead of ZIP, show individual share/download buttons per asset. Use Web Share API for direct sharing to WhatsApp/Instagram.

```
Desktop: "Download Menu Kit" → ZIP
Mobile:  Individual buttons:
         [Share to WhatsApp] → WhatsApp Status image
         [Share to Instagram] → Instagram Story image
         [Download Print Files] → Table Tent + Single Table Card + Counter Sticker
         [Upload to Google Maps] → Google Maps image
```

### Web Share API Integration

Mobile can use `navigator.share()` to directly share images to WhatsApp/Instagram without downloading first:

```typescript
if (navigator.share && navigator.canShare) {
  const file = new File([blob], filename, { type: "image/png" });
  await navigator.share({ files: [file] });
}
```

This is the premium mobile experience — zero friction.

### Touch Targets

All buttons must be minimum 44px height (ICP compliance). Large, clear, one action per button.

---

## Inherited from Desktop

| Aspect       | Source                    | Notes                            |
| ------------ | ------------------------- | -------------------------------- |
| Auth         | NextAuth session          | Same session, no separate auth   |
| Localization | next-intl                 | Same locale, same translations   |
| Theme        | `clientThemeConfig` Redux | Same dark/light mode             |
| Store data   | Redux state               | Same store name, logo, subdomain |
| Menu URL     | Computed from subdomain   | Same URL generation              |

---

## Mobile UI Framework

- **Components:** antd-mobile
- **Styling:** Tailwind CSS
- **Icons:** react-icons/lu (Lucide) — same as desktop

---

## Current Mobile Implementation

`src/components/mobile/screens/MobileShareScreen.tsx` now exposes Menu Kit under **Print & downloads**:

- Complete Menu Kit ZIP
- Table Tent
- Single Table Card
- Counter Sticker
- Entrance Poster
- Feedback QR when feedback is enabled
- Instagram Story
- WhatsApp Status
- Google Maps image

Print files download directly. Social files use the Web Share API when available and fall back to file download.

All mobile Menu Kit and QR downloads use the same premium output tokens as desktop:
- existing store logo when available
- existing store/OBP accent color when available
- brand-color gradient/accent framing with near-black QR modules on a high-contrast white scan panel
- Premium-only visible MenuList attribution removal from already-loaded store plan context

The table tent and single table/counter card downloads use the same Print Menu Surfaces renderers as desktop through `generateMenuKitAsset()` for single-file actions and `generateMenuKit()` for the complete ZIP. Mobile Share must not fork mobile-only table tent, single-card, or QR designs; it should request the same assets and then use mobile-native share/download actions.
- no separate mobile generator or mobile-only design variant

## Mobile Implementation Notes

1. Detect mobile via `navigator.share` availability (not user agent)
2. If mobile: show the complete ZIP plus individual print/social asset buttons
3. If desktop: show "Download Menu Kit" ZIP button, with share buttons where the browser supports file sharing
4. Both paths use same generator functions and brand-token fallback order — only the delivery mechanism differs

---

**Document Signature:** Mobile Support Assessment
**Created:** February 21, 2026
