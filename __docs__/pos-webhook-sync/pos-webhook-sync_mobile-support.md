# POS Webhook Sync — Mobile Support

**Last Updated:** May 23, 2026
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
- understand what External Menu Sync does before seeing technical fields
- view a simple MenuList -> connected systems explanation and "Who should use this?" guidance
- enable/disable sync
- view status
- edit provider connection URL
- view masked verification secret preview, reveal deliberately, copy secret, and regenerate with typed confirmation
- test the connection

Heavy integration setup and provider coordination are still desktop-preferred. Mobile must not expose the full signing secret by default.
