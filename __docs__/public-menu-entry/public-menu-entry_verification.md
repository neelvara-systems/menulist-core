# Public Menu Entry — Verification Log

**Version:** 1.0
**Status:** ✅ PRODUCTION AUDIT PASSED WITH EXTERNAL CONDITIONS
**Last Updated:** May 20, 2026

---

## Scope

This log tracks the May 20, 2026 production-audit and final-review pass for the public menu entry / starter activation flow.

Covered:

- Public upload-before-auth API
- AI extraction status polling
- Authenticated draft claim
- Same permanent subdomain before and after payment
- Starter expiry holding page
- Signed Razorpay subscription webhook
- Store/project/user/draft/summary Firestore integrity
- Local cleanup of disposable test data

Not covered as a live external flow:

- Real WhatsApp Cloud API webhook/media delivery
- Hosted Razorpay recurring checkout UI completion

---

## Local E2E Result

Command type:

```bash
node <disposable-e2e-harness>
```

Result:

```text
PASS: public upload without auth
PASS: draft storage contract
WARN: AI extraction natural completion — status failed; seeded completed data
PASS: preview polling returns completed data
PASS: disposable auth user created
PASS: NextAuth credentials session
PASS: draft claim creates permanent workspace
PASS: duplicate claim idempotency guard
PASS: session refresh after claim
PASS: Firestore conversion integrity
PASS: starter public URL active before payment
PASS: starter expiry holding page
PASS: signed Razorpay subscription webhook
PASS: payment preserves same public URL
PASS: cleanup completed
```

Notes:

- Gemini natural extraction failed locally because the configured key is quota-blocked. The harness seeded a completed draft after confirming the failure state so downstream claim/payment/public route behavior could still be verified.
- Public subdomain routing was tested locally with `curl --resolve {subdomain}.menulist.ai:3000:127.0.0.1` so the request exercised the tenant middleware instead of the marketing root.
- The signed Razorpay webhook used the configured test webhook secret and verified that `subscriptions`, `stores`, and nested `platformSummary/storesSummary.stores.{storeId}.activePlanType` all synced to `starter`.
- Final parity sweep also fixed sibling `storesSummary` merge writers so public starter, WhatsApp publish, outlet create/rename/deactivate/policy, platform block, and scheduler enrichment writes all preserve the nested `stores.{storeId}` map read by Cloud Functions.
- Disposable Auth, Firestore, Storage, project summary, storesSummary, subscription, payment transaction, and AI operation test rows were cleaned up.

---

## Static Gates

```bash
npx tsc --noEmit --incremental false
npm run lint
cd functions && npx tsc --noEmit
git diff --check
node -e "JSON.parse(...locale files...)"
```

Result:

- TypeScript app: pass
- ESLint: pass
- Cloud Functions TypeScript: pass
- Diff whitespace: pass
- Website locale JSON parse: pass

---

## Production Conditions

Before public traffic:

1. Deploy Firestore rules and indexes for `publicMenuDrafts` and starter cleanup queries.
2. Deploy the updated `menulistMaintenanceScheduler` so expired public drafts and storage files are removed.
3. Fix or replace the configured Upstash Redis endpoint; local rate-limit calls currently log DNS `ENOTFOUND` and fall open.
4. Confirm Gemini quota/key capacity for public uploads; current local key returns quota errors.
5. Confirm Razorpay merchant recurring/autopay capability for hosted checkout completion.
6. Run WhatsApp Cloud API sandbox flow with real Meta test credentials if WhatsApp onboarding is included in the launch path.

---

**Document Signature:** MenuList Public Menu Entry Verification
**Audience:** Engineering / Ops
