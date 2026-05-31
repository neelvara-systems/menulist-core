# Help Center — Parent Feature Documentation

> **Location:** `__docs__/answerlattice/help-center/`
> **Purpose:** Documents the existing Help Center infrastructure that Answerlattice extends
> **Last Updated:** 2026-05-25

---

## Document Index

| #   | Document                             | Audience        | Purpose                                                       |
| --- | ------------------------------------ | --------------- | ------------------------------------------------------------- |
| 1   | `help-center_spec.md`                | CEO/PM/Clients  | Business requirements, user flows, feature map                |
| 2   | `help-center_impl.md`                | Developers      | Technical blueprint — every file, function, dependency        |
| 3   | `help-center_firebase.md`            | Developers/Ops  | Every Firestore collection, read/write/delete, cost estimates |
| 4   | `help-center_marketing.md`           | Sales/Marketing | Positioning, pitch points, competitive comparison             |
| 5   | `help-center_website.md`             | Public website  | Landing page content, SEO meta                                |
| 6   | `help-center_helpdoc.md`             | End users       | Customer help documentation                                   |
| 7   | `help-center_mobile-support.md`      | Mobile team     | 4-gate admission test, mobile architecture                    |
| 8   | `help-center_decoupling-analysis.md` | Strategy/Arch   | Future standalone SaaS readiness assessment                   |

---

## Relationship to Answerlattice

These documents describe the **existing Help Center** — the base support infrastructure built into MenuList. Answerlattice is the governance layer that sits on top of this infrastructure, adding:

- Product Ontology (entity modeling)
- Canonical Answer Engine (deterministic retrieval before RAG)
- Drift Governance (answer staleness detection)
- Signal Mutation (friction signals → mutation proposals)
- Release Management (version-aware answers)

For Answerlattice-specific documentation, see:

- `__docs__/answerlattice/doctrine/` — Answerlattice doctrine and architecture
- `__docs__/answerlattice/answerlattice-activation-clearance.md` — Audit clearance
- `__docs__/answerlattice/answerlattice-activation-experiment.md` — Experiment framework

## Boundary Note

MenuList Help Center is a support surface for product users. Answerlattice Governance, Signal-to-Knowledge Queue, Entity Candidates, Canonical Coverage KPI, drift review, and canonical answer administration are owner/admin governance tools and are not mounted inside the Help Center tab list or landing page.
