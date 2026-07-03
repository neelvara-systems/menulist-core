# MenuList Tool Intake Template

> **Use for:** Any new MenuList public tool, owner check, internal tool, or paid add-on module
> **Folder rule:** `__docs__/menulist-tools/[tool-or-tool-family]/`
> **Last Updated:** June 30, 2026

---

## 1. Tool Identity

| Field | Decision |
| --- | --- |
| Tool name |  |
| Stable ID |  |
| Tool family |  |
| Public route, if any |  |
| Owner surface, if any |  |
| Paid add-on surface, if any |  |

---

## 2. V0/V1/V2 Lane

Choose one primary lane before implementation.

| Lane | Select | Rule |
| --- | --- | --- |
| V0 public free tool / lead magnet |  | Free, lightweight, no fake scan claims, no default storage unless a consented existing contact/setup flow is reused |
| V1 logged-in MenuList owner check |  | Uses actual MenuList store/project truth and appears in existing owner surfaces |
| V2 paid add-on behavior |  | Paid only when recurrence, history, multi-location reporting, or agency reporting creates real value |

If the tool spans lanes, implement the smallest lane first and document the next lane separately.

---

## 3. Owner Job

Write the plain owner job in one sentence.

```txt

```

Reject the tool if the owner job creates a new dashboard habit without reducing confusion, setup friction, or public truth gaps.

---

## 4. Source Policy

| Source | Allowed? | Storage rule | Notes |
| --- | --- | --- | --- |
| Owner-entered fields |  |  |  |
| Pasted text |  |  |  |
| Uploaded file |  |  |  |
| Existing MenuList store/project truth |  |  |  |
| External public URL |  |  |  |
| Google/Instagram/WhatsApp profile |  |  |  |
| AI/search provider answer |  |  |  |

Default rule: external URLs and profiles are references only unless an approved adapter, source policy, rate limit, and budget cap exist.

---

## 5. Report Contract

| Field | Required? | Notes |
| --- | --- | --- |
| Overall status | Yes | Use a small enum |
| Check rows | Yes | Present, missing, unclear, not checked, or not applicable |
| Evidence text | Yes | Say what was actually checked |
| Next action | Yes | Route back to a MenuList fix path |
| Export/copy | V0 preferred | Keep browser-local when possible |
| Saved history | V2 only | Requires entitlement and capped retention |

Do not claim rankings, AI citations, platform updates, or external inspection unless the code actually performs that action.

---

## 6. Cost And Storage

| Operation | Expected count | Approved? |
| --- | --- | --- |
| Firestore reads |  |  |
| Firestore writes |  |  |
| Firestore deletes |  |  |
| Storage operations |  |  |
| Cloud Functions |  |  |
| External fetches |  |  |
| AI/provider calls |  |  |

Rules:

- V0 should be browser-local/static when possible.
- Lead capture must use explicit consent and an approved capped contact/setup flow.
- V1 should reuse loaded owner context, existing DAL, and existing summaries where possible.
- V2 history must be capped and tied to a paid entitlement.

---

## 7. Required Docs

Create a full doc set before code:

```txt
__docs__/menulist-tools/[tool-name]/
├── README.md
├── [tool-name]_spec.md
├── [tool-name]_impl.md
├── [tool-name]_marketing.md
├── [tool-name]_website.md
├── [tool-name]_helpdoc.md
├── [tool-name]_firebase.md
├── [tool-name]_mobile-support.md
└── [tool-name]_test-cases.md
```

---

## 8. Verification Requirements

Every shipped tool needs a focused verifier.

Minimum checks:

- feature flags exist and point to the docs
- route/component exists when implemented
- localized visible copy exists
- no forbidden public claims
- no arbitrary external fetch unless an approved adapter exists
- no direct Firestore write from anonymous browser code
- consented handoff uses an existing bounded route or a documented new route
- public sitemap/LLM context updates are present when the route is public

---

## 9. Admission Decision

| Gate | Pass? | Notes |
| --- | --- | --- |
| Fits MenuList public truth/setup layer |  |  |
| Has a clear V0/V1/V2 lane |  |  |
| Avoids generic SEO/reputation/engagement positioning |  |  |
| Reuses existing data/contracts where possible |  |  |
| Cost is documented and capped |  |  |
| Mobile impact is documented |  |  |
| Verifier is defined |  |  |

Final decision:

```txt
Approved / Rejected / Needs redesign
```
