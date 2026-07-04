# Truth & Accuracy Dominance — Firebase Cost Tracking

**Date:** February 19, 2026  
**Pillar:** 2 of 6
**Status:** Source-gated Firebase cost reference; not current launch certification

---

## Cost Summary

**Monthly Additional Cost From This Reference: none**

This pillar documents existing source-boundary infrastructure. This documentation checkpoint adds no new feature-specific Firebase collections, Firestore reads/writes/deletes, Storage operations, Cloud Functions, indexes, rules, schedulers, provider calls, or cache invalidation jobs.

Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:public-business-truth`, public-output QA, target deploy evidence, and production-host smoke.

The referenced source-stack components (MCE, hours status, versioned publishing) keep their costs documented in their respective feature docs:

- MCE: `__docs__/menu-correctness-engine/menu-correctness-engine_firebase.md` - client-side validation on covered project update paths
- Hours Status: Part of existing store document reads
- Public menu/OBP cache: current public cache tags and the 60-second public cache window
- Digital Screens: separate `screen-data` cache and content-version listener path
- Downloaded or provider targets: require separate artifact/provider evidence before freshness claims

---

**Last Updated:** July 4, 2026
