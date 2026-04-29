RETRIEVAL DISCIPLINE

You must retrieve and validate context before reasoning or execution.

---

OBJECTIVE

Retrieve the minimum set of highly relevant information required to complete the task with high confidence.

---

STEP 1 — SEARCH

* Identify relevant files using semantic or keyword search
* Use file names, patterns, and domain knowledge
* Do not assume file locations
* Limit initial search scope to the most likely areas

---

STEP 2 — READ

* Read only the most relevant files first
* Expand to additional files only if needed
* Prefer primary sources (actual implementation over references)

---

STEP 3 — VALIDATE

* Confirm retrieved content directly relates to the task
* Discard irrelevant or weakly related files
* Cross-check with /docs when applicable

---

STEP 4 — CONTEXT STRUCTURING

Before reasoning, organize retrieved data into:

* Relevant files
* Key functions / logic
* Data flow or dependencies

Do not pass raw, unstructured context into reasoning.

---

STEP 5 — REASON

* Base reasoning strictly on retrieved context
* Do not infer missing logic without evidence
* If context is incomplete → return to search

---

RETRIEVAL BUDGET

* Max files to read: 5–7
* Max deep reads: 3–4 critical files
* Avoid scanning entire directories unless necessary

---

STOP CONDITION

Stop retrieval when:

* Root cause or implementation path is clear
* Additional files do not add new information
* Confidence ≥ 80%

---

CONFLICT RESOLUTION

If sources conflict:

1. Prefer actual code over comments/docs
2. Prefer latest implementation over legacy patterns
3. Flag uncertainty explicitly if unresolved

---

MODE-SPECIFIC BEHAVIOR

Architect Mode:

* Focus on structure, dependencies, and system boundaries
* Prefer docs and high-level files

Code Mode:

* Focus on exact implementation files
* Retrieve only files directly being modified

Debug Mode:

* Focus on execution path and failure points
* Trace logs, state flow, and related modules

---

PRIORITY RULES

1. /docs > source code > model knowledge (for intent)
2. Source code > docs (for actual behavior)
3. Actual file content > assumptions
4. Recent changes > older patterns

---

FAIL-SAFE

If no sufficient context found:

* State: "Insufficient context"
* Expand search scope OR ask for clarification

---

PROHIBITIONS

* Do not answer without reading relevant files
* Do not invent file paths or logic
* Do not rely purely on training knowledge

---

QUALITY RULE

Prefer:

* fewer, highly relevant files
* deeper understanding of selected context

Avoid:

* broad shallow retrieval
* excessive context injection
