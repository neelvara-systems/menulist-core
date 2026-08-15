# EmailOS — Post-Implementation Validation

> **Validation date:** August 15, 2026
> **Scope:** Source, documentation, product routing, provider boundary, webhook boundary, Firestore declarations and local verification
> **Activation state:** Provider transmission disabled; no live email sent

## Result

The source implementation is locally complete and keeps provider activation closed. This review found and corrected reliability and product-isolation defects before Resend onboarding. Live provider behavior, DNS, secrets, QA deployment and mailbox certification remain external evidence gates and are not claimed here.

## Expected-to-Actual Workflow Map

| Workflow | Expected contract | Actual implementation | Result |
| --- | --- | --- | --- |
| Shared contract | One pure contract mirrored into both Functions packages | Root, MenuList Functions and Answerlattice Functions contracts are verifier-enforced byte mirrors | Pass |
| Rendering | Server-only HTML and plain text, bounded input, no provider dependency | Root and both Functions packages use the same React Email rendering contract | Pass |
| Provider disabled | Existing SMTP migration path remains active; no Resend or EmailOS Firestore work | Every provider-send flag defaults off; callers enter EmailOS only when the owning product flag is on | Pass |
| Configuration failure | Fail closed before Firebase/provider work | Missing product key/domain or prohibited product returns configuration/contract rejection | Pass |
| Product routing | MenuList and Answerlattice never reuse each other's code, database or credentials | Root, Functions, owner notifications and workflow integrations retain explicit `ML`/`AL`; unsupported generic notification products return false | Pass |
| Sender authority | Exact configured product domain required | Every provider adapter validates the parsed From mailbox against its product domain | Pass |
| Suppression | Product-scoped permanent block checked before paid request | `SHA-256(productCode:canonicalRecipient)` direct read prevents provider call | Pass |
| First provider attempt | Durable identity exists before provider request | Transaction creates the deterministic local delivery claim before Resend | Pass |
| Duplicate local request | No second provider request, including after provider idempotency expiry | Existing claim returns its normalized state without calling Resend | Pass |
| Explicit retryable rejection | One later caller may retry a known unaccepted `429`/`5xx` | Transaction changes `failed + retryable + non-ambiguous` to `queued`; concurrent callers observe the claim | Pass |
| Ambiguous outcome | Never auto-resend or fail over | Network/persistence uncertainty records or returns `outcome_unknown`; durable claim remains | Pass |
| Provider success | Provider identity retained without regressing webhook truth | Monotonic transaction stores ID/hash and advances only when allowed | Pass |
| Early webhook | Webhook can reconcile before the send response write | Reserved `email_os_delivery_id` tag directly resolves the pre-provider claim; provider hash remains fallback | Pass |
| Webhook verification | Raw body, all Svix headers, size bound and product secret required | Both product endpoints reject malformed requests generically before Firestore work | Pass |
| Webhook replay | At-least-once delivery causes one state mutation | Hashed `svix-id` receipt is transactionally create-once; duplicate returns `200` | Pass |
| Out-of-order webhook | Older/lower state cannot regress a delivery | Shared precedence and occurrence-time helper guards both products | Pass |
| Bounce/complaint/suppression | Future sends stop for that product | Verified events create active product-scoped hashed suppression | Pass |
| Suppression removal | Provider-derived block can become inactive without plaintext storage | Verified removal writes inactive audit state with TTL | Pass |
| MenuList lifecycle messaging | Existing claim/reference identity retained across cutover | Functions and root lifecycle adapters pass event type and deterministic reference | Pass |
| MenuList owner notifications | Existing delivery claim and `ML` routing retained | Root and Functions owner processors use product/event/reference identity | Pass |
| Platform alerts | Internal portfolio alerts do not accidentally use Answerlattice credentials | Answerlattice entries use `AL`; other internal platform entries deliberately use MenuList's operational `ML` channel | Pass |
| Answerlattice workflow integration | Separate Firebase, key, domain, webhook and flag | Product-local adapter uses `AL` and Answerlattice collections/secrets | Pass |
| Generic root notifications | Unsupported products cannot fall through to MenuList | Only `ML` and `AL` are admitted; all others fail closed before log/send work | Pass |
| SignalDesk | No transactional reputation or credential reuse | Existing provider-send flag remains off; no EmailOS adapter added | Pass |
| CampaignCue | Export remains the only email-related output | Contract rejects direct send and verifier enforces export-only policy | Pass |
| MyCodex / Neelvara | No runtime, credentials or Firebase email state | No adapter or credential path exists | Pass |
| Mobile | No new owner-mobile workflow or settings surface | Existing notification preference/recipient flows remain authoritative | Pass |

