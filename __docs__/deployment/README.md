# Deployment — Documentation Hub

> **Category:** Infrastructure  
> **Last Updated:** July 1, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This hub links deployment runbooks; current release approval requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped deploy evidence, provider/browser/device QA, and production-host smoke.

---

## Documents

| Document | Purpose |
|----------|---------|
| [production-deployment-checklist.md](./production-deployment-checklist.md) | Guarded production handoff checklist; routes external gates through the production-readiness runbook and does not authorize deploys without active approval |
| [domain-environment-setup.md](./domain-environment-setup.md) | Exact env variables for production, preview/staging, and localhost domain handling |

## Summary

Deployment guides and checklists for shipping MenuList.ai to production (Vercel + Firebase). Vercel deploys remain opt-in per active session; use the production deployment checklist and External Certification Runbook as handoff/evidence guides, not as automatic deploy permission.
