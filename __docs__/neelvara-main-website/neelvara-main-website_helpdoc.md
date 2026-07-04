# Neelvara Main Website - Help And Support Notes

**Status:** Implemented; pending owner/legal launch review
**Audience:** Founder, support/legal reviewer, future help center author  
**Scope:** Company website support questions only

---

## 1. Help Surface Decision

Do not create a help center for Neelvara v1.

The company website only needs a short FAQ-style support policy that can live on the Contact or Legal page. Product support belongs to the relevant product site.

The Neelvara blue visual redesign does not change support routing, data collection, legal scope, or product-support boundaries.

---

## 2. Support Routing

| Inquiry type | Route |
| --- | --- |
| Product usage | Relevant product support/contact surface |
| Business inquiry | `NEXT_PUBLIC_NEELVARA_CONTACT_EMAIL` displayed on the Contact page |
| Legal inquiry | `NEXT_PUBLIC_NEELVARA_LEGAL_EMAIL` displayed on the Contact page |
| Privacy/data inquiry | `NEXT_PUBLIC_NEELVARA_PRIVACY_EMAIL` displayed on the Contact page |
| Billing/refund/cancellation | Relevant product policy surface once paid services exist |
| Vendor verification | Legal page + configured legal email |

Email addresses are env-backed public display values with current code fallbacks. Updating the deployment env changes the displayed mailto links and structured data without changing code.

---

## 3. Public FAQ Draft

### What is Neelvara Systems?

Neelvara Systems operates software infrastructure for customer-facing business information.

### What products are in the Neelvara lineup?

MenuList, Answerlattice, and CampaignCue are operated by Neelvara Systems.

### Is MenuList part of the Neelvara lineup?

Yes. MenuList is one of the products operated by Neelvara Systems.

### Does Neelvara sell software directly from this website?

No. This website provides company, product-routing, contact, privacy, and terms information. Product-specific services are handled through the relevant product website.

### How do I contact Neelvara Systems?

Use the contact addresses listed on the Contact page.

### Can I ask a company question?

Yes. Email the configured Neelvara business contact with a short note. Keep the first message high level and do not include private records, secrets, or customer datasets. Product support and account questions should go through the relevant product website.

### Where do I find product information?

Visit the relevant product website for product-specific information, pricing, onboarding, support, and terms.

---

## 4. Support Copy Rules

Use:

- direct answers
- calm wording
- no speculation
- no legal structure claims beyond approved wording
- product routing when the question belongs to a product site

Avoid:

- "parent company" unless legal review approves it
- claims about incorporation status
- GSTIN/PAN/address disclosure in support templates
- broad product roadmap statements
- claims that future products are live

---

## 5. Data And Privacy Questions

If a user asks about data collected by the Neelvara website:

> The Neelvara Systems website is a static public website. It may process basic hosting/CDN/security logs and visitor-initiated email inquiries. Product services such as MenuList, Answerlattice, and CampaignCue may have separate product-specific privacy policies.

If a user asks about product account, business, menu, support, campaign, billing, or customer interaction data:

> That question belongs to the relevant product policy and support path.

Do not answer product-data questions from the Neelvara company website policy unless the policy has been updated and reviewed.

---

## 6. Legal Questions

If a user asks for legal identity:

> Neelvara Systems operates software infrastructure for customer-facing business information. MenuList, Answerlattice, and CampaignCue are operated by Neelvara Systems.

If a user asks for GSTIN/PAN/address:

> Public display of tax or address details is handled only where legally required or approved through the appropriate business verification process.

Do not send PAN, residential address, or other sensitive proprietor details over general support unless the owner/legal process approves the specific disclosure.

---

## 7. Product-Specific Legal Split

Neelvara website legal pages cover:

- use of the Neelvara website
- basic contact
- static website privacy
- entity/trade-name information
- company product relationship references

Product legal pages should cover, when applicable:

- account data
- business profile data
- menu data
- customer interaction data
- billing
- refunds/cancellations
- product support
- service availability
- product-specific user obligations

Do not merge these policies just because the company site links to product sites.
