# Onboarding — Documentation Hub

> **Category:** User Onboarding Flows  
> **Last Updated:** July 16, 2026

The current implemented owner signup, first workspace, subscription handoff, session refresh, and returning-owner recovery contract lives in [Auth and Onboarding](../auth-onboarding/README.md). Code is the primary source of truth.

---

## Documents

| Document                                                                                   | Purpose                                                                                   |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| [Auth and Onboarding](../auth-onboarding/README.md)                                       | Current implemented signup, workspace, payment, claims, and recovery contract              |
| [ponr-onboarding_spec.md](./ponr-onboarding_spec.md)                                       | Historical Point-of-No-Return strategy evidence only                                       |
| [onboarding_public-draft-strategy-review.md](./onboarding_public-draft-strategy-review.md) | Public-draft/starter activation strategy review and its explicit implementation boundary    |

## Summary

The active self-serve flow is a responsive website flow outside the authenticated `MobileShell`. After the owner has a scoped account, the dashboard uses the normal desktop or mobile owner shell. Historical strategy files do not authorize new fields, routes, owner prompts, or launch claims.
