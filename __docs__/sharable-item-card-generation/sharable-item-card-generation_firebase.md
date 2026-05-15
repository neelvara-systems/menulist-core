# Sharable Item Card Generation Firebase

Firebase cost impact: zero.

Generation uses data already present in the owner editor. It does not introduce:
- Firestore reads
- Firestore writes
- Cloud Function calls
- Next.js API route reads
- Storage writes
- analytics counter writes

If future tracking is required, use GA4-only client events unless an owner-facing dashboard requires a persisted counter.
