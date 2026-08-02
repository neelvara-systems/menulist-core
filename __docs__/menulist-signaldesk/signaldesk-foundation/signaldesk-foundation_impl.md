# SignalDesk Foundation - Implementation Plan

**Status:** Runtime implemented for internal testing
**Created:** June 23, 2026
**Last Updated:** July 21, 2026
**Runtime:** Protected SignalDesk shell, current-user/session admission, role access, kill switches, audit, mobile read-only enforcement, and transactional internal team access management are implemented.

August 1, 2026 action-boundary corrections:

- The protected action route preserves every Zod schema's exact parsed output
  type through dispatch. Session input is typed at the shared security boundary.
- Permission, mobile classification and server dispatch are exhaustive over the
  action enum. Demand-signal behavior is explicit; incomplete new mappings fail
  TypeScript.
- Limiter-provider uncertainty returns private 503 without quota-derived
  retry/reset timing. Proven exhaustion alone returns 429 timing.
- Source-provider timeout/request failure returns retryable 503; bounded
  request/business rejection remains 400 and unknown failure remains fixed 500.
- The blocked-mobile audit write runs inside the route's private error boundary,
  while still occurring after limiting/authorization and before any requested
  mutation.

## Implemented File Layout

Implement in this monorepo first with product-isolated folders:

```txt
src/app/(signaldesk)/signaldesk/
src/app/api/signaldesk/
src/components/signaldesk/
src/constants/signaldesk/
src/database/signaldesk/
src/hooks/signaldesk/
src/lib/signaldesk/auth/
src/lib/signaldesk/audit/
src/lib/signaldesk/roles/
src/lib/signaldesk/kill-switches/
src/lib/signaldesk/config/
functions-signaldesk/src/audit/
functions-signaldesk/src/kill-switches/
```

Do not place SignalDesk code in MenuList owner/customer routes. Do not use default MenuList Firebase clients for SignalDesk data.

## Foundation Implementation Gate - Complete

Before writing feature logic:

1. add `PRODUCT_IDS.SIGNALDESK = "SD"`;
2. add `src/constants/signaldesk/product.ts`;
3. add `src/constants/signaldesk/routes.ts`;
4. add `src/constants/signaldesk/database.ts`;
5. add `src/lib/firebase/signaldeskConfig.ts`;
6. add `src/lib/firebase/signaldeskFirebaseClient.ts`;
7. add `src/lib/firebase/signaldeskFirebaseAdmin.ts`;
8. add `firebase-signaldesk.json`, rules, indexes, and storage rules;
9. add feature flags under the full `ENABLE_MENULIST_SIGNALDESK_*` prefix;
10. add route guards so no SignalDesk page is public or reachable from MenuList owner/customer navigation.

## Role Model

```ts
type SignalDeskRole =
  | "founder-admin"
  | "growth-manager"
  | "operator"
  | "compliance-reviewer"
  | "readonly-analyst"
  | "system-worker";
```

```ts
type SignalDeskPermission =
  | "signaldesk.view"
  | "signaldesk.configure"
  | "target.review"
  | "contact.reveal"
  | "draft.create"
  | "draft.approve"
  | "message.export"
  | "message.send"
  | "source.configure"
  | "channel.configure"
  | "policy.approve"
  | "kill-switch.activate"
  | "kill-switch.deactivate"
  | "audit.view";
```

## Internal Team Access Runtime

SignalDesk Settings includes an internal-only team access panel. Founder admins with `signaldesk.configure` can:

- add a team member by login email;
- optionally attach the auth user ID when known;
- assign a SignalDesk role;
- activate, deactivate, or update the member;
- keep every membership mutation behind `/api/signaldesk/actions` and audit it as `team_member_upsert` or `team_member_deactivate`.

The access resolver first validates the signed-in identity against the current MenuList user document through `getCurrentUser`. This enforces current active/block/deletion/auth-disable/email/session-revocation truth. Platform authority is then derived from that current record rather than from a cached session role.

For a non-platform user, the resolver checks `signaldeskTeamMembers` by document ID, stored `userId`, and normalized `emailLower`. Exactly one active, correctly shaped human membership must match. Ambiguous matches, malformed permissions, a `system-worker` role, or identity disagreement fail closed. Direct browser reads remain platform-only; active team members use protected server APIs.

