# AI Menu Manager - ChatGPT Feedback Audit - June 20, 2026

**Source:** Founder-shared ChatGPT review of current AMM docs  
**Mode:** Post-implementation feedback validation  
**Verdict:** Mostly valid maturity assessment. No architecture reversal needed. Public copy needed claim tightening.

---

## Summary

| Feedback area | Status | Reference | Action |
| --- | --- | --- | --- |
| AMM is a foundation/registry/control layer, not a fully mature autonomous agent | Valid | `ai-menu-manager_validation.md`, `ai-menu-manager_action-type-checklist.md` | Keep current boundary; validation doc updated. |
| Product name split is correct: public `AI Menu Manager`, in-app `Menu Manager` | Already aligned | `ai-menu-manager_spec.md`, `ai-menu-manager_website.md` | No code change. |
| Core loop must stay owner intent -> card -> approval -> existing operation -> receipt | Already aligned | `ai-menu-manager_spec.md`, `ai-menu-manager_impl.md` | No code change. |
| Read-only selected-menu answer layer is correct | Already implemented | `domainConversationRouter.ts`, `ai-menu-manager_action-type-checklist.md` | No code change. |
| Source of truth must stay existing project/store structures | Already aligned | `ai-menu-manager_impl.md` | No code change. |
| Mobile More/manual surfaces should map to exact action families | Already implemented | `commandResolver.ts`, `ai-menu-manager_mobile-support.md` | No code change. |
| Firebase cost model must stay compact | Already aligned | `ai-menu-manager_firebase.md`, `ai-menu-manager_validation.md` | No code change. |
| `verify:ai-menu-manager` should be a real gate | Already implemented | `scripts/verification/verify-ai-menu-manager.js` | Re-ran verifier. |
| More `ready_adapter` and `needs_adapter_glue` actions need future adapter connection | Valid maturity note | `ai-menu-manager_action-type-checklist.md` | Captured as implementation spine; no new scope added in this pass. |
| Rollback must not be overpromised | Already aligned | `ai-menu-manager_action-type-checklist.md`, `ai-menu-manager_test-cases.md` | No code change. |
| Rules must remain blocked until rule registry/execution exists | Already aligned | `ai-menu-manager_spec.md`, `ai-menu-manager_action-type-checklist.md` | No code change. |
| External platform requests must be unsupported/not-supported cards | Already aligned | `ai-menu-manager_test-cases.md`, `commandResolver.ts` | No code change. |
| Website/launch copy should not overclaim unfinished adapter families | Valid | Current website locale copy and website doc | Tightened website metadata, locale copy, and website/marketing docs. |

---

## Public Copy Fix Applied

The review correctly exposed one claim-risk: website copy described today-special examples as cards with expiry, but current implementation resolves single-item today-special creation to `item_create` as a manual/review task until the create-item adapter is connected.

Applied correction:

- `Today Special card with price and expiry` -> `Today Special draft card with price and placement`
- `Special item card with placement and expiry.` -> `Special item review card with price and placement.`
- Website metadata and locale copy now says AMM prepares cards and applies **supported** changes after approval.
- Marketing docs now say launch demos should lead with executable daily ops and selected-menu answer cards; incomplete image/import/publish/rule/rollback families must be described as draft, review, or handoff cards unless the adapter is connected and verified.

---

## Rejected Or Deferred Scope

No new autonomous agent behavior was added from this feedback.

Deferred because it requires separate implementation work and existing checklist promotion:

- universal rollback ledger.
- executable rules.
- full image-generation/apply adapter.
- full import/link-review adapter.
- direct external posting.
- general AI/web assistant behavior.
- provider-backed menu consulting answers.

These remain governed by the existing action checklist and Firebase cost rules.
