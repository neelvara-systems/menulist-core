# SignalDesk Draft Control - Implementation

**Status:** Implemented and locally verified
**Last Updated:** July 21, 2026

## Runtime Map

| Concern | Source |
| --- | --- |
| API admission | `src/app/api/signaldesk/actions/route.ts` |
| Draft transaction and rendering | `src/lib/signaldesk/workflowServer.ts` |
| Contact authority | `src/lib/signaldesk/outboundContactContracts.ts` |
| Target/evidence authority | `src/lib/signaldesk/outcomeContracts.ts` |
| Strict workspace projection | `src/lib/signaldesk/workspaceContracts.ts` |
| Desktop/mobile workspace | `src/components/signaldesk/SignalDeskWorkspace.tsx` |
| Retention | `functions-signaldesk/src/schedulers/sourceDataLifecycle.ts` |
| Focused emulator | `scripts/verification/e2e-signaldesk-local.js` |

## Flow

1. The protected action route validates `targetId` and optional `templateId`.
2. The server resolves the latest projected evidence, authoritative preview CTA,
   and one ready sender through bounded reads.
3. A Firestore transaction re-reads strict target/source lifecycle, source
   policy, target contact detail, evidence, template, CTA, sender, and optional
   conversation truth.
4. It revalidates policy lineage, exact contact authority, evidence identity,
   suppression, prior contact, template variables/channel/claims, CTA, and sender.
5. It renders the fixed template variables and computes contact, CTA, sender,
   template, and complete draft identity fingerprints.
6. It either returns the exact durable triad or atomically creates the draft,
   approval, approval packet, target progression, audit, timeline, queue, and cost.
7. Approval later re-reads the template and rejects a missing, inactive,
   wrong-channel, changed, or legacy-unbound template.

## Deterministic Copy Guard

The runtime does not claim broad natural-language moderation. It rejects the
maintained prohibited categories that would otherwise bypass the declared
SignalDesk copy boundary: guarantees, platform-partnership claims, unsupported
automatic platform actions, customer-loss/revenue fear claims, scraping claims,
unverified-business claims, and false publication claims.

The approved template remains the primary copy boundary. `unsupportedClaims`
is retained in the draft/approval contracts for downstream fail-closed review
and legacy/corruption detection.

## Compatibility

Older stored drafts without a template fingerprint remain readable, but cannot
be newly approved. They must be rejected and recreated from current authority.
No migration, backfill, collection, dependency, provider, or public route is
required.
