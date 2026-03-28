# Security — Mobile Support

**Last Updated:** February 16, 2026
**Decision:** ✅ SHARED INFRASTRUCTURE — Security rules apply identically to mobile and desktop

---

## Feature Admission Test

Not applicable — security is shared infrastructure, not a separate mobile feature.

---

## How Mobile Uses Security

- **CSP headers**: Applied server-side via `next.config.js` — device-independent
- **Firestore security rules**: Apply to all clients equally — mobile uses same DAL
- **Storage rules**: Same rules for mobile uploads (MenuUploadSheet) as desktop
- **Rate limiting**: Server-side — applies to all clients
- **Login source tracking**: Logs mobile vs desktop sessions automatically
- **Session management**: NextAuth cookies — same on mobile browser/PWA

No mobile-specific security code needed. All security layers are server-side or shared infrastructure.
