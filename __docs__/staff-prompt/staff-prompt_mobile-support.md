# Staff Prompt — Mobile Support

**Last Updated:** February 16, 2026
**Decision:** ❌ CUSTOMER/STAFF-FACING — Not an owner-operational feature in MobileShell

---

## Feature Admission Test

Not applicable — Staff Prompt is a customer/staff-facing AI chat surface, not an owner dashboard feature.

---

## How It Works

Staff Prompt is an AI-powered training tool that staff access via a separate URL/interface. It reads menu data from the same Firestore project documents. There is no owner dashboard UI for managing staff prompts — the feature is automatic based on menu data.

## Mobile Relevance

When owners edit menu items on mobile (availability, price, descriptions), the Staff Prompt's knowledge base updates automatically via shared Firestore data. No separate mobile UI needed.
