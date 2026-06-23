# SignalDesk Demand Signals - Compliance Policy

**Status:** Initial policy
**Created:** June 23, 2026

## Principle

Warm demand signals are useful only if they stay privacy-bounded. SignalDesk must measure business opportunity without turning public MenuList usage into customer surveillance.

## Allowed Signals

- Aggregated QR/menu-link activity.
- Business-facing claim/setup clicks.
- Operator-entered partner referrals.
- Route-token events tied to approved growth actions.
- Customer request signals only when stored as compact, non-identifying events.

## Blocked Signals

- Customer identity from anonymous scans.
- Cross-business customer tracking.
- Raw device fingerprints.
- Full IP address retention in SignalDesk docs.
- Sensitive category inference.
- Automatic contact enrichment from anonymous customer behavior.

## Prospect Creation Rule

A target or prospect review item can be created from:

- owner/business-facing action,
- partner/referral submission,
- operator-verified business signal,
- valid route-token outcome.

A target must not be created from anonymous customer scan activity alone.

## Suppression Rule

Demand does not override opt-out. If a target or channel identity is suppressed, the signal may be recorded for aggregate learning, but outreach remains blocked.

## Surface-Hook Review

Every MenuList surface hook must document:

- source surface,
- allowed purpose,
- stored fields,
- blocked fields,
- retention,
- summary impact,
- privacy review owner.
