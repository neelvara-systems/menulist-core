# POS Webhook Sync — Mobile Support

**Last Updated:** April 5, 2026
**Decision:** ⚠️ LIMITED MOBILE SUPPORT — Status and light configuration supported

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ⚠️ MIXED | Full setup is rare, but status checks happen on phone |
| **Speed** | ⚠️ MIXED | Light edits and test ping are acceptable on mobile |
| **Touch** | ⚠️ MIXED | URL input is not ideal, but manageable for urgent fixes |
| **Value** | ✅ PASS | Owners may need to verify sync health away from desk |

**Decision:** Mobile supports operational visibility and light-touch edits:
- enable/disable sync
- view status
- edit webhook URL
- regenerate/copy signing secret
- send test ping

Heavy integration setup and provider coordination are still desktop-preferred.
