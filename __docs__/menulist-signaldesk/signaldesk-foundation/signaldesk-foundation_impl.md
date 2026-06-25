# SignalDesk Foundation - Implementation Plan

**Status:** Runtime implemented for internal testing
**Created:** June 23, 2026
**Runtime:** Protected SignalDesk shell, role access, kill switches, audit, mobile read-only enforcement, and internal team access management are implemented.

## Future File Layout

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

## Foundation Implementation Gate

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

The access resolver checks platform admin first, then `signaldeskTeamMembers` by document ID, stored `userId`, and normalized `emailLower`. This keeps the practical partner flow simple without creating public signup, owner/customer navigation, or direct client writes.

## Audit Event Contract

```ts
type SignalDeskAuditEvent = {
  auditEventId: string;
  actorId: string;
  actorRole: SignalDeskRole;
  action:
    | "login"
    | "contact_reveal"
    | "target_update"
    | "draft_approval"
    | "message_export"
    | "message_send"
    | "policy_update"
    | "kill_switch_activate"
    | "kill_switch_deactivate";
  entityType?: string;
  entityId?: string;
  reason?: string;
  ipHash?: string;
  userAgentHash?: string;
  createdAt: string;
};
```

## Kill Switch Contract

```ts
type SignalDeskKillSwitch = {
  killSwitchId: string;
  scope:
    | "global-outbound"
    | "email"
    | "whatsapp"
    | "instagram"
    | "source-provider"
    | "ai-worker"
    | "campaign"
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

## Required Guards

Every mutation must check:

1. internal session exists;
2. role has permission;
3. relevant kill switch is inactive unless the action is pause/acknowledge;
4. request validates against schema;
5. audit event is written.

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
| `/signaldesk/audit` | Admin audit event search. |

## Validation

- Unit test role-permission matrix.
- Unit test kill-switch evaluation.
- API test every mutation without permission.
- API test every mutation with active global outbound pause.
- Audit test contact reveal.
- Mobile test emergency pause only.

## No Runtime Change

This is a planning doc. No auth, route, role, or Firebase rule was implemented in this pass.