The shared protected API limiter hashes the authenticated session identity and partitions by route/action. Overview, workspace, kill-switch and action endpoints apply it before current membership/permission Firestore reads or blocked-mobile audit writes. Distributed limiter uncertainty fails closed with bounded `503 RATE_LIMIT_UNAVAILABLE`; established exhaustion returns bounded `429 RATE_LIMITED`. This ordering prevents a throttled or protection-degraded request from amplifying SignalDesk datastore work.

Team-member creation and update use one Firestore transaction. The transaction reads the explicit/canonical member candidates plus bounded user-ID and email queries before writing. It rejects ambiguous identity, missing explicit records, changed bound user IDs, and self-deactivation based on the persisted row. Member, audit, and daily-cost truth commit together.

## Audit Event Contract

```ts
type SignalDeskAuditEvent = {
  auditEventId: string;
  pId: "SD";
  actorId: string;
  actorRole: SignalDeskRole;
  action: string;
  entityType: string;
  entityId: string | null;
  reason: `event:${string}` | null;
  createdAt: string;
};
```

Audit writes are server-only and normally share the mutation transaction/batch. Caller detail is intentionally reduced to `event:{action}` because target identity, evidence, message content, recipients, and operator free text may be sensitive. Authentication/authorization failures go to bounded secure diagnostics and do not create Firestore rows per hostile request.

The protected Audit workspace reads 50 valid rows ordered by `createdAt DESC, document ID DESC`. The desktop control can request the next page with that exact two-part cursor. The route rejects partial, malformed, oversized, or non-audit cursor use. Malformed/foreign rows are skipped with bounded diagnostics; the query continues only within the existing projection scan ceiling.

## Kill Switch Contract

```ts
type SignalDeskKillSwitch = {
  killSwitchId: string;
  scope:
    | "global-outbound"
    | "email"
    | "whatsapp"
    | "instagram"
    | "messenger"
    | "source-provider"
    | "ai-worker"
    | "campaign"
    | "content-distribution"
    | "trust-partner"
    | "menu-list-bridge";
  targetId?: string;
  status: "active" | "inactive";
  reason: string;
  activatedBy: string;
  activatedAt: string;
  deactivatedBy?: string;
  deactivatedAt?: string;
};
```

The private switch state retains the operator reason needed for review. Its separate audit row stores only `event:kill_switch_activate` or `event:kill_switch_deactivate`. Exact and concurrent retries reuse the actor-bound claim and cannot create another transition or audit. Reactivation clears prior deactivation metadata so the current state cannot imply that an active pause is already cleared.

Desktop founder controls can manage all governed scopes. Mobile can only activate `global-outbound` with the explicit emergency confirmation marker; scoped activation and every deactivation remain desktop-only.

## Required Guards

Every mutation must check:

1. internal session exists and is current;
2. bounded syntax and feature admission succeeds;
3. actor-scoped distributed rate limiting admits the request;
4. current MenuList user remains active and unblocked;
5. exactly one current SignalDesk authority resolves;
6. role has permission;
7. relevant kill switch is inactive unless the action is pause/acknowledge;
8. request validates against its action schema;
9. audit event is written.

Contact reveal additionally requires:

1. explicit reason;
2. target/contact ID;
3. role permission;
4. audit event;
5. no mobile reveal.

## First Screens

| Screen | Purpose |
| --- | --- |
| `/signaldesk` | Internal dashboard shell. |
| `/signaldesk/control-room` | Kill switches, incidents, cost/channel summaries. |
| `/signaldesk/policies` | Read-only policy state in first build. |
| `/signaldesk/audit` | Admin newest-first audit history with explicit older-page loading. |

## Validation

- Unit test role-permission matrix.
- Unit test kill-switch evaluation.
- API test every mutation without permission.
- API test every mutation with active global outbound pause.
- Audit test contact reveal.
- Audit test stable pagination across identical timestamps and malformed/foreign rows.
- Mobile test emergency pause only.
- Emulator-test stale platform claims, blocked current users, ambiguous memberships, self-deactivation, and concurrent identity collisions.

## Runtime Boundary

The foundation runtime is implemented. SignalDesk remains private and product-scoped: canonical app/API paths are denied on non-SignalDesk production hosts, dedicated/local/approved-alias routing is preserved, and both app-server and Functions Firebase initialization reject foreign project authority before data access. Provider sending remains separately flag-disabled.
