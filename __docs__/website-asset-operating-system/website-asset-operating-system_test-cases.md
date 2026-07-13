# Website Asset Operating System - Test Cases

**Status:** Internal v1 implemented  
**Scope:** Docs and first implementation validation  
**Build required:** No Vercel build. TypeScript check applies after implementation.

---

## Docs Validation

| ID | Test | Expected |
| --- | --- | --- |
| DOC-01 | Folder name is kebab-case. | `__docs__/website-asset-operating-system/` exists. |
| DOC-02 | File prefixes match folder name. | All doc files start with `website-asset-operating-system_` except `README.md`. |
| DOC-03 | Product decision is explicit. | Docs say internal infrastructure, not separate product now. |
| DOC-04 | ChatGPT suggestions are not accepted blindly. | Review doc contains accepted, adjusted, and rejected points. |
| DOC-05 | Firebase cost is explicit. | Firebase doc states zero current Firebase cost and future risk gates. |
| DOC-06 | Mobile support is reviewed. | Mobile doc states partial output relevance, no mobile UI. |

## First Implementation Tests

| ID | Test | Expected |
| --- | --- | --- |
| AUDIT-01 | Run `npm run assets:audit`. | Outputs Missing, Stale, Oversized, Approval Required, and Disconnected groups. |
| AUDIT-02 | Remove a manifest file entry. | Audit reports missing manifest entry for required slot. |
| AUDIT-03 | Point manifest to a missing file. | Audit reports missing physical file. |
| AUDIT-04 | Use a file above budget. | Audit reports oversized with actual and budget KB. |
| AUDIT-05 | Change a source page after asset approval. | Audit reports stale source fingerprint. |
| AUDIT-06 | Add a file in public media with no slot. | Audit reports a disconnected public asset as an error and exits nonzero. |
| AUDIT-07 | Remove the declared destination from a generated/approved manifest entry. | Audit reports the slot destination is not declared and exits nonzero. |
| AUDIT-08 | Remove a required output role from a generated/approved manifest entry. | Audit reports the missing required output and exits nonzero. |
| AUDIT-09 | Point two manifest slots at the same file. | Audit reports duplicate file ownership and exits nonzero. |
| AUDIT-10 | Add a manifest entry without a slot declaration. | Audit reports an orphan manifest entry as an error and exits nonzero. |
| AUDIT-11 | Delete a source file declared by a live slot. | Audit reports the missing declared source and exits nonzero for generated/approved assets. |
| AUDIT-12 | Remove a watched source from a slot after fingerprint approval. | Audit reports the disappeared fingerprint path as stale and exits nonzero for generated/approved assets. |
| AUDIT-13 | Delete the brief for a generated/approved asset. | Audit reports the missing brief as an error and exits nonzero. |
| AUDIT-14 | Point a manifest entry at another slot's brief. | Audit reports the mismatched brief path and duplicate ownership as errors. |
| AUDIT-15 | Set asset status to approved with a non-approved review decision. | Audit reports contradictory approved state and exits nonzero. |
| AUDIT-16 | Approve a review with failed/warning performance or a score outside 1-10. | Audit reports incoherent approved review evidence and exits nonzero. |
| AUDIT-17 | Assign a required role to a file with the wrong extension. | Audit reports the output-format mismatch and exits nonzero for generated/approved assets. |

## Brief Generation Tests

| ID | Test | Expected |
| --- | --- | --- |
| BRIEF-01 | Generate brief for MenuList hero slot. | Brief includes MenuList positioning, source files, rejection rules, output formats. |
| BRIEF-02 | Generate brief for Answerlattice hero motion slot. | Brief avoids generic SaaS/dashboard language and references Answerlattice visual system. |
| BRIEF-03 | Generate brief for unknown slot. | Command fails with clear error and lists known slots. |
| BRIEF-04 | Missing brand context file. | Command fails and explains which source file is missing. |

## Review Tests

| ID | Test | Expected |
| --- | --- | --- |
| REVIEW-01 | Review generated static asset with all files present. | Passes manifest, size, and fallback checks. |
| REVIEW-02 | Review video without poster. | Fails fallback completeness. |
| REVIEW-03 | Review Answerlattice asset tagged dashboard-like. | Fails brand fit. |
| REVIEW-04 | Review MenuList asset with POS/payroll visuals. | Fails rejection rules. |
| REVIEW-05 | Review real customer screenshot. | Blocks until founder approval metadata exists. |

## Website Integration Tests

| ID | Test | Expected |
| --- | --- | --- |
| WEB-01 | Asset component receives missing asset ID. | Renders null or safe fallback, no runtime crash. |
| WEB-02 | Asset component receives video asset. | Renders WebM, MP4 fallback, poster, muted, loop, playsInline, metadata preload. |
| WEB-03 | Mobile viewport check. | No horizontal overflow or unreadable asset text. |
| WEB-04 | Reduced motion check. | Static poster/fallback remains visible. |

## Product Boundary Tests

| ID | Test | Expected |
| --- | --- | --- |
| BOUNDARY-01 | MenuList asset slot tries to describe a marketing campaign output for SMB owner. | Reject or move to GrowthOS docs. |
| BOUNDARY-02 | KitStamp-style content unit/workbench appears in this system. | Reject or document as future KitStamp-only. |
| BOUNDARY-03 | Answerlattice asset slot depends on MenuList tenant data. | Reject. |
| BOUNDARY-04 | Asset script writes Firebase data. | Reject unless a new approved Firebase cost plan exists. |
| BOUNDARY-05 | AssetOS uses Answerlattice product-surface, intake, release, feedback, or drift context. | Allow read-only source context for briefs/audits; reject writes to Answerlattice runtime, KB, tickets, signals, widgets, product surfaces, or Firebase data. |

## Implementation Commands

| ID | Command | Expected |
| --- | --- | --- |
| CMD-01 | `npm run assets:audit` | Exits 0 only when no generated/approved assets are broken and no public media file is disconnected. |
| CMD-02 | `npm run assets:review` | Exits 0 when generated/approved files are present and under budget. |
| CMD-03 | `npm run assets:brief -- --slot menulist.home.hero.official-source` | Writes `packages/asset-factory/briefs/menulist.home.hero.official-source.md`. |
| CMD-04 | `npm run assets:fingerprint` | Locks watched source hashes for generated/draft assets. |
| CMD-05 | `npm run assets:generate:missing -- --slot answerlattice.home.hero.support-control-motion` | Writes an internal SVG placeholder under `packages/asset-factory/published/placeholders/`. |
