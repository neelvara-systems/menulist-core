# Commercial Identity Specification

## Purpose

Prevent brand, operator, supplier, and processor identities from being merged
or guessed as MenuList prepares for paid use.

## Identity Matrix

| Role | Current value | Authority |
| --- | --- | --- |
| Product brand | MenuList | Product constants and public site |
| Operating trade name | Neelvara Systems | Verified repository operating decision |
| Legal supplier | Pending owner/accountant verification | PAN, GST, bank, and Razorpay records |
| Payment processor | Razorpay | Checkout integration and provider record |

## Required Behavior

1. Public copy may say that MenuList is operated by Neelvara Systems.
2. Public copy must not call Neelvara Systems a private limited company, LLP,
   OPC, corporation, holding company, or registered parent without verified
   records and counsel approval.
3. A tax snapshot must not be created unless
   `MENULIST_BILLING_LEGAL_IDENTITY_VERIFIED=true` and all supplier tax fields
   pass validation.
4. Issued billing documents freeze the legal supplier values used for that
   commercial event.
5. Razorpay processing does not make Razorpay the supplier and does not replace
   the MenuList billing document.
6. No historical migration or backfill is required because paid issuance is
   not live.

## Non-Goals

- Registering or characterising a legal entity.
- Choosing a GST registration, SAC, LUT, signatory, or e-invoice treatment.
- Publishing a guessed address, GSTIN, proprietor name, or company suffix.
- Changing pricing, entitlement, settlement, or refund policy logic.
