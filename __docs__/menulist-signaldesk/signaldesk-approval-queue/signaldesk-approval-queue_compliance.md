# SignalDesk Approval Queue - Compliance Policy

**Status:** Initial planning doc
**Created:** June 23, 2026

## Core Rule

Approval is not a rubber stamp. It is the policy gate.

## Required Review Context

Approver must see:

- target summary;
- source policy state;
- evidence packet;
- rejected facts;
- draft text if applicable;
- suppression state;
- channel eligibility;
- kill switch state;
- prior contact history.

## Approval Invalidators

Approval becomes invalid if:

- suppression changes;
- evidence expires;
- source policy pauses;
- channel policy pauses;
- target becomes duplicate/held;
- kill switch activates;
- draft changes after approval.

## Role Rules

- Operators may request approvals.
- Growth managers may approve ordinary drafts if policy allows.
- Compliance reviewer approves risky source/channel/evidence items.
- Founder admin approves source/provider/channel exceptions.

## Mobile Rule

No mobile approval.

Emergency pause on mobile is allowed, but approval requires desktop context.
