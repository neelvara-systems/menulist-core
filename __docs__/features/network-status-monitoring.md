# Network Status Monitoring

**Last updated:** July 17, 2026
**Status:** Implemented source evidence; not current launch certification

## Current launch boundary

This document records the shared connectivity implementation. Release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), browser/device QA for offline and slow-network behavior, target-shell smoke for every product that mounts the provider, and target-environment deploy evidence.

## Runtime behavior

`src/hooks/useNetworkStatus.ts` listens to browser online/offline events and the optional Network Information API. Effective type, downlink, and round-trip values are accepted only in the expected finite shapes. These signals are advisory: `navigator.onLine` and reported connection speed do not prove that a specific API or provider is reachable.

`src/providers/NetworkStatusProvider.tsx` shows one shared, non-blocking status notice after a short delay:

- Offline: owners can continue reviewing the current screen, but saves and online actions may fail until reconnection.
- Slow connection: owners can continue working, while uploads and online actions may take longer.
- Restored connection: the notice disappears immediately.

The provider does not disable the UI, open a non-dismissible modal, auto-reload, invent an offline success state, queue writes, or replay mutations. Each feature keeps its existing server/DAL acknowledgement and error behavior.

## Shell ownership

The shared provider is mounted by the MenuList owner shell, CampaignCue protected shell, and Answerlattice dashboard shell. MobileShell no longer owns a second online/offline listener or duplicate banner; it inherits the shared provider through `AntdLayoutWrapper`.

## Slow-network thresholds

A connection is presented as slow when a valid browser signal reports any of:

- effective type `2g` or `slow-2g`;
- downlink below 1 Mbps;
- round-trip time above 500 ms.

Missing, non-string, negative, `NaN`, or infinite metrics are ignored.

## Cost and persistence

Network monitoring is browser-local. It adds no Firestore read/write/listener, Firebase Auth operation, Storage operation, Function, scheduler, provider call, API probe, durable event, or owner setting.

## Verification

```bash
npm run verify:owner-pwa-lifecycle
npm run verify:agent-readiness
npm run verify:mobile-shell-route-map
npx tsc --noEmit --incremental false --pretty false
```

Authenticated offline/online transitions, unreliable captive portals, slow-network simulation, iOS/Android installed PWA behavior, and preservation of in-progress edits remain external browser/device checks.
