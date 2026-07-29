# Truth & Accuracy Dominance — Mobile Support Assessment

**Date:** February 19, 2026  
**Pillar:** 2 of 6
**Status:** Source-gated mobile support reference; mobile QA still required

---

## Mobile Relevance Decision: **YES (Source-Gated)**

The truth stack applies on mobile only where mobile uses the same authenticated save/display paths and the same supported public-output surfaces. Mobile release approval is not automatic.

- MCE runs on project update paths covered by the current source gates.
- Hours status shows on mobile-responsive OBP and menu paths using the same store-hours source.
- Availability toggles are available on mobile via `MobileMenuScreen` and inherit the acknowledged save/cache path.
- Public menu/OBP output follows the current public cache window; Digital Screens use exact token/store cache tags and the content-version listener path.
- Downloaded artifacts, POS/provider targets, and external platforms require separate target evidence.

No additional mobile runtime is added by this pillar reference. Current approval still requires mobile save/publish smoke, public menu/OBP viewport QA, Digital Screens device QA where relevant, `npm run verify:public-business-truth`, target deploy evidence, and production-host smoke.

---

**Last Updated:** July 4, 2026