## Defects Corrected During Final Review

| Severity | Defect | Correction |
| --- | --- | --- |
| Critical | A network-ambiguous send was stored as `failed`, which could outrank a later delivered webhook | Added `outcome_unknown` below verified provider states and made it non-retryable |
| Critical | Repeated calls could reset terminal state and rely only on Resend's 24-hour idempotency window | Added a transactionally created durable local claim and monotonic provider-result updates |
| Critical | A webhook could arrive before provider identity was persisted and become unresolvable | Added a reserved local-delivery provider tag with direct document lookup and hash fallback |
| High | Explicit retryable provider rejection became permanently blocked by the durable claim | Added single-winner transactional claim reacquisition only for known non-ambiguous retryable failures |
| High | Recipient hashes were identical across products despite product-scoped suppression policy | Included product code in the recipient hash input |
| High | Root owner notifications hardcoded MenuList when processing Answerlattice events | Required the owner event's `ML`/`AL` product identity in readiness and send paths |
| High | Generic notifications mapped any non-Answerlattice product to MenuList | Added strict `ML`/`AL` admission and fail-closed behavior |
| High | Caller tags could collide with the internal delivery lookup tag | Reserved the tag name in validation and reduced caller tag capacity to seven |
| Medium | Test documentation expected `401`, while both generic malformed-signature paths return `400` | Aligned the documented contract to the implemented generic `400` response |
| Medium | Firebase operation estimates omitted claim and monotonic-update transaction reads | Corrected the per-send and webhook operation matrix |

## Source Evidence

| Concern | Governing source |
| --- | --- |
| Product policies, bounds, state ordering and event normalization | `src/data/shared/emailOs.ts` |
| Root server delivery | `src/lib/email-os/provider.ts` |
| MenuList provider and webhook | `functions/src/emailOs/provider.ts`, `functions/src/emailOs/webhook.ts` |
| Answerlattice provider and webhook | `functions-answerlattice/src/emailOs/provider.ts`, `functions-answerlattice/src/emailOs/webhook.ts` |
| Product-specific cutover flags | `src/config/features.ts`, both Functions `constants/features.ts` files |
| MenuList compatibility callers | `functions/src/messaging/providers/resend.ts`, `src/lib/messaging/index.ts`, `src/lib/owner-notifications/channels/email.ts`, `src/lib/notifications/index.ts` |
| Answerlattice compatibility caller | `functions-answerlattice/src/integrations/adapters/emailAdapter.ts` |
| TTL declarations | `firestore.indexes.json`, `firestore-answerlattice.indexes.json` |
| Static and behavioral gates | `scripts/verification/verify-email-os.js`, `scripts/verification/test-email-os.ts` |

## Verification Matrix

| Gate | Result |
| --- | --- |
| `npm run verify:email-os` | Pass |
| `npm run verify:dependency-freeze` | Pass |
| `npm --prefix functions run build` | Pass |
| `npm --prefix functions run lint` | Pass |
| `npm --prefix functions-answerlattice run build` | Pass |
| `npx tsc --noEmit --incremental false --pretty false` | Pass |
| `npm run lint` | Pass with zero warnings |
| Root `npm audit --omit=dev --audit-level=high` | Pass, zero vulnerabilities |
| MenuList Functions `npm audit --omit=dev --audit-level=high` | Pass, zero vulnerabilities |
| Answerlattice Functions `npm audit --omit=dev --audit-level=high` | Pass, zero vulnerabilities |
| JSON parse and `git diff --check` | Pass |

No Next.js production build, Vercel build or deploy is part of this validation.

## External Certification Still Required

1. Create separate approved Resend account/team boundaries and product sending domains.
2. Publish and verify SPF, DKIM and DMARC evidence.
3. Create product-scoped API keys and webhook secrets.
4. Deploy the smallest QA targets and TTL policies.
5. Run delivered, delayed, bounce, complaint, suppression, replay and mailbox rendering tests.
6. Obtain owner approval before changing either provider-send flag.

The source does not silently activate when credentials appear; the product-specific flag remains a separate required gate.

## Known Infrastructure Blockers

- MenuList QA index/TTL deployment was attempted twice and the Firebase Rules API returned `503` both times.
- The current operator identity received `403` while listing Answerlattice QA index state.
- The Google Cloud CLI is unavailable on this machine, so a direct TTL-policy fallback could not be used.
- These are deployment evidence blockers, not missing source implementation. Do not retry blindly; resolve access/service health during provider onboarding.
