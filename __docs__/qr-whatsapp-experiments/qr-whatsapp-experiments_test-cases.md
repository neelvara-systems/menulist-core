# QR WhatsApp Experiments Test Cases

**Status:** Docs-ready
**Last Updated:** June 25, 2026

## Docs Pass Verification

- Feature has README, spec, implementation, marketing, website, helpdoc, Firebase, mobile-support, and test-cases docs.
- Print Assets docs still say ordinary MenuList QR codes open the live page directly.
- Branded QR Action Templates docs define the creative/safety layer.
- Feature flag exists and defaults off.
- No runtime route, Firestore rule, API route, Storage path, Function, or deploy is added in this docs pass.

## Future Runtime Tests

### Campaign Setup

- Owner can create a draft campaign with a goal, asset type, placement, and two variants.
- Variant tokens are unique.
- Variant URLs keep expected UTM values.
- Owner cannot start a campaign with missing destination, consent copy, or broken QR.

### QR Reliability

- Generated QR quiet zone is at least four modules.
- Variant scans on iPhone and Android.
- Variant scans from expected real-world distance.
- Logo/brand elements do not overlap the QR pattern.
- Artistic QR/module distortion is rejected unless scan-regression coverage exists.

### Landing Flow

- Valid token opens the expected landing page.
- Invalid token shows a generic unavailable state.
- Landing page keeps campaign UTMs.
- WhatsApp CTA opens `wa.me` with the expected pre-filled text and campaign token.
- CTA click works if analytics is unavailable.

### Consent

- Consent copy names the business.
- Consent copy states the purpose.
- Consent action is explicit.
- STOP/opt-out copy appears when future updates are requested.
- Consent record does not store raw unnecessary personal data.

### Analytics

- Scan, landing, WhatsApp click, WhatsApp start, consent, lead, conversion, and guardrail counts are separate.
- Dashboard does not declare a winner from raw scan count only.
- Duplicate/internal/test scans can be excluded or marked.
- Aggregate writes stay bounded.

### Mobile

- Mobile can view active experiment status inside `MobileShell`.
- Mobile pause action works with confirmation.
- Mobile does not expose full campaign creation in initial version.

### Security

- Public token route validates token before lookup.
- Public token route is rate-limited before expensive work.
- Errors are generic.
- Store internals are not exposed to public visitors.
- No raw secrets, tokens, phone numbers, or payloads are logged.
